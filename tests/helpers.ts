import { createTestDatabase, type Db } from "@/server/db/client";
import { courses, courseSessions, exams, instructors, memberships, organizations, questions, user } from "@/server/db/schema";
import type { Viewer } from "@/server/viewer";

export async function setup() {
  return createTestDatabase();
}

let n = 0;
export async function makeUser(db: Db, opts: { role?: Viewer["role"]; name?: string } = {}): Promise<Viewer> {
  n += 1;
  const id = crypto.randomUUID();
  const email = `user${n}@test.example`;
  const name = opts.name ?? `Test User ${n}`;
  await db.insert(user).values({ id, email, name, nameAr: `مستخدم ${n}`, role: opts.role ?? "learner" });
  return { id, name, nameAr: `مستخدم ${n}`, email, phone: null, role: opts.role ?? "learner", locale: "en", isDemo: false, org: null, instructorId: null };
}

export async function makeOrg(db: Db, name: string) {
  const manager = await makeUser(db, { name: `${name} Manager` });
  const [org] = await db.insert(organizations).values({ name, contactName: manager.name, contactEmail: manager.email }).returning();
  await db.insert(memberships).values({ orgId: org.id, userId: manager.id, role: "manager" });
  manager.org = { id: org.id, name, role: "manager" };
  return { org, manager };
}

export async function addEmployee(db: Db, orgId: string, orgName: string) {
  const u = await makeUser(db);
  await db.insert(memberships).values({ orgId, userId: u.id, role: "employee" });
  u.org = { id: orgId, name: orgName, role: "employee" };
  return u;
}

export async function makeInstructor(db: Db) {
  const u = await makeUser(db, { role: "instructor" });
  const [i] = await db.insert(instructors).values({ userId: u.id, nameEn: u.name, nameAr: "مدرب" }).returning();
  u.instructorId = i.id;
  return u;
}

const HOUR = 3_600_000;

export async function makeCourse(
  db: Db,
  opts: { maxSeats?: number; instructorId?: string | null; startsInHours?: number; maxAttempts?: number; validityMonths?: number | null; questions?: number; perAttempt?: number } = {},
) {
  n += 1;
  const [course] = await db
    .insert(courses)
    .values({ slug: `course-${n}`, code: `C-${n}`, titleEn: `Course ${n}`, titleAr: `دورة ${n}`, durationMinutes: 120, priceHalalas: 40_000, minAttendancePercent: 80, certificateValidityMonths: opts.validityMonths ?? null })
    .returning();
  const start = Date.now() + (opts.startsInHours ?? 24) * HOUR;
  const [session] = await db
    .insert(courseSessions)
    .values({
      courseId: course.id,
      instructorId: opts.instructorId ?? null,
      language: "ar",
      startsAt: new Date(start),
      endsAt: new Date(start + 2 * HOUR),
      maxSeats: opts.maxSeats ?? 10,
      provider: "teams",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/secret-link",
      joinInstructionsEn: "Join early",
    })
    .returning();
  const [exam] = await db
    .insert(exams)
    .values({ courseId: course.id, durationMinutes: 10, passingScorePercent: 70, maxAttempts: opts.maxAttempts ?? 2, questionsPerAttempt: opts.perAttempt ?? 4 })
    .returning();
  const bank = Array.from({ length: opts.questions ?? 6 }, (_, i) => {
    const options = ["a", "b", "c", "d"].map((k) => ({ id: `${i}${k}`, en: `Option ${k}`, ar: `خيار ${k}` }));
    return { examId: exam.id, textEn: `Question ${i}`, textAr: `سؤال ${i}`, options, correctOptionId: `${i}b` };
  });
  await db.insert(questions).values(bank);
  return { course, session, exam };
}

/** Move a session into the past so attendance can be recorded. */
export async function startSession(db: Db, sessionId: string) {
  const { eq } = await import("drizzle-orm");
  await db
    .update(courseSessions)
    .set({ startsAt: new Date(Date.now() - 3 * HOUR), endsAt: new Date(Date.now() - HOUR) })
    .where(eq(courseSessions.id, sessionId));
}
