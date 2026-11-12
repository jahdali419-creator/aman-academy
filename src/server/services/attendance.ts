import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { attendance, courseSessions, enrollments } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { issueCertificateIfEligible } from "./certificates";

export type AttendanceInput = { status: "present" | "partial" | "absent"; percent: number; note?: string | null };

/**
 * Manual attendance marking with an audit trail (before/after values).
 * Allowed for administrators and the instructor assigned to the session.
 */
export async function markAttendance(db: Db, viewer: Viewer, enrollmentId: string, input: AttendanceInput) {
  if (!Number.isInteger(input.percent) || input.percent < 0 || input.percent > 100) throw new AppError("invalid_percent");
  const percent = input.status === "absent" ? 0 : input.percent;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ enrollment: enrollments, session: courseSessions })
      .from(enrollments)
      .innerJoin(courseSessions, eq(courseSessions.id, enrollments.sessionId))
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);
    if (!row || row.enrollment.status !== "active") throw notFound();
    const assigned = !!viewer.instructorId && row.session.instructorId === viewer.instructorId;
    if (viewer.role !== "admin" && !assigned) throw forbidden();
    if (row.session.startsAt > new Date()) throw new AppError("session_not_started");

    const [before] = await tx.select().from(attendance).where(eq(attendance.enrollmentId, enrollmentId)).limit(1);
    const values = { status: input.status, percent, note: input.note?.trim() || null, markedBy: viewer.id, markedAt: new Date() };
    if (before) await tx.update(attendance).set(values).where(eq(attendance.id, before.id));
    else await tx.insert(attendance).values({ enrollmentId, ...values });

    await logAudit(tx, viewer.id, before ? "attendance.corrected" : "attendance.recorded", "enrollment", enrollmentId, {
      before: before ? { status: before.status, percent: before.percent } : null,
      after: { status: input.status, percent },
    });
    // A correction may complete the certificate requirements.
    await issueCertificateIfEligible(tx, enrollmentId, { actorId: viewer.id });
  });
}
