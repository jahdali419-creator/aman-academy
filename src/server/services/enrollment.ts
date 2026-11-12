import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  attendance,
  certificates,
  courses,
  courseSessions,
  enrollments,
  examAttempts,
  exams,
  instructors,
  user,
} from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { seatsTakenBySession } from "./catalog";
import { lockSession } from "./orders";

export type ProgressStatus =
  | "session_upcoming"
  | "attendance_pending"
  | "exam_available"
  | "exam_in_progress"
  | "passed"
  | "action_required"
  | "cancelled";

export type ProgressReason =
  | "attendance_insufficient"
  | "no_attempts_left"
  | "session_cancelled"
  | "certificate_revoked"
  | null;

export type ProgressInput = {
  enrollmentStatus: "active" | "cancelled";
  sessionStatus: "scheduled" | "completed" | "cancelled";
  sessionEndsAt: Date;
  minAttendancePercent: number;
  attendance: { status: "present" | "partial" | "absent"; percent: number } | null;
  maxAttempts: number | null;
  attempts: { status: "in_progress" | "submitted" | "expired"; passed: boolean | null }[];
  certificate: { status: "valid" | "revoked" } | null;
  now?: Date;
};

export const meetsAttendance = (a: ProgressInput["attendance"], minPercent: number) =>
  !!a && a.status !== "absent" && a.percent >= minPercent;

/** Pure function: derive the learner-facing status and the reason, from facts. */
export function deriveProgress(i: ProgressInput): { status: ProgressStatus; reason: ProgressReason } {
  const now = i.now ?? new Date();
  if (i.enrollmentStatus === "cancelled") return { status: "cancelled", reason: null };
  if (i.sessionStatus === "cancelled") return { status: "action_required", reason: "session_cancelled" };
  if (i.certificate?.status === "valid") return { status: "passed", reason: null };
  if (i.certificate?.status === "revoked") return { status: "action_required", reason: "certificate_revoked" };
  if (!i.attendance) {
    return { status: i.sessionEndsAt > now ? "session_upcoming" : "attendance_pending", reason: null };
  }
  if (!meetsAttendance(i.attendance, i.minAttendancePercent)) {
    return { status: "action_required", reason: "attendance_insufficient" };
  }
  if (i.attempts.some((a) => a.passed)) return { status: "passed", reason: null };
  if (i.attempts.some((a) => a.status === "in_progress")) return { status: "exam_in_progress", reason: null };
  if (i.maxAttempts !== null && i.attempts.length >= i.maxAttempts) {
    return { status: "action_required", reason: "no_attempts_left" };
  }
  return { status: "exam_available", reason: null };
}

/** Full progress rows for a set of enrollments (shared by learner, company and admin views). */
export async function loadProgress(db: Db, where: { userId?: string; orgId?: string; sessionId?: string; all?: true }) {
  const cond = where.userId
    ? eq(enrollments.userId, where.userId)
    : where.orgId
      ? eq(enrollments.orgId, where.orgId)
      : where.sessionId
        ? eq(enrollments.sessionId, where.sessionId)
        : undefined;
  if (!cond && !where.all) throw new Error("loadProgress requires a scope");

  const rows = await db
    .select({
      enrollment: enrollments,
      course: {
        id: courses.id,
        slug: courses.slug,
        code: courses.code,
        icon: courses.icon,
        titleEn: courses.titleEn,
        titleAr: courses.titleAr,
        minAttendancePercent: courses.minAttendancePercent,
      },
      session: {
        id: courseSessions.id,
        language: courseSessions.language,
        startsAt: courseSessions.startsAt,
        endsAt: courseSessions.endsAt,
        provider: courseSessions.provider,
        status: courseSessions.status,
        instructorId: courseSessions.instructorId,
      },
      learner: { id: user.id, name: user.name, nameAr: user.nameAr, email: user.email },
      attendance: { status: attendance.status, percent: attendance.percent, markedAt: attendance.markedAt },
      exam: { id: exams.id, maxAttempts: exams.maxAttempts, passingScorePercent: exams.passingScorePercent },
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseSessions, eq(courseSessions.id, enrollments.sessionId))
    .innerJoin(user, eq(user.id, enrollments.userId))
    .leftJoin(attendance, eq(attendance.enrollmentId, enrollments.id))
    .leftJoin(exams, eq(exams.courseId, enrollments.courseId))
    .where(cond)
    .orderBy(desc(courseSessions.startsAt));

  const ids = rows.map((r) => r.enrollment.id);
  const attempts = ids.length
    ? await db
        .select({
          id: examAttempts.id,
          enrollmentId: examAttempts.enrollmentId,
          attemptNumber: examAttempts.attemptNumber,
          status: examAttempts.status,
          passed: examAttempts.passed,
          scorePercent: examAttempts.scorePercent,
          submittedAt: examAttempts.submittedAt,
          expiresAt: examAttempts.expiresAt,
        })
        .from(examAttempts)
        .where(inArray(examAttempts.enrollmentId, ids))
        .orderBy(examAttempts.attemptNumber)
    : [];
  const certs = ids.length
    ? await db
        .select({
          enrollmentId: certificates.enrollmentId,
          number: certificates.number,
          status: certificates.status,
          issuedAt: certificates.issuedAt,
          expiresAt: certificates.expiresAt,
        })
        .from(certificates)
        .where(inArray(certificates.enrollmentId, ids))
        .orderBy(certificates.issuedAt)
    : [];

  return rows.map((r) => {
    const a = attempts.filter((x) => x.enrollmentId === r.enrollment.id);
    const cs = certs.filter((c) => c.enrollmentId === r.enrollment.id);
    const certificate = cs.find((c) => c.status === "valid") ?? cs.at(-1) ?? null;
    const att = r.attendance?.status ? { status: r.attendance.status, percent: r.attendance.percent! } : null;
    const progress = deriveProgress({
      enrollmentStatus: r.enrollment.status,
      sessionStatus: r.session.status,
      sessionEndsAt: r.session.endsAt,
      minAttendancePercent: r.course.minAttendancePercent,
      attendance: att,
      maxAttempts: r.exam?.maxAttempts ?? null,
      attempts: a,
      certificate,
    });
    return {
      enrollment: r.enrollment,
      course: r.course,
      session: r.session,
      learner: r.learner,
      attendance: att,
      exam: r.exam?.id ? r.exam : null,
      attempts: a,
      certificate,
      progress,
    };
  });
}

export type ProgressRow = Awaited<ReturnType<typeof loadProgress>>[number];

/**
 * Joining details are PROTECTED. They are released only to: an actively
 * enrolled learner, the instructor assigned to the session, or an administrator.
 */
export async function getJoinDetails(db: Db, viewer: Viewer, sessionId: string) {
  const [s] = await db.select().from(courseSessions).where(eq(courseSessions.id, sessionId)).limit(1);
  if (!s) throw notFound();
  let allowed = viewer.role === "admin" || (!!viewer.instructorId && s.instructorId === viewer.instructorId);
  if (!allowed) {
    const [e] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.sessionId, sessionId), eq(enrollments.userId, viewer.id), eq(enrollments.status, "active")))
      .limit(1);
    allowed = !!e;
  }
  if (!allowed) throw forbidden();
  const [instructor] = s.instructorId
    ? await db.select().from(instructors).where(eq(instructors.id, s.instructorId)).limit(1)
    : [];
  return {
    sessionId: s.id,
    provider: s.provider,
    joinUrl: s.joinUrl,
    joinInstructionsEn: s.joinInstructionsEn,
    joinInstructionsAr: s.joinInstructionsAr,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    status: s.status,
    instructor: instructor ? { nameEn: instructor.nameEn, nameAr: instructor.nameAr } : null,
  };
}

/** Enrol a user directly (administrator action, or company seat assignment via `company.ts`). */
export async function enrollDirect(
  tx: Db,
  args: { userId: string; sessionId: string; orgId?: string | null; seatPurchaseId?: string | null },
) {
  const s = await lockSession(tx, args.sessionId);
  if (!s || s.status !== "scheduled") throw new AppError("session_unavailable");
  if (s.startsAt <= new Date()) throw new AppError("session_started");
  const [dup] = await tx
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, args.userId), eq(enrollments.sessionId, args.sessionId), eq(enrollments.status, "active")))
    .limit(1);
  if (dup) throw new AppError("already_enrolled");
  const taken = (await seatsTakenBySession(tx, [args.sessionId])).get(args.sessionId) ?? 0;
  if (taken >= s.maxSeats) throw new AppError("session_full");
  const [e] = await tx
    .insert(enrollments)
    .values({
      userId: args.userId,
      sessionId: args.sessionId,
      courseId: s.courseId,
      orgId: args.orgId ?? null,
      seatPurchaseId: args.seatPurchaseId ?? null,
    })
    .returning();
  return e;
}

export async function cancelEnrollment(db: Db, viewer: Viewer, enrollmentId: string) {
  if (viewer.role !== "admin") throw forbidden();
  const [e] = await db
    .update(enrollments)
    .set({ status: "cancelled" })
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.status, "active")))
    .returning();
  if (!e) throw notFound();
  await logAudit(db, viewer.id, "enrollment.cancelled", "enrollment", e.id, {});
  return e;
}
