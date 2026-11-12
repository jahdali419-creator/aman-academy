import { asc, count, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  auditLog,
  certificates,
  courses,
  courseSessions,
  emailOutbox,
  enrollments,
  exams,
  inquiries,
  instructors,
  memberships,
  orders,
  organizations,
  questions,
  seatPurchases,
  user,
} from "../db/schema";
import type { BilingualList, QuestionOption, SyllabusModule } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { seatsTakenBySession } from "./catalog";
import { enrollDirect, loadProgress } from "./enrollment";
import { assertSafeMeetingUrl } from "./instructor";

function admin(viewer: Viewer) {
  if (viewer.role !== "admin") throw forbidden();
}

export async function getOverview(db: Db, viewer: Viewer) {
  admin(viewer);
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  return {
    courses: await one(db.select({ n: count() }).from(courses)),
    upcomingSessions: await one(
      db.select({ n: count() }).from(courseSessions).where(sql`${courseSessions.startsAt} > now() and ${courseSessions.status} = 'scheduled'`),
    ),
    activeEnrollments: await one(db.select({ n: count() }).from(enrollments).where(eq(enrollments.status, "active"))),
    organizations: await one(db.select({ n: count() }).from(organizations)),
    validCertificates: await one(db.select({ n: count() }).from(certificates).where(eq(certificates.status, "valid"))),
    openInquiries: await one(db.select({ n: count() }).from(inquiries).where(eq(inquiries.handled, false))),
    refundsRequired: await one(db.select({ n: count() }).from(orders).where(eq(orders.status, "refunded"))),
  };
}

/* ---------------- Courses ---------------- */

export type CourseInput = {
  slug: string;
  code: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  overviewEn: string;
  overviewAr: string;
  outcomes: BilingualList;
  audience: BilingualList;
  prerequisites: BilingualList;
  syllabus?: SyllabusModule[];
  practicalNoteEn: string;
  practicalNoteAr: string;
  durationMinutes: number;
  priceHalalas: number;
  minAttendancePercent: number;
  certificateValidityMonths: number | null;
  published: boolean;
};

export async function listCoursesAdmin(db: Db, viewer: Viewer) {
  admin(viewer);
  return db.select().from(courses).orderBy(asc(courses.code));
}

export async function getCourseAdmin(db: Db, viewer: Viewer, id: string) {
  admin(viewer);
  const [c] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return c ?? null;
}

export async function saveCourse(db: Db, viewer: Viewer, id: string | null, input: CourseInput) {
  admin(viewer);
  try {
    if (id) {
      const [c] = await db.update(courses).set(input).where(eq(courses.id, id)).returning();
      if (!c) throw notFound();
      await logAudit(db, viewer.id, "course.updated", "course", c.id, { code: c.code });
      return c;
    }
    return await db.transaction(async (tx) => {
      const [c] = await tx.insert(courses).values({ ...input, syllabus: input.syllabus ?? [] }).returning();
      await tx.insert(exams).values({ courseId: c.id });
      await logAudit(tx, viewer.id, "course.created", "course", c.id, { code: c.code });
      return c;
    });
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (String((e as { cause?: unknown }).cause ?? e).includes("unique")) throw new AppError("duplicate_code_or_slug");
    throw e;
  }
}

/* ---------------- Sessions ---------------- */

export type SessionInput = {
  courseId: string;
  instructorId: string | null;
  language: "ar" | "en";
  startsAt: Date;
  endsAt: Date;
  maxSeats: number;
  provider: "teams" | "zoom";
  joinUrl: string;
  joinInstructionsEn: string;
  joinInstructionsAr: string;
  status: "scheduled" | "completed" | "cancelled";
};

export async function listSessionsAdmin(db: Db, viewer: Viewer) {
  admin(viewer);
  const rows = await db
    .select({ session: courseSessions, courseTitleEn: courses.titleEn, courseTitleAr: courses.titleAr, courseCode: courses.code, instructorEn: instructors.nameEn, instructorAr: instructors.nameAr })
    .from(courseSessions)
    .innerJoin(courses, eq(courses.id, courseSessions.courseId))
    .leftJoin(instructors, eq(instructors.id, courseSessions.instructorId))
    .orderBy(desc(courseSessions.startsAt));
  const taken = await seatsTakenBySession(db, rows.map((r) => r.session.id));
  return rows.map((r) => ({ ...r, enrolled: taken.get(r.session.id) ?? 0 }));
}

export async function getSessionAdmin(db: Db, viewer: Viewer, id: string) {
  admin(viewer);
  const [s] = await db.select().from(courseSessions).where(eq(courseSessions.id, id)).limit(1);
  return s ?? null;
}

export async function saveSession(db: Db, viewer: Viewer, id: string | null, input: SessionInput) {
  admin(viewer);
  if (!(input.endsAt > input.startsAt)) throw new AppError("invalid_time_range");
  if (!Number.isInteger(input.maxSeats) || input.maxSeats < 1) throw new AppError("invalid_seats");
  assertSafeMeetingUrl(input.joinUrl.trim());
  const values = { ...input, joinUrl: input.joinUrl.trim() || null };
  if (id) {
    const taken = (await seatsTakenBySession(db, [id])).get(id) ?? 0;
    if (input.maxSeats < taken) throw new AppError("seats_below_enrolled");
    const [s] = await db.update(courseSessions).set(values).where(eq(courseSessions.id, id)).returning();
    if (!s) throw notFound();
    await logAudit(db, viewer.id, "session.updated", "session", s.id, { status: s.status, instructorId: s.instructorId, maxSeats: s.maxSeats });
    return s;
  }
  const [s] = await db.insert(courseSessions).values(values).returning();
  await logAudit(db, viewer.id, "session.created", "session", s.id, { courseId: s.courseId });
  return s;
}

/* ---------------- Learners and enrollments ---------------- */

export async function listLearners(db: Db, viewer: Viewer) {
  admin(viewer);
  return db
    .select({
      id: user.id,
      name: user.name,
      nameAr: user.nameAr,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      orgName: organizations.name,
      enrollments: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.userId} = ${user.id} and ${enrollments.status} = 'active')`,
    })
    .from(user)
    .leftJoin(memberships, eq(memberships.userId, user.id))
    .leftJoin(organizations, eq(organizations.id, memberships.orgId))
    .orderBy(desc(user.createdAt))
    .limit(500);
}

export async function listEnrollmentsAdmin(db: Db, viewer: Viewer) {
  admin(viewer);
  return loadProgress(db, { all: true });
}

export async function adminEnroll(db: Db, viewer: Viewer, email: string, sessionId: string) {
  admin(viewer);
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.trim().toLowerCase())).limit(1);
  if (!u) throw new AppError("user_not_found");
  return db.transaction(async (tx) => {
    const e = await enrollDirect(tx, { userId: u.id, sessionId });
    await logAudit(tx, viewer.id, "enrollment.created_by_admin", "enrollment", e.id, {});
    return e;
  });
}

/* ---------------- Exams ---------------- */

export type ExamConfigInput = {
  durationMinutes: number;
  passingScorePercent: number;
  maxAttempts: number;
  questionsPerAttempt: number;
  retakeCooldownHours: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
};

export async function getExamAdmin(db: Db, viewer: Viewer, courseId: string) {
  admin(viewer);
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) return null;
  let [exam] = await db.select().from(exams).where(eq(exams.courseId, courseId)).limit(1);
  if (!exam) [exam] = await db.insert(exams).values({ courseId }).returning();
  const bank = await db.select().from(questions).where(eq(questions.examId, exam.id)).orderBy(asc(questions.createdAt), asc(questions.id));
  return { course, exam, questions: bank };
}

export async function saveExamConfig(db: Db, viewer: Viewer, examId: string, input: ExamConfigInput) {
  admin(viewer);
  const [e] = await db.update(exams).set(input).where(eq(exams.id, examId)).returning();
  if (!e) throw notFound();
  await logAudit(db, viewer.id, "exam.config_updated", "exam", e.id, { ...input });
  return e;
}

export type QuestionInput = { textEn: string; textAr: string; options: QuestionOption[]; correctOptionId: string; isSample: boolean };

export async function saveQuestion(db: Db, viewer: Viewer, examId: string, id: string | null, input: QuestionInput) {
  admin(viewer);
  if (input.options.length < 2) throw new AppError("question_needs_options");
  if (!input.options.some((o) => o.id === input.correctOptionId)) throw new AppError("question_needs_correct");
  if (id) {
    const [q] = await db.update(questions).set(input).where(eq(questions.id, id)).returning();
    if (!q) throw notFound();
    await logAudit(db, viewer.id, "question.updated", "question", q.id, {});
    return q;
  }
  const [q] = await db.insert(questions).values({ examId, ...input }).returning();
  await logAudit(db, viewer.id, "question.created", "question", q.id, {});
  return q;
}

export async function setQuestionActive(db: Db, viewer: Viewer, id: string, active: boolean) {
  admin(viewer);
  const [q] = await db.update(questions).set({ active }).where(eq(questions.id, id)).returning();
  if (!q) throw notFound();
  await logAudit(db, viewer.id, active ? "question.activated" : "question.deactivated", "question", q.id, {});
}

/* ---------------- Certificates, companies, operations ---------------- */

export async function listCertificatesAdmin(db: Db, viewer: Viewer) {
  admin(viewer);
  return db
    .select({ cert: certificates, courseTitleEn: courses.titleEn, courseTitleAr: courses.titleAr, courseCode: courses.code })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .orderBy(desc(certificates.issuedAt))
    .limit(500);
}

export async function listOrganizationsAdmin(db: Db, viewer: Viewer) {
  admin(viewer);
  return db
    .select({
      org: organizations,
      members: sql<number>`(select count(*)::int from ${memberships} where ${memberships.orgId} = ${organizations.id})`,
      seats: sql<number>`coalesce((select sum(${seatPurchases.seatsTotal})::int from ${seatPurchases} where ${seatPurchases.orgId} = ${organizations.id}), 0)`,
      assigned: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.orgId} = ${organizations.id} and ${enrollments.status} = 'active')`,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));
}

export async function listInquiries(db: Db, viewer: Viewer) {
  admin(viewer);
  return db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(200);
}

export async function setInquiryHandled(db: Db, viewer: Viewer, id: string, handled: boolean) {
  admin(viewer);
  await db.update(inquiries).set({ handled }).where(eq(inquiries.id, id));
  await logAudit(db, viewer.id, handled ? "inquiry.handled" : "inquiry.reopened", "inquiry", id, {});
}

export async function listAudit(db: Db, viewer: Viewer, limit = 200) {
  admin(viewer);
  return db
    .select({ entry: auditLog, actorName: user.name })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function listOutbox(db: Db, viewer: Viewer) {
  admin(viewer);
  return db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(100);
}

export async function listInstructorsAdmin(db: Db, viewer: Viewer) {
  admin(viewer);
  return db.select().from(instructors).orderBy(asc(instructors.nameEn));
}
