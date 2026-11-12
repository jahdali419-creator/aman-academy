import { asc, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { courses, courseSessions } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { seatsTakenBySession } from "./catalog";
import { loadProgress } from "./enrollment";

const canManage = (viewer: Viewer, instructorId: string | null) =>
  viewer.role === "admin" || (!!viewer.instructorId && viewer.instructorId === instructorId);

/** Sessions assigned to the signed-in instructor only. */
export async function listAssignedSessions(db: Db, viewer: Viewer) {
  if (!viewer.instructorId) throw forbidden();
  const rows = await db
    .select({
      id: courseSessions.id,
      language: courseSessions.language,
      startsAt: courseSessions.startsAt,
      endsAt: courseSessions.endsAt,
      maxSeats: courseSessions.maxSeats,
      provider: courseSessions.provider,
      status: courseSessions.status,
      hasJoinUrl: courseSessions.joinUrl,
      titleEn: courses.titleEn,
      titleAr: courses.titleAr,
      code: courses.code,
    })
    .from(courseSessions)
    .innerJoin(courses, eq(courses.id, courseSessions.courseId))
    .where(eq(courseSessions.instructorId, viewer.instructorId))
    .orderBy(asc(courseSessions.startsAt));
  const taken = await seatsTakenBySession(db, rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, hasJoinUrl: !!r.hasJoinUrl, enrolled: taken.get(r.id) ?? 0 }));
}

/**
 * Session with joining details and roster. The roster carries only what is
 * needed to deliver the class: names, attendance and exam outcome — no
 * contact details and no exam answers.
 */
export async function getSessionForDelivery(db: Db, viewer: Viewer, sessionId: string) {
  const [row] = await db
    .select({ session: courseSessions, course: courses })
    .from(courseSessions)
    .innerJoin(courses, eq(courses.id, courseSessions.courseId))
    .where(eq(courseSessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  if (!canManage(viewer, row.session.instructorId)) return null;
  const progress = await loadProgress(db, { sessionId });
  const roster = progress
    .filter((p) => p.enrollment.status === "active")
    .map((p) => ({
      enrollmentId: p.enrollment.id,
      name: p.learner.name,
      nameAr: p.learner.nameAr,
      attendance: p.attendance,
      status: p.progress.status,
      reason: p.progress.reason,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { session: row.session, course: row.course, roster };
}

export type JoinDetailsInput = { joinUrl: string; joinInstructionsEn: string; joinInstructionsAr: string };

export function assertSafeMeetingUrl(url: string) {
  if (!url) return;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new AppError("invalid_url");
  }
  if (u.protocol !== "https:") throw new AppError("invalid_url");
}

export async function updateJoinDetails(db: Db, viewer: Viewer, sessionId: string, input: JoinDetailsInput) {
  const [s] = await db.select().from(courseSessions).where(eq(courseSessions.id, sessionId)).limit(1);
  if (!s) throw notFound();
  if (!canManage(viewer, s.instructorId)) throw forbidden();
  assertSafeMeetingUrl(input.joinUrl.trim());
  await db
    .update(courseSessions)
    .set({
      joinUrl: input.joinUrl.trim() || null,
      joinInstructionsEn: input.joinInstructionsEn.trim(),
      joinInstructionsAr: input.joinInstructionsAr.trim(),
    })
    .where(eq(courseSessions.id, sessionId));
  // The link itself is intentionally not written to the audit log.
  await logAudit(db, viewer.id, "session.join_details_updated", "session", sessionId, { hasUrl: !!input.joinUrl.trim() });
}
