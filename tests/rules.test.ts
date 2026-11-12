import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { auditLog, certificates, enrollments, examAttempts, orders, questions } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import type { Viewer } from "@/server/viewer";
import { getPublicSession, listUpcomingSessions } from "@/server/services/catalog";
import { createIndividualOrder, createSeatOrder, getOrderForViewer, handlePaymentEvent, signPayload, verifyWebhookSignature, type PaymentEvent } from "@/server/services/orders";
import { deriveProgress, enrollDirect, getJoinDetails, loadProgress } from "@/server/services/enrollment";
import { markAttendance } from "@/server/services/attendance";
import { getAttemptForTaking, getAttemptResult, getEligibility, saveAnswer, startOrResumeAttempt, submitAttempt } from "@/server/services/exams";
import { getCertificateForViewer, replaceCertificate, revokeCertificate, verifyCertificate } from "@/server/services/certificates";
import { acceptInvitation, assignSeat, getReportRows, getSeatSummary, inviteEmployee, listEmployees, listInvitations } from "@/server/services/company";
import { getSessionForDelivery, listAssignedSessions, updateJoinDetails } from "@/server/services/instructor";
import { getOverview, listAudit, listEnrollmentsAdmin, saveCourse, saveExamConfig, saveSession } from "@/server/services/admin";
import { addEmployee, makeCourse, makeInstructor, makeOrg, makeUser, setup, startSession } from "./helpers";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await setup()));
afterAll(async () => close());

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "no_error";
  } catch (e) {
    return e instanceof AppError ? e.code : `unexpected: ${e}`;
  }
};

let ev = 0;
const pay = (order: { id: string; totalHalalas: number }, over: Partial<PaymentEvent> = {}): PaymentEvent => ({
  provider: "test",
  eventId: `evt_${++ev}`,
  orderId: order.id,
  type: "payment.succeeded",
  amountHalalas: order.totalHalalas,
  currency: "SAR",
  ...over,
});

/** Enrol, mark attendance, and return the enrollment id. */
async function attended(learner: Viewer, admin: Viewer, sessionId: string, percent = 100) {
  const e = await db.transaction((tx) => enrollDirect(tx, { userId: learner.id, sessionId }));
  await startSession(db, sessionId);
  await markAttendance(db, admin, e.id, { status: percent > 0 ? "present" : "absent", percent });
  return e.id;
}

async function answerAll(viewer: Viewer, attemptId: string, correct: boolean | number) {
  const a = await getAttemptForTaking(db, viewer, attemptId);
  if (!a || a.status !== "in_progress") throw new Error("attempt not in progress");
  const answers: Record<string, string> = {};
  let i = 0;
  for (const q of a.questions) {
    const [k] = await db.select({ c: questions.correctOptionId }).from(questions).where(eq(questions.id, q.id));
    const right = typeof correct === "number" ? i < correct : correct;
    answers[q.id] = right ? k.c : q.options.find((o) => o.id !== k.c)!.id;
    i++;
  }
  return answers;
}

describe("seat limits and payment verification", () => {
  it("holds seats for pending orders and refuses when full", async () => {
    const { session } = await makeCourse(db, { maxSeats: 2 });
    const [a, b, c] = [await makeUser(db), await makeUser(db), await makeUser(db)];
    await createIndividualOrder(db, a, session.id);
    await createIndividualOrder(db, b, session.id);
    expect((await getPublicSession(db, session.id))!.seatsLeft).toBe(0);
    expect(await code(createIndividualOrder(db, c, session.id))).toBe("session_full");
  });

  it("reuses a pending order instead of holding two seats for one person", async () => {
    const { session } = await makeCourse(db, { maxSeats: 3 });
    const a = await makeUser(db);
    const o1 = await createIndividualOrder(db, a, session.id);
    const o2 = await createIndividualOrder(db, a, session.id);
    expect(o2.id).toBe(o1.id);
    expect((await getPublicSession(db, session.id))!.seatsLeft).toBe(2);
  });

  it("enrols only on a verified successful payment event, exactly once", async () => {
    const { session } = await makeCourse(db);
    const a = await makeUser(db);
    const order = await createIndividualOrder(db, a, session.id);
    expect((await loadProgress(db, { userId: a.id })).length).toBe(0); // creating an order does not enrol
    const event = pay(order);
    expect(await handlePaymentEvent(db, event)).toBe("paid");
    expect(await handlePaymentEvent(db, event)).toBe("duplicate"); // replayed event
    expect(await handlePaymentEvent(db, pay(order))).toBe("duplicate"); // second event for a paid order
    expect((await loadProgress(db, { userId: a.id })).length).toBe(1);
    expect(await code(createIndividualOrder(db, a, session.id))).toBe("already_enrolled");
  });

  it("rejects an amount mismatch and a failed payment without enrolling", async () => {
    const { session } = await makeCourse(db, { maxSeats: 1 });
    const a = await makeUser(db);
    const o1 = await createIndividualOrder(db, a, session.id);
    expect(await handlePaymentEvent(db, pay(o1, { amountHalalas: 100 }))).toBe("failed");
    const o2 = await createIndividualOrder(db, a, session.id); // hold was released
    expect(o2.id).not.toBe(o1.id);
    expect(await handlePaymentEvent(db, pay(o2, { type: "payment.failed" }))).toBe("failed");
    expect((await loadProgress(db, { userId: a.id })).length).toBe(0);
    expect((await getPublicSession(db, session.id))!.seatsLeft).toBe(1);
  });

  it("flags a refund instead of overbooking when the hold expired and the session filled", async () => {
    const { session } = await makeCourse(db, { maxSeats: 1 });
    const [a, b] = [await makeUser(db), await makeUser(db)];
    const oa = await createIndividualOrder(db, a, session.id);
    await db.update(orders).set({ holdExpiresAt: new Date(Date.now() - 1000) }).where(eq(orders.id, oa.id));
    const ob = await createIndividualOrder(db, b, session.id);
    expect(await handlePaymentEvent(db, pay(ob))).toBe("paid");
    expect(await handlePaymentEvent(db, pay(oa))).toBe("refund_required");
    const active = await db.select().from(enrollments).where(eq(enrollments.sessionId, session.id));
    expect(active.length).toBe(1);
  });

  it("verifies webhook signatures and fails closed", () => {
    const body = JSON.stringify({ hello: "world" });
    const sig = signPayload(body, "secret");
    expect(verifyWebhookSignature(body, sig, "secret")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "secret")).toBe(false);
    expect(verifyWebhookSignature(body, "zz", "secret")).toBe(false);
    expect(verifyWebhookSignature(body, sig, "")).toBe(false);
    expect(verifyWebhookSignature(body, null, "secret")).toBe(false);
  });

  it("keeps orders private to their owner", async () => {
    const { session } = await makeCourse(db);
    const [a, b] = [await makeUser(db), await makeUser(db)];
    const order = await createIndividualOrder(db, a, session.id);
    expect(await getOrderForViewer(db, b, order.id)).toBeNull();
    expect((await getOrderForViewer(db, a, order.id))?.id).toBe(order.id);
  });
});

describe("protected joining details", () => {
  it("never includes join links in public session data", async () => {
    const { course, session } = await makeCourse(db);
    const pub = await getPublicSession(db, session.id);
    const list = await listUpcomingSessions(db, { courseId: course.id });
    expect(JSON.stringify([pub, list])).not.toContain("secret-link");
    expect(pub).not.toHaveProperty("joinUrl");
  });

  it("releases join details only to enrolled learners, the assigned instructor and admins", async () => {
    const assigned = await makeInstructor(db);
    const other = await makeInstructor(db);
    const admin = await makeUser(db, { role: "admin" });
    const { session } = await makeCourse(db, { instructorId: assigned.instructorId });
    const [enrolled, stranger] = [await makeUser(db), await makeUser(db)];
    await db.transaction((tx) => enrollDirect(tx, { userId: enrolled.id, sessionId: session.id }));
    expect((await getJoinDetails(db, enrolled, session.id)).joinUrl).toContain("secret-link");
    expect((await getJoinDetails(db, assigned, session.id)).joinUrl).toContain("secret-link");
    expect((await getJoinDetails(db, admin, session.id)).joinUrl).toContain("secret-link");
    expect(await code(getJoinDetails(db, stranger, session.id))).toBe("forbidden");
    expect(await code(getJoinDetails(db, other, session.id))).toBe("forbidden");
  });
});

describe("attendance and instructor permissions", () => {
  it("lets only the assigned instructor or an admin record attendance, with an audit trail", async () => {
    const assigned = await makeInstructor(db);
    const other = await makeInstructor(db);
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db);
    const { session } = await makeCourse(db, { instructorId: assigned.instructorId });
    const e = await db.transaction((tx) => enrollDirect(tx, { userId: learner.id, sessionId: session.id }));
    expect(await code(markAttendance(db, assigned, e.id, { status: "present", percent: 100 }))).toBe("session_not_started");
    await startSession(db, session.id);
    expect(await code(markAttendance(db, learner, e.id, { status: "present", percent: 100 }))).toBe("forbidden");
    expect(await code(markAttendance(db, other, e.id, { status: "present", percent: 100 }))).toBe("forbidden");
    await markAttendance(db, assigned, e.id, { status: "partial", percent: 60 });
    await markAttendance(db, admin, e.id, { status: "present", percent: 90 });
    const trail = await db.select().from(auditLog).where(eq(auditLog.entityId, e.id));
    expect(trail.map((t) => t.action)).toEqual(["attendance.recorded", "attendance.corrected"]);
    expect(trail[1].meta).toMatchObject({ before: { status: "partial", percent: 60 }, after: { status: "present", percent: 90 } });
  });

  it("shows instructors only their own sessions and a roster without contact details", async () => {
    const a = await makeInstructor(db);
    const b = await makeInstructor(db);
    const { session } = await makeCourse(db, { instructorId: a.instructorId });
    const learner = await makeUser(db);
    await db.transaction((tx) => enrollDirect(tx, { userId: learner.id, sessionId: session.id }));
    expect((await listAssignedSessions(db, a)).map((s) => s.id)).toEqual([session.id]);
    expect(await listAssignedSessions(db, b)).toEqual([]);
    expect(await getSessionForDelivery(db, b, session.id)).toBeNull();
    const view = await getSessionForDelivery(db, a, session.id);
    expect(view!.roster.length).toBe(1);
    expect(JSON.stringify(view!.roster)).not.toContain(learner.email);
    expect(await code(updateJoinDetails(db, b, session.id, { joinUrl: "https://zoom.us/j/1", joinInstructionsEn: "", joinInstructionsAr: "" }))).toBe("forbidden");
    expect(await code(updateJoinDetails(db, a, session.id, { joinUrl: "javascript:alert(1)", joinInstructionsEn: "", joinInstructionsAr: "" }))).toBe("invalid_url");
    await updateJoinDetails(db, a, session.id, { joinUrl: "https://zoom.us/j/1", joinInstructionsEn: "x", joinInstructionsAr: "y" });
  });
});

describe("exam eligibility, attempts and server-side scoring", () => {
  it("requires recorded, sufficient attendance before an exam can start", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db);
    const { session } = await makeCourse(db);
    const e = await db.transaction((tx) => enrollDirect(tx, { userId: learner.id, sessionId: session.id }));
    expect((await getEligibility(db, learner, e.id)).code).toBe("attendance_pending");
    expect(await code(startOrResumeAttempt(db, learner, e.id))).toBe("exam_attendance_pending");
    await startSession(db, session.id);
    await markAttendance(db, admin, e.id, { status: "partial", percent: 50 });
    expect((await getEligibility(db, learner, e.id)).code).toBe("attendance_insufficient");
    expect(await code(startOrResumeAttempt(db, learner, e.id))).toBe("exam_attendance_insufficient");
    await markAttendance(db, admin, e.id, { status: "present", percent: 85 });
    expect((await getEligibility(db, learner, e.id)).code).toBe("ok");
  });

  it("does not let another person see or start someone else's exam", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const [learner, intruder] = [await makeUser(db), await makeUser(db)];
    const { session } = await makeCourse(db);
    const eid = await attended(learner, admin, session.id);
    expect((await getEligibility(db, intruder, eid)).code).toBe("not_enrolled");
    expect(await code(startOrResumeAttempt(db, intruder, eid))).toBe("exam_not_enrolled");
    const { attemptId } = await startOrResumeAttempt(db, learner, eid);
    expect(await getAttemptForTaking(db, intruder, attemptId)).toBeNull();
    expect(await code(submitAttempt(db, intruder, attemptId))).toBe("not_found");
    expect(await code(saveAnswer(db, admin, attemptId, "x", "y"))).toBe("not_found");
  });

  it("never sends correct answers to the browser, and resumes after a refresh", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db);
    const { session } = await makeCourse(db);
    const eid = await attended(learner, admin, session.id);
    const first = await startOrResumeAttempt(db, learner, eid);
    const again = await startOrResumeAttempt(db, learner, eid);
    expect(again).toEqual({ attemptId: first.attemptId, resumed: true });
    const a = await getAttemptForTaking(db, learner, first.attemptId);
    if (!a || a.status !== "in_progress") throw new Error("expected an attempt in progress");
    expect(JSON.stringify(a)).not.toMatch(/correct/i);
    expect(a.questions.length).toBe(4);
    // Saved answers survive a reload.
    const q = a.questions[0];
    await saveAnswer(db, learner, a.attemptId, q.id, q.options[0].id);
    expect(await code(saveAnswer(db, learner, a.attemptId, q.id, "not-an-option"))).toBe("invalid_answer");
    const reloaded = await getAttemptForTaking(db, learner, a.attemptId);
    if (!reloaded || reloaded.status !== "in_progress") throw new Error("expected an attempt in progress");
    expect(reloaded.answers[q.id]).toBe(q.options[0].id);
  });

  it("scores on the server, ignores duplicate submissions, and enforces the attempt limit", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db);
    const { session } = await makeCourse(db, { maxAttempts: 2 });
    const eid = await attended(learner, admin, session.id);

    const one = await startOrResumeAttempt(db, learner, eid);
    const wrong = await answerAll(learner, one.attemptId, 2); // 2 of 4 = 50%
    const [r1, r2] = await Promise.all([submitAttempt(db, learner, one.attemptId, wrong), submitAttempt(db, learner, one.attemptId, wrong)]);
    expect([r1.alreadySubmitted, r2.alreadySubmitted].filter((x) => !x).length).toBe(1);
    // A later "better" resubmission cannot change the stored result.
    await submitAttempt(db, learner, one.attemptId, await answerAllFromDb(one.attemptId));
    const res1 = await getAttemptResult(db, learner, one.attemptId);
    expect(res1).toMatchObject({ scorePercent: 50, passed: false, correctCount: 2, totalQuestions: 4 });
    expect(res1!.eligibility.code).toBe("ok");
    expect(await code(saveAnswer(db, learner, one.attemptId, "q", "o"))).toBe("exam_closed");

    const two = await startOrResumeAttempt(db, learner, eid);
    expect(two.resumed).toBe(false);
    await submitAttempt(db, learner, two.attemptId, await answerAll(learner, two.attemptId, false));
    expect((await getEligibility(db, learner, eid)).code).toBe("no_attempts_left");
    expect(await code(startOrResumeAttempt(db, learner, eid))).toBe("exam_no_attempts_left");
    const [progress] = await loadProgress(db, { userId: learner.id });
    expect(progress.progress).toEqual({ status: "action_required", reason: "no_attempts_left" });
    expect((await db.select().from(certificates).where(eq(certificates.enrollmentId, eid))).length).toBe(0);
  });

  async function answerAllFromDb(attemptId: string) {
    const [a] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId));
    const out: Record<string, string> = {};
    for (const q of a.questionOrder) {
      const [k] = await db.select({ c: questions.correctOptionId }).from(questions).where(eq(questions.id, q.questionId));
      out[q.questionId] = k.c;
    }
    return out;
  }

  it("closes an expired attempt using only answers saved before the deadline", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db);
    const { session } = await makeCourse(db);
    const eid = await attended(learner, admin, session.id);
    const { attemptId } = await startOrResumeAttempt(db, learner, eid);
    const all = await answerAll(learner, attemptId, true);
    const [firstQ, firstA] = Object.entries(all)[0];
    await saveAnswer(db, learner, attemptId, firstQ, firstA);
    await db.update(examAttempts).set({ expiresAt: new Date(Date.now() - 5 * 60_000) }).where(eq(examAttempts.id, attemptId));
    // Late answers sent with the submission are ignored.
    await submitAttempt(db, learner, attemptId, all);
    const res = await getAttemptResult(db, learner, attemptId);
    expect(res).toMatchObject({ status: "expired", correctCount: 1, scorePercent: 25, passed: false });
    expect(res!.eligibility.attemptsUsed).toBe(1);
  });

  it("stops further attempts after a pass", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db);
    const { session } = await makeCourse(db);
    const eid = await attended(learner, admin, session.id);
    const { attemptId } = await startOrResumeAttempt(db, learner, eid);
    await submitAttempt(db, learner, attemptId, await answerAll(learner, attemptId, true));
    expect((await getEligibility(db, learner, eid)).code).toBe("already_passed");
    expect(await code(startOrResumeAttempt(db, learner, eid))).toBe("exam_already_passed");
  });
});

describe("certificates", () => {
  async function passed(opts: { validityMonths?: number | null } = {}) {
    const admin = await makeUser(db, { role: "admin" });
    const learner = await makeUser(db, { name: "Certificate Holder" });
    const { session, course } = await makeCourse(db, { validityMonths: opts.validityMonths });
    const eid = await attended(learner, admin, session.id);
    const { attemptId } = await startOrResumeAttempt(db, learner, eid);
    await submitAttempt(db, learner, attemptId, await answerAll(learner, attemptId, true));
    const [cert] = await db.select().from(certificates).where(eq(certificates.enrollmentId, eid));
    return { admin, learner, eid, cert, course };
  }

  it("issues exactly one certificate once attendance and exam requirements are both met", async () => {
    const { cert, eid, learner } = await passed();
    expect(cert.status).toBe("valid");
    expect(cert.number).toMatch(/^AMN-\d{4}-[2-9A-HJ-NP-Z]{8}$/);
    expect(cert.expiresAt).toBeNull();
    expect((await db.select().from(certificates).where(eq(certificates.enrollmentId, eid))).length).toBe(1);
    const [p] = await loadProgress(db, { userId: learner.id });
    expect(p.progress.status).toBe("passed");
  });

  it("sets an expiry only when the course configures one", async () => {
    const { cert } = await passed({ validityMonths: 12 });
    expect(cert.expiresAt).not.toBeNull();
    const months = (cert.expiresAt!.getTime() - cert.completedAt.getTime()) / (30 * 86_400_000);
    expect(months).toBeGreaterThan(11.5);
    expect(months).toBeLessThan(12.5);
  });

  it("exposes only minimal information on public verification", async () => {
    const { cert, learner } = await passed();
    const v = await verifyCertificate(db, ` ${cert.number.toLowerCase()} `);
    expect(v).toMatchObject({ found: true, status: "valid", learnerNameEn: "Certificate Holder" });
    expect(Object.keys(v).sort()).toEqual(
      ["courseTitleAr", "courseTitleEn", "expiresAt", "found", "issuedAt", "learnerNameAr", "learnerNameEn", "number", "status"].sort(),
    );
    expect(JSON.stringify(v)).not.toContain(learner.email);
    expect(await verifyCertificate(db, "AMN-2026-ZZZZZZZZ")).toEqual({ found: false });
    expect(await verifyCertificate(db, "'; drop table certificates;--")).toEqual({ found: false });
  });

  it("reports expired certificates as expired", async () => {
    const { cert } = await passed({ validityMonths: 12 });
    await db.update(certificates).set({ expiresAt: new Date(Date.now() - 86_400_000) }).where(eq(certificates.id, cert.id));
    expect(await verifyCertificate(db, cert.number)).toMatchObject({ status: "expired" });
  });

  it("supports revocation and replacement by admins only, with audit history", async () => {
    const { cert, admin, learner, eid } = await passed();
    expect(await code(revokeCertificate(db, learner, cert.id, "nope"))).toBe("forbidden");
    expect(await code(revokeCertificate(db, admin, cert.id, "  "))).toBe("reason_required");
    await revokeCertificate(db, admin, cert.id, "Name misspelled");
    expect(await verifyCertificate(db, cert.number)).toMatchObject({ status: "revoked" });
    expect(await code(revokeCertificate(db, admin, cert.id, "again"))).toBe("not_found");
    const [p] = await loadProgress(db, { userId: learner.id });
    expect(p.progress).toEqual({ status: "action_required", reason: "certificate_revoked" });

    expect(await code(replaceCertificate(db, learner, cert.id, "x"))).toBe("forbidden");
    const fresh = await replaceCertificate(db, admin, cert.id, "Corrected name");
    expect(fresh.number).not.toBe(cert.number);
    expect(fresh.replacesId).toBe(cert.id);
    expect(await verifyCertificate(db, fresh.number)).toMatchObject({ status: "valid" });
    expect(await verifyCertificate(db, cert.number)).toMatchObject({ status: "revoked" });
    const valid = (await db.select().from(certificates).where(eq(certificates.enrollmentId, eid))).filter((c) => c.status === "valid");
    expect(valid.length).toBe(1);
    const actions = (await listAudit(db, admin, 500)).map((a) => a.entry.action);
    expect(actions).toEqual(expect.arrayContaining(["certificate.issued", "certificate.revoked", "certificate.replaced"]));
  });

  it("lets only the owner, an admin, or the sponsoring company's manager open a certificate", async () => {
    const { cert, learner, admin } = await passed();
    const stranger = await makeUser(db);
    const { manager } = await makeOrg(db, "Unrelated Co");
    expect((await getCertificateForViewer(db, learner, cert.number))?.cert.id).toBe(cert.id);
    expect((await getCertificateForViewer(db, admin, cert.number))?.cert.id).toBe(cert.id);
    expect(await getCertificateForViewer(db, stranger, cert.number)).toBeNull();
    expect(await getCertificateForViewer(db, manager, cert.number)).toBeNull();
  });
});

describe("company data isolation and seats", () => {
  async function companyWithSeats(name: string, seats: number, course: Awaited<ReturnType<typeof makeCourse>>) {
    const { org, manager } = await makeOrg(db, name);
    const order = await createSeatOrder(db, manager, course.course.id, seats);
    expect(await handlePaymentEvent(db, pay(order))).toBe("paid");
    return { org, manager };
  }

  it("never shows one company another company's employees, seats, invitations or reports", async () => {
    const c = await makeCourse(db);
    const A = await companyWithSeats("Alpha Co", 3, c);
    const B = await companyWithSeats("Beta Co", 5, c);
    const a1 = await addEmployee(db, A.org.id, "Alpha Co");
    const b1 = await addEmployee(db, B.org.id, "Beta Co");
    await assignSeat(db, A.manager, { userId: a1.id, sessionId: c.session.id });
    await assignSeat(db, B.manager, { userId: b1.id, sessionId: c.session.id });
    await inviteEmployee(db, B.manager, { email: "secret.hire@beta.example", name: "Secret Hire" }, "en");

    const aEmployees = await listEmployees(db, A.manager);
    expect(aEmployees.map((e) => e.userId).sort()).toEqual([A.manager.id, a1.id].sort());
    const aView = JSON.stringify([aEmployees, await getReportRows(db, A.manager), await listInvitations(db, A.manager), await getSeatSummary(db, A.manager)]);
    expect(aView).not.toContain(b1.email);
    expect(aView).not.toContain("secret.hire@beta.example");
    expect(aView).not.toContain("Beta Co");
    expect((await getSeatSummary(db, A.manager))[0]).toMatchObject({ purchased: 3, assigned: 1, remaining: 2 });
    expect((await getSeatSummary(db, B.manager))[0]).toMatchObject({ purchased: 5, assigned: 1, remaining: 4 });
  });

  it("refuses to assign another company's employee, and employees cannot manage", async () => {
    const c = await makeCourse(db);
    const A = await companyWithSeats("Gamma Co", 2, c);
    const B = await makeOrg(db, "Delta Co");
    const b1 = await addEmployee(db, B.org.id, "Delta Co");
    const a1 = await addEmployee(db, A.org.id, "Gamma Co");
    expect(await code(assignSeat(db, A.manager, { userId: b1.id, sessionId: c.session.id }))).toBe("forbidden");
    expect(await code(assignSeat(db, a1, { userId: a1.id, sessionId: c.session.id }))).toBe("forbidden");
    expect(await code(listEmployees(db, a1))).toBe("forbidden");
    expect(await code(getReportRows(db, await makeUser(db)))).toBe("forbidden");
    expect(await code(createSeatOrder(db, a1, c.course.id, 1))).toBe("forbidden");
  });

  it("enforces purchased seat counts and session capacity", async () => {
    const c = await makeCourse(db, { maxSeats: 2 });
    const A = await companyWithSeats("Epsilon Co", 1, c);
    const [e1, e2] = [await addEmployee(db, A.org.id, "Epsilon Co"), await addEmployee(db, A.org.id, "Epsilon Co")];
    await assignSeat(db, A.manager, { userId: e1.id, sessionId: c.session.id });
    expect(await code(assignSeat(db, A.manager, { userId: e1.id, sessionId: c.session.id }))).toBe("already_enrolled");
    expect(await code(assignSeat(db, A.manager, { userId: e2.id, sessionId: c.session.id }))).toBe("no_seats_remaining");
    // Buy more seats than the session can take.
    const more = await createSeatOrder(db, A.manager, c.course.id, 5);
    await handlePaymentEvent(db, pay(more));
    await assignSeat(db, A.manager, { userId: e2.id, sessionId: c.session.id });
    const e3 = await addEmployee(db, A.org.id, "Epsilon Co");
    expect(await code(assignSeat(db, A.manager, { userId: e3.id, sessionId: c.session.id }))).toBe("session_full");
  });

  it("lets a manager open certificates of employees it sponsored, not anyone else's", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const c = await makeCourse(db);
    const A = await companyWithSeats("Zeta Co", 2, c);
    const other = await makeOrg(db, "Eta Co");
    const emp = await addEmployee(db, A.org.id, "Zeta Co");
    const e = await assignSeat(db, A.manager, { userId: emp.id, sessionId: c.session.id });
    await startSession(db, c.session.id);
    await markAttendance(db, admin, e.id, { status: "present", percent: 100 });
    const { attemptId } = await startOrResumeAttempt(db, emp, e.id);
    await submitAttempt(db, emp, attemptId, await answerAll(emp, attemptId, true));
    const [cert] = await db.select().from(certificates).where(eq(certificates.enrollmentId, e.id));
    expect((await getCertificateForViewer(db, A.manager, cert.number))?.cert.id).toBe(cert.id);
    expect(await getCertificateForViewer(db, other.manager, cert.number)).toBeNull();
  });

  it("binds invitations to the invited email address", async () => {
    const { manager, org } = await makeOrg(db, "Theta Co");
    const invitee = await makeUser(db);
    const wrong = await makeUser(db);
    await inviteEmployee(db, manager, { email: invitee.email, name: invitee.name }, "ar");
    // The raw token only ever leaves the server inside the invitation email.
    const { emailOutbox } = await import("@/server/db/schema");
    const [mail] = await db.select().from(emailOutbox).where(eq(emailOutbox.toEmail, invitee.email));
    const token = mail.body.match(/invite\/([a-f0-9]{64})/)![1];
    expect(mail.subject).toContain("Theta Co");
    expect(mail.body).toContain("مرحباً");
    expect(await code(acceptInvitation(db, wrong, token))).toBe("invitation_email_mismatch");
    expect(await acceptInvitation(db, invitee, token)).toBe(org.id);
    expect(await code(acceptInvitation(db, invitee, token))).toBe("invitation_invalid");
    expect((await listInvitations(db, manager))[0].status).toBe("accepted");
  });
});

describe("administrator-only operations", () => {
  it("rejects every admin operation for non-admins", async () => {
    const learner = await makeUser(db);
    const instructor = await makeInstructor(db);
    const { manager } = await makeOrg(db, "Iota Co");
    const { course, session, exam } = await makeCourse(db);
    for (const v of [learner, instructor, manager]) {
      expect(await code(getOverview(db, v))).toBe("forbidden");
      expect(await code(listEnrollmentsAdmin(db, v))).toBe("forbidden");
      expect(await code(listAudit(db, v))).toBe("forbidden");
      expect(await code(saveExamConfig(db, v, exam.id, { durationMinutes: 1, passingScorePercent: 1, maxAttempts: 99, questionsPerAttempt: 1, retakeCooldownHours: 0, shuffleQuestions: true, shuffleOptions: true }))).toBe("forbidden");
      expect(await code(saveSession(db, v, session.id, { courseId: course.id, instructorId: null, language: "ar", startsAt: new Date(), endsAt: new Date(Date.now() + 1), maxSeats: 1, provider: "zoom", joinUrl: "", joinInstructionsEn: "", joinInstructionsAr: "", status: "cancelled" }))).toBe("forbidden");
      expect(await code(saveCourse(db, v, course.id, {} as never))).toBe("forbidden");
    }
  });

  it("will not shrink a session below its enrolled count", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const { course, session } = await makeCourse(db, { maxSeats: 5 });
    for (let i = 0; i < 3; i++) {
      const u = await makeUser(db);
      await db.transaction((tx) => enrollDirect(tx, { userId: u.id, sessionId: session.id }));
    }
    const base = { courseId: course.id, instructorId: null, language: "ar" as const, startsAt: session.startsAt, endsAt: session.endsAt, provider: "zoom" as const, joinUrl: "", joinInstructionsEn: "", joinInstructionsAr: "", status: "scheduled" as const };
    expect(await code(saveSession(db, admin, session.id, { ...base, maxSeats: 2 }))).toBe("seats_below_enrolled");
    await saveSession(db, admin, session.id, { ...base, maxSeats: 3 });
  });
});

describe("learner status derivation", () => {
  const base = { enrollmentStatus: "active" as const, sessionStatus: "scheduled" as const, sessionEndsAt: new Date(Date.now() + 1e7), minAttendancePercent: 80, attendance: null, maxAttempts: 2, attempts: [], certificate: null };
  it("walks through the journey", () => {
    expect(deriveProgress(base).status).toBe("session_upcoming");
    expect(deriveProgress({ ...base, sessionEndsAt: new Date(Date.now() - 1) }).status).toBe("attendance_pending");
    const present = { status: "present" as const, percent: 90 };
    expect(deriveProgress({ ...base, attendance: present }).status).toBe("exam_available");
    expect(deriveProgress({ ...base, attendance: { status: "partial", percent: 40 } })).toEqual({ status: "action_required", reason: "attendance_insufficient" });
    expect(deriveProgress({ ...base, attendance: present, attempts: [{ status: "in_progress", passed: null }] }).status).toBe("exam_in_progress");
    expect(deriveProgress({ ...base, attendance: present, attempts: [{ status: "submitted", passed: true }] }).status).toBe("passed");
    expect(deriveProgress({ ...base, sessionStatus: "cancelled" })).toEqual({ status: "action_required", reason: "session_cancelled" });
    expect(deriveProgress({ ...base, enrollmentStatus: "cancelled" }).status).toBe("cancelled");
  });
});
