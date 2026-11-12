import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { courses, courseSessions, enrollments, instructors, orders } from "../db/schema";

/**
 * PUBLIC session shape. The protected join URL and joining instructions are
 * deliberately not selected here, so they can never leak into public pages.
 */
const publicSessionColumns = {
  id: courseSessions.id,
  courseId: courseSessions.courseId,
  instructorId: courseSessions.instructorId,
  language: courseSessions.language,
  startsAt: courseSessions.startsAt,
  endsAt: courseSessions.endsAt,
  maxSeats: courseSessions.maxSeats,
  provider: courseSessions.provider,
  status: courseSessions.status,
};

export type PublicSession = {
  id: string;
  courseId: string;
  instructorId: string | null;
  language: "ar" | "en";
  startsAt: Date;
  endsAt: Date;
  maxSeats: number;
  provider: "teams" | "zoom";
  status: "scheduled" | "completed" | "cancelled";
  seatsLeft: number;
};

/** Seats in use per session: active enrollments + unexpired holds of pending individual orders. */
export async function seatsTakenBySession(
  db: Db,
  sessionIds: string[],
  opts: { excludeOrderId?: string } = {},
): Promise<Map<string, number>> {
  const taken = new Map<string, number>();
  if (sessionIds.length === 0) return taken;
  const enrolled = await db
    .select({ sessionId: enrollments.sessionId, n: count() })
    .from(enrollments)
    .where(and(inArray(enrollments.sessionId, sessionIds), eq(enrollments.status, "active")))
    .groupBy(enrollments.sessionId);
  for (const r of enrolled) taken.set(r.sessionId, r.n);
  const holds = await db
    .select({ sessionId: orders.sessionId, id: orders.id })
    .from(orders)
    .where(
      and(
        inArray(orders.sessionId, sessionIds),
        eq(orders.status, "pending"),
        eq(orders.kind, "individual"),
        gt(orders.holdExpiresAt, new Date()),
      ),
    );
  for (const h of holds) {
    if (!h.sessionId || h.id === opts.excludeOrderId) continue;
    taken.set(h.sessionId, (taken.get(h.sessionId) ?? 0) + 1);
  }
  return taken;
}

async function withSeats(db: Db, rows: Omit<PublicSession, "seatsLeft">[]): Promise<PublicSession[]> {
  const taken = await seatsTakenBySession(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, seatsLeft: Math.max(0, r.maxSeats - (taken.get(r.id) ?? 0)) }));
}

export async function listPublishedCourses(db: Db) {
  return db.select().from(courses).where(eq(courses.published, true)).orderBy(asc(courses.createdAt), asc(courses.code));
}

export async function getCourseBySlug(db: Db, slug: string) {
  const [c] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.published, true)))
    .limit(1);
  return c ?? null;
}

/** Upcoming, bookable sessions (optionally for one course), soonest first. */
export async function listUpcomingSessions(db: Db, opts: { courseId?: string; limit?: number } = {}) {
  const rows = await db
    .select(publicSessionColumns)
    .from(courseSessions)
    .innerJoin(courses, eq(courses.id, courseSessions.courseId))
    .where(
      and(
        eq(courseSessions.status, "scheduled"),
        eq(courses.published, true),
        gt(courseSessions.startsAt, new Date()),
        opts.courseId ? eq(courseSessions.courseId, opts.courseId) : sql`true`,
      ),
    )
    .orderBy(asc(courseSessions.startsAt))
    .limit(opts.limit ?? 200);
  return withSeats(db, rows);
}

export async function getPublicSession(db: Db, sessionId: string): Promise<PublicSession | null> {
  const rows = await db.select(publicSessionColumns).from(courseSessions).where(eq(courseSessions.id, sessionId)).limit(1);
  const [s] = await withSeats(db, rows);
  return s ?? null;
}

export async function listInstructors(db: Db) {
  return db.select().from(instructors).orderBy(asc(instructors.createdAt));
}

export async function getInstructorsByIds(db: Db, ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(instructors).where(inArray(instructors.id, ids));
}

/** Public exam rules for a course (never includes questions). */
export async function getExamRules(db: Db, courseId: string) {
  const { exams } = await import("../db/schema");
  const [e] = await db
    .select({
      durationMinutes: exams.durationMinutes,
      passingScorePercent: exams.passingScorePercent,
      maxAttempts: exams.maxAttempts,
      questionsPerAttempt: exams.questionsPerAttempt,
      retakeCooldownHours: exams.retakeCooldownHours,
    })
    .from(exams)
    .where(eq(exams.courseId, courseId))
    .limit(1);
  return e ?? null;
}

/** Session ids (of one course) in which a user holds an active enrollment. */
export async function enrolledSessionIds(db: Db, userId: string, courseId: string) {
  const rows = await db
    .select({ sessionId: enrollments.sessionId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), eq(enrollments.status, "active")));
  return new Set(rows.map((r) => r.sessionId));
}

export async function getCourseById(db: Db, id: string) {
  const [c] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return c ?? null;
}
