import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { courses, courseSessions, enrollments, invitations, memberships, organizations, seatPurchases, user } from "../db/schema";
import { config } from "../config";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { sendEmail } from "./email";
import { enrollDirect, loadProgress } from "./enrollment";

/**
 * COMPANY DATA ISOLATION
 * Every function here derives the organization from the authenticated viewer
 * (`viewer.org.id`). An organization id is never accepted from the client.
 */
function managerOrg(viewer: Viewer) {
  if (viewer.org?.role !== "manager") throw forbidden();
  return viewer.org;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type OrganizationInput = {
  name: string;
  contactName: string;
  contactEmail: string;
  phone?: string | null;
  crNumber?: string | null;
  vatNumber?: string | null;
};

export async function createOrganizationForUser(db: Db, userId: string, input: OrganizationInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, userId)).limit(1);
    if (existing) throw new AppError("already_in_organization");
    const [org] = await tx
      .insert(organizations)
      .values({
        name: input.name,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        phone: input.phone || null,
        crNumber: input.crNumber || null,
        vatNumber: input.vatNumber || null,
      })
      .returning();
    await tx.insert(memberships).values({ orgId: org.id, userId, role: "manager" });
    await logAudit(tx, userId, "organization.created", "organization", org.id, {});
    return org;
  });
}

export async function getOrganization(db: Db, viewer: Viewer) {
  const org = managerOrg(viewer);
  const [row] = await db.select().from(organizations).where(eq(organizations.id, org.id)).limit(1);
  return row ?? null;
}

export async function updateOrganization(db: Db, viewer: Viewer, input: OrganizationInput) {
  const org = managerOrg(viewer);
  await db
    .update(organizations)
    .set({
      name: input.name,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      phone: input.phone || null,
      crNumber: input.crNumber || null,
      vatNumber: input.vatNumber || null,
    })
    .where(eq(organizations.id, org.id));
  await logAudit(db, viewer.id, "organization.updated", "organization", org.id, {});
}

export type SeatSummary = {
  courseId: string;
  titleEn: string;
  titleAr: string;
  code: string;
  purchased: number;
  assigned: number;
  remaining: number;
};

async function seatSummaryFor(db: Db, orgId: string): Promise<SeatSummary[]> {
  const purchased = await db
    .select({
      courseId: seatPurchases.courseId,
      titleEn: courses.titleEn,
      titleAr: courses.titleAr,
      code: courses.code,
      total: sql<number>`sum(${seatPurchases.seatsTotal})::int`,
    })
    .from(seatPurchases)
    .innerJoin(courses, eq(courses.id, seatPurchases.courseId))
    .where(eq(seatPurchases.orgId, orgId))
    .groupBy(seatPurchases.courseId, courses.titleEn, courses.titleAr, courses.code)
    .orderBy(asc(courses.code));
  const used = await db
    .select({ courseId: enrollments.courseId, n: count() })
    .from(enrollments)
    .where(and(eq(enrollments.orgId, orgId), eq(enrollments.status, "active"), sql`${enrollments.seatPurchaseId} is not null`))
    .groupBy(enrollments.courseId);
  const usedBy = new Map(used.map((u) => [u.courseId, u.n]));
  return purchased.map((p) => {
    const assigned = usedBy.get(p.courseId) ?? 0;
    return { courseId: p.courseId, titleEn: p.titleEn, titleAr: p.titleAr, code: p.code, purchased: p.total, assigned, remaining: Math.max(0, p.total - assigned) };
  });
}

export async function getSeatSummary(db: Db, viewer: Viewer) {
  return seatSummaryFor(db, managerOrg(viewer).id);
}

/** Employees of the viewer's organization, with only the fields a manager needs. */
export async function listEmployees(db: Db, viewer: Viewer) {
  const org = managerOrg(viewer);
  const members = await db
    .select({ userId: user.id, name: user.name, nameAr: user.nameAr, email: user.email, role: memberships.role, joinedAt: memberships.createdAt })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(eq(memberships.orgId, org.id))
    .orderBy(asc(user.name));
  const progress = await loadProgress(db, { orgId: org.id });
  return members.map((m) => ({ ...m, enrollments: progress.filter((p) => p.learner.id === m.userId) }));
}

export async function listInvitations(db: Db, viewer: Viewer) {
  const org = managerOrg(viewer);
  const rows = await db
    .select({ id: invitations.id, email: invitations.email, name: invitations.name, status: invitations.status, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt })
    .from(invitations)
    .where(eq(invitations.orgId, org.id))
    .orderBy(desc(invitations.createdAt));
  const now = new Date();
  return rows.map((r) => ({ ...r, status: r.status === "pending" && r.expiresAt <= now ? ("expired" as const) : r.status }));
}

export async function inviteEmployee(db: Db, viewer: Viewer, input: { email: string; name: string }, locale: string) {
  const org = managerOrg(viewer);
  const email = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const invitation = await db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select({ id: user.id, orgId: memberships.orgId })
      .from(user)
      .leftJoin(memberships, eq(memberships.userId, user.id))
      .where(eq(user.email, email))
      .limit(1);
    if (existingUser?.orgId === org.id) throw new AppError("already_member");
    // Do not reveal which other organization the person belongs to.
    if (existingUser?.orgId) throw new AppError("invite_unavailable");
    await tx
      .update(invitations)
      .set({ status: "revoked" })
      .where(and(eq(invitations.orgId, org.id), eq(invitations.email, email), eq(invitations.status, "pending")));
    const [inv] = await tx
      .insert(invitations)
      .values({
        orgId: org.id,
        email,
        name: input.name.trim(),
        tokenHash: hashToken(token),
        invitedBy: viewer.id,
        expiresAt: new Date(Date.now() + config.invitationDays * 86_400_000),
      })
      .returning();
    await logAudit(tx, viewer.id, "invitation.created", "invitation", inv.id, {});
    return inv;
  });
  await sendEmail(db, {
    to: email,
    locale,
    template: "invitation",
    params: { name: input.name.trim(), company: org.name, url: `${config.appUrl}/${locale}/invite/${token}` },
  });
  return invitation;
}

export async function revokeInvitation(db: Db, viewer: Viewer, invitationId: string) {
  const org = managerOrg(viewer);
  const [inv] = await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(and(eq(invitations.id, invitationId), eq(invitations.orgId, org.id), eq(invitations.status, "pending")))
    .returning();
  if (!inv) throw notFound();
  await logAudit(db, viewer.id, "invitation.revoked", "invitation", inv.id, {});
}

/** Public lookup by secret token: reveals only what the invitee needs. */
export async function getInvitationByToken(db: Db, token: string) {
  const [row] = await db
    .select({ id: invitations.id, email: invitations.email, name: invitations.name, status: invitations.status, expiresAt: invitations.expiresAt, orgName: organizations.name })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.orgId))
    .where(eq(invitations.tokenHash, hashToken(token)))
    .limit(1);
  if (!row) return null;
  const usable = row.status === "pending" && row.expiresAt > new Date();
  return { ...row, usable };
}

/** Accept an invitation. The signed-in account's email must match the invited address. */
export async function acceptInvitation(db: Db, viewer: Viewer, token: string) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(invitations).where(eq(invitations.tokenHash, hashToken(token))).for("update").limit(1);
    if (!inv || inv.status !== "pending" || inv.expiresAt <= new Date()) throw new AppError("invitation_invalid");
    if (inv.email !== viewer.email.toLowerCase()) throw new AppError("invitation_email_mismatch");
    const [m] = await tx.select().from(memberships).where(eq(memberships.userId, viewer.id)).limit(1);
    if (m && m.orgId !== inv.orgId) throw new AppError("already_in_organization");
    if (!m) await tx.insert(memberships).values({ orgId: inv.orgId, userId: viewer.id, role: "employee" });
    await tx.update(invitations).set({ status: "accepted", acceptedUserId: viewer.id }).where(eq(invitations.id, inv.id));
    await logAudit(tx, viewer.id, "invitation.accepted", "invitation", inv.id, {});
    return inv.orgId;
  });
}

/** Assign one of the organization's purchased seats to one of its own employees. */
export async function assignSeat(db: Db, viewer: Viewer, input: { userId: string; sessionId: string }) {
  const org = managerOrg(viewer);
  return db.transaction(async (tx) => {
    const [member] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, input.userId), eq(memberships.orgId, org.id)))
      .limit(1);
    if (!member) throw forbidden(); // not this organization's employee

    const [s] = await tx.select({ courseId: courseSessions.courseId }).from(courseSessions).where(eq(courseSessions.id, input.sessionId)).limit(1);
    if (!s) throw notFound();

    const [dup] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, input.userId), eq(enrollments.sessionId, input.sessionId), eq(enrollments.status, "active")))
      .limit(1);
    if (dup) throw new AppError("already_enrolled");

    const purchases = await tx
      .select()
      .from(seatPurchases)
      .where(and(eq(seatPurchases.orgId, org.id), eq(seatPurchases.courseId, s.courseId)))
      .orderBy(asc(seatPurchases.createdAt))
      .for("update");
    if (purchases.length === 0) throw new AppError("no_seats_remaining");
    const used = await tx
      .select({ id: enrollments.seatPurchaseId, n: count() })
      .from(enrollments)
      .where(and(inArray(enrollments.seatPurchaseId, purchases.map((p) => p.id)), eq(enrollments.status, "active")))
      .groupBy(enrollments.seatPurchaseId);
    const usedBy = new Map(used.map((u) => [u.id, u.n]));
    const free = purchases.find((p) => (usedBy.get(p.id) ?? 0) < p.seatsTotal);
    if (!free) throw new AppError("no_seats_remaining");

    const e = await enrollDirect(tx, { userId: input.userId, sessionId: input.sessionId, orgId: org.id, seatPurchaseId: free.id });
    await logAudit(tx, viewer.id, "seat.assigned", "enrollment", e.id, { seatPurchaseId: free.id });
    return e;
  });
}

/** Release a seat before the session starts so it can be reassigned. */
export async function unassignSeat(db: Db, viewer: Viewer, enrollmentId: string) {
  const org = managerOrg(viewer);
  const [row] = await db
    .select({ e: enrollments, startsAt: courseSessions.startsAt })
    .from(enrollments)
    .innerJoin(courseSessions, eq(courseSessions.id, enrollments.sessionId))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.orgId, org.id), eq(enrollments.status, "active")))
    .limit(1);
  if (!row) throw notFound();
  if (row.startsAt <= new Date()) throw new AppError("session_started");
  await db.update(enrollments).set({ status: "cancelled" }).where(eq(enrollments.id, enrollmentId));
  await logAudit(db, viewer.id, "seat.released", "enrollment", enrollmentId, {});
}

/** Rows for the downloadable progress report of the viewer's organization. */
export async function getReportRows(db: Db, viewer: Viewer) {
  const org = managerOrg(viewer);
  const progress = await loadProgress(db, { orgId: org.id });
  return progress.map((p) => ({
    employee: p.learner.name,
    employeeAr: p.learner.nameAr ?? "",
    email: p.learner.email,
    courseCode: p.course.code,
    courseEn: p.course.titleEn,
    courseAr: p.course.titleAr,
    sessionStart: p.session.startsAt,
    language: p.session.language,
    attendanceStatus: p.attendance?.status ?? "",
    attendancePercent: p.attendance?.percent ?? null,
    attempts: p.attempts.length,
    bestScore: p.attempts.reduce<number | null>((m, a) => (a.scorePercent === null ? m : Math.max(m ?? 0, a.scorePercent)), null),
    status: p.progress.status,
    certificateNumber: p.certificate?.status === "valid" ? p.certificate.number : "",
  }));
}
