import { randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  attendance,
  certificates,
  courses,
  courseSessions,
  enrollments,
  examAttempts,
  instructors,
  user,
} from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { meetsAttendance } from "./enrollment";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I

export function generateCertificateNumber(now = new Date()) {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(0, ALPHABET.length)];
  return `AMN-${now.getUTCFullYear()}-${s}`;
}

export const normalizeCertificateNumber = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");
export const isCertificateNumber = (n: string) => /^AMN-\d{4}-[2-9A-HJ-NP-Z]{8}$/.test(n);

function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

/**
 * Issue a certificate only when BOTH requirements are met:
 *  1. recorded attendance meets the course minimum, and
 *  2. the learner has a passed exam attempt.
 * Safe to call repeatedly; returns the existing valid certificate if present.
 */
export async function issueCertificateIfEligible(
  tx: Db,
  enrollmentId: string,
  opts: { actorId?: string | null; replacesId?: string | null } = {},
) {
  const [row] = await tx
    .select({ enrollment: enrollments, course: courses, session: courseSessions, learner: user })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseSessions, eq(courseSessions.id, enrollments.sessionId))
    .innerJoin(user, eq(user.id, enrollments.userId))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);
  if (!row || row.enrollment.status !== "active") return null;

  const [existing] = await tx
    .select()
    .from(certificates)
    .where(and(eq(certificates.enrollmentId, enrollmentId), eq(certificates.status, "valid")))
    .limit(1);
  if (existing) return existing;

  // A revoked certificate is only superseded by an explicit replacement.
  if (!opts.replacesId) {
    const [revoked] = await tx
      .select({ id: certificates.id })
      .from(certificates)
      .where(and(eq(certificates.enrollmentId, enrollmentId), eq(certificates.status, "revoked")))
      .limit(1);
    if (revoked) return null;
  }

  const [att] = await tx.select().from(attendance).where(eq(attendance.enrollmentId, enrollmentId)).limit(1);
  if (!meetsAttendance(att ?? null, row.course.minAttendancePercent)) return null;

  const [passed] = await tx
    .select()
    .from(examAttempts)
    .where(and(eq(examAttempts.enrollmentId, enrollmentId), eq(examAttempts.passed, true)))
    .orderBy(desc(examAttempts.submittedAt))
    .limit(1);
  if (!passed) return null;

  const completedAt = passed.submittedAt ?? new Date();
  const issuedAt = new Date();
  const [cert] = await tx
    .insert(certificates)
    .values({
      number: generateCertificateNumber(issuedAt),
      enrollmentId,
      userId: row.learner.id,
      courseId: row.course.id,
      instructorId: row.session.instructorId,
      learnerNameEn: row.learner.name,
      learnerNameAr: row.learner.nameAr,
      completedAt,
      issuedAt,
      expiresAt: row.course.certificateValidityMonths ? addMonths(completedAt, row.course.certificateValidityMonths) : null,
      replacesId: opts.replacesId ?? null,
    })
    .returning();
  await logAudit(tx, opts.actorId ?? null, opts.replacesId ? "certificate.replaced" : "certificate.issued", "certificate", cert.id, {
    number: cert.number,
    replacesId: opts.replacesId ?? undefined,
  });
  return cert;
}

export type PublicVerification =
  | { found: false }
  | {
      found: true;
      number: string;
      status: "valid" | "revoked" | "expired";
      learnerNameEn: string;
      learnerNameAr: string | null;
      courseTitleEn: string;
      courseTitleAr: string;
      issuedAt: Date;
      expiresAt: Date | null;
    };

export const effectiveStatus = (c: { status: "valid" | "revoked"; expiresAt: Date | null }, now = new Date()) =>
  c.status === "revoked" ? ("revoked" as const) : c.expiresAt && c.expiresAt <= now ? ("expired" as const) : ("valid" as const);

/** PUBLIC verification: returns only the minimum needed to confirm a certificate. */
export async function verifyCertificate(db: Db, rawNumber: string): Promise<PublicVerification> {
  const number = normalizeCertificateNumber(rawNumber);
  if (!isCertificateNumber(number)) return { found: false };
  const [c] = await db
    .select({
      number: certificates.number,
      status: certificates.status,
      learnerNameEn: certificates.learnerNameEn,
      learnerNameAr: certificates.learnerNameAr,
      issuedAt: certificates.issuedAt,
      expiresAt: certificates.expiresAt,
      courseTitleEn: courses.titleEn,
      courseTitleAr: courses.titleAr,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.number, number))
    .limit(1);
  if (!c) return { found: false };
  return { found: true, ...c, status: effectiveStatus(c) };
}

/**
 * Full certificate for display/PDF. Allowed for: the owner, an administrator,
 * or a manager of the organization that provided the seat.
 */
export async function getCertificateForViewer(db: Db, viewer: Viewer, rawNumber: string) {
  const number = normalizeCertificateNumber(rawNumber);
  const [row] = await db
    .select({ cert: certificates, course: courses, orgId: enrollments.orgId, instructor: instructors })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .innerJoin(enrollments, eq(enrollments.id, certificates.enrollmentId))
    .leftJoin(instructors, eq(instructors.id, certificates.instructorId))
    .where(eq(certificates.number, number))
    .limit(1);
  if (!row) return null;
  const allowed =
    row.cert.userId === viewer.id ||
    viewer.role === "admin" ||
    (viewer.org?.role === "manager" && !!row.orgId && row.orgId === viewer.org.id);
  if (!allowed) return null;
  return { ...row, status: effectiveStatus(row.cert) };
}

export async function revokeCertificate(db: Db, viewer: Viewer, certificateId: string, reason: string) {
  if (viewer.role !== "admin") throw forbidden();
  if (!reason.trim()) throw new AppError("reason_required");
  const [c] = await db
    .update(certificates)
    .set({ status: "revoked", revokedAt: new Date(), revokeReason: reason.trim() })
    .where(and(eq(certificates.id, certificateId), eq(certificates.status, "valid")))
    .returning();
  if (!c) throw notFound();
  await logAudit(db, viewer.id, "certificate.revoked", "certificate", c.id, { number: c.number, reason: reason.trim() });
  return c;
}

/** Revoke (if still valid) and issue a replacement with a new number, e.g. to correct a name. */
export async function replaceCertificate(db: Db, viewer: Viewer, certificateId: string, reason: string) {
  if (viewer.role !== "admin") throw forbidden();
  if (!reason.trim()) throw new AppError("reason_required");
  return db.transaction(async (tx) => {
    const [old] = await tx.select().from(certificates).where(eq(certificates.id, certificateId)).for("update").limit(1);
    if (!old) throw notFound();
    if (old.status === "valid") {
      await tx
        .update(certificates)
        .set({ status: "revoked", revokedAt: new Date(), revokeReason: reason.trim() })
        .where(eq(certificates.id, old.id));
      await logAudit(tx, viewer.id, "certificate.revoked", "certificate", old.id, { number: old.number, reason: reason.trim() });
    }
    const fresh = await issueCertificateIfEligible(tx, old.enrollmentId, { actorId: viewer.id, replacesId: old.id });
    if (!fresh) throw new AppError("certificate_not_eligible");
    return fresh;
  });
}

/** A learner's own certificates, newest first. */
export async function listCertificatesForUser(db: Db, userId: string) {
  const rows = await db
    .select({ cert: certificates, titleEn: courses.titleEn, titleAr: courses.titleAr, icon: courses.icon })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt));
  return rows.map((r) => ({ ...r, status: effectiveStatus(r.cert) }));
}
