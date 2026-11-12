import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { attendance, courses, enrollments, examAttempts, exams, questions } from "../db/schema";
import type { AttemptQuestionOrder } from "../db/schema";
import { config } from "../config";
import { AppError, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { issueCertificateIfEligible } from "./certificates";
import { meetsAttendance } from "./enrollment";

export type EligibilityCode =
  | "ok"
  | "in_progress"
  | "not_enrolled"
  | "attendance_pending"
  | "attendance_insufficient"
  | "already_passed"
  | "no_attempts_left"
  | "cooldown"
  | "exam_not_configured";

export type Eligibility = {
  code: EligibilityCode;
  attemptsUsed: number;
  maxAttempts: number;
  availableAt?: Date;
  attemptId?: string;
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const graceMs = () => config.examGraceSeconds * 1000;

async function score(tx: Db, order: AttemptQuestionOrder, answers: Record<string, string>) {
  const ids = order.map((q) => q.questionId);
  const key = ids.length
    ? await tx
        .select({ id: questions.id, correct: questions.correctOptionId })
        .from(questions)
        .where(inArray(questions.id, ids))
    : [];
  const correctById = new Map(key.map((k) => [k.id, k.correct]));
  let correct = 0;
  for (const qid of ids) if (answers[qid] && answers[qid] === correctById.get(qid)) correct++;
  const total = ids.length;
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

/**
 * Close an attempt exactly once. The conditional UPDATE (status = in_progress)
 * is what protects against duplicate submissions from double clicks, retries
 * or two tabs: only the first request wins.
 */
async function finalize(tx: Db, attemptId: string, as: "submitted" | "expired", extraAnswers?: Record<string, string>) {
  const [attempt] = await tx.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).for("update").limit(1);
  if (!attempt || attempt.status !== "in_progress") return attempt ?? null;
  const [exam] = await tx.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
  const allowed = new Map(attempt.questionOrder.map((q) => [q.questionId, new Set(q.optionOrder)]));
  const answers = { ...attempt.answers };
  for (const [qid, oid] of Object.entries(extraAnswers ?? {})) if (allowed.get(qid)?.has(oid)) answers[qid] = oid;
  const s = await score(tx, attempt.questionOrder, answers);
  const passed = s.percent >= (exam?.passingScorePercent ?? 100);
  const [done] = await tx
    .update(examAttempts)
    .set({ status: as, answers, submittedAt: new Date(), correctCount: s.correct, scorePercent: s.percent, passed })
    .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.status, "in_progress")))
    .returning();
  if (!done) return attempt;
  await logAudit(tx, attempt.userId, `exam.${as}`, "exam_attempt", attemptId, {
    attemptNumber: attempt.attemptNumber,
    scorePercent: s.percent,
    passed,
  });
  if (passed) await issueCertificateIfEligible(tx, attempt.enrollmentId);
  return done;
}

/** Close any of this enrollment's attempts whose time has run out, scoring saved answers. */
async function expireOverdue(tx: Db, enrollmentId: string) {
  const overdue = await tx
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.enrollmentId, enrollmentId),
        eq(examAttempts.status, "in_progress"),
        sql`${examAttempts.expiresAt} < ${new Date(Date.now() - graceMs())}`,
      ),
    );
  for (const o of overdue) await finalize(tx, o.id, "expired");
}

async function loadContext(tx: Db, viewer: Viewer, enrollmentId: string) {
  const [row] = await tx
    .select({ enrollment: enrollments, course: courses, exam: exams, att: attendance })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .leftJoin(exams, eq(exams.courseId, enrollments.courseId))
    .leftJoin(attendance, eq(attendance.enrollmentId, enrollments.id))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);
  // The exam belongs to the enrolled learner only.
  if (!row || row.enrollment.userId !== viewer.id || row.enrollment.status !== "active") return null;
  return row;
}

async function eligibilityIn(tx: Db, viewer: Viewer, enrollmentId: string): Promise<Eligibility> {
  const ctx = await loadContext(tx, viewer, enrollmentId);
  if (!ctx) return { code: "not_enrolled", attemptsUsed: 0, maxAttempts: 0 };
  await expireOverdue(tx, enrollmentId);
  const attempts = await tx
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.enrollmentId, enrollmentId))
    .orderBy(asc(examAttempts.attemptNumber));
  const maxAttempts = ctx.exam?.maxAttempts ?? 0;
  const base = { attemptsUsed: attempts.length, maxAttempts };
  if (!ctx.exam) return { code: "exam_not_configured", ...base };
  if (!ctx.att) return { code: "attendance_pending", ...base };
  if (!meetsAttendance(ctx.att, ctx.course.minAttendancePercent)) return { code: "attendance_insufficient", ...base };
  if (attempts.some((a) => a.passed)) return { code: "already_passed", ...base };
  const open = attempts.find((a) => a.status === "in_progress");
  if (open) return { code: "in_progress", attemptId: open.id, ...base };
  if (attempts.length >= maxAttempts) return { code: "no_attempts_left", ...base };
  const last = attempts.at(-1);
  if (last?.submittedAt && ctx.exam.retakeCooldownHours > 0) {
    const availableAt = new Date(last.submittedAt.getTime() + ctx.exam.retakeCooldownHours * 3_600_000);
    if (availableAt > new Date()) return { code: "cooldown", availableAt, ...base };
  }
  const [{ n }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(questions)
    .where(and(eq(questions.examId, ctx.exam.id), eq(questions.active, true)));
  if (n < 1) return { code: "exam_not_configured", ...base };
  return { code: "ok", ...base };
}

/** Server-side exam eligibility. The browser never decides this. */
export async function getEligibility(db: Db, viewer: Viewer, enrollmentId: string): Promise<Eligibility> {
  return db.transaction((tx) => eligibilityIn(tx, viewer, enrollmentId));
}

/** Start a new attempt, or return the one already in progress (e.g. after a refresh). */
export async function startOrResumeAttempt(db: Db, viewer: Viewer, enrollmentId: string) {
  return db.transaction(async (tx) => {
    // Serialize concurrent starts for the same enrollment.
    await tx.select({ id: enrollments.id }).from(enrollments).where(eq(enrollments.id, enrollmentId)).for("update");
    const e = await eligibilityIn(tx, viewer, enrollmentId);
    if (e.code === "in_progress") return { attemptId: e.attemptId!, resumed: true };
    if (e.code !== "ok") throw new AppError(`exam_${e.code}`);
    const ctx = (await loadContext(tx, viewer, enrollmentId))!;
    const exam = ctx.exam!;
    const bank = await tx
      .select({ id: questions.id, options: questions.options })
      .from(questions)
      .where(and(eq(questions.examId, exam.id), eq(questions.active, true)))
      .orderBy(asc(questions.createdAt), asc(questions.id));
    const picked = (exam.shuffleQuestions ? shuffle(bank) : bank).slice(0, exam.questionsPerAttempt);
    const questionOrder: AttemptQuestionOrder = picked.map((q) => {
      const ids = q.options.map((o) => o.id);
      return { questionId: q.id, optionOrder: exam.shuffleOptions ? shuffle(ids) : ids };
    });
    const now = new Date();
    const [attempt] = await tx
      .insert(examAttempts)
      .values({
        enrollmentId,
        userId: viewer.id,
        examId: exam.id,
        attemptNumber: e.attemptsUsed + 1,
        questionOrder,
        startedAt: now,
        expiresAt: new Date(now.getTime() + exam.durationMinutes * 60_000),
      })
      .returning();
    await logAudit(tx, viewer.id, "exam.started", "exam_attempt", attempt.id, { attemptNumber: attempt.attemptNumber });
    return { attemptId: attempt.id, resumed: false };
  });
}

async function ownAttempt(tx: Db, viewer: Viewer, attemptId: string) {
  const [a] = await tx.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
  if (!a || a.userId !== viewer.id) return null;
  return a;
}

export type TakingQuestion = {
  id: string;
  textEn: string;
  textAr: string;
  isSample: boolean;
  options: { id: string; en: string; ar: string }[];
};

/**
 * The attempt as the browser may see it while in progress: questions and
 * options in the learner's order, saved answers, and the deadline.
 * Correct answers are NEVER included.
 */
export async function getAttemptForTaking(db: Db, viewer: Viewer, attemptId: string) {
  return db.transaction(async (tx) => {
    let a = await ownAttempt(tx, viewer, attemptId);
    if (!a) return null;
    if (a.status === "in_progress" && a.expiresAt.getTime() + graceMs() < Date.now()) {
      a = (await finalize(tx, a.id, "expired")) ?? a;
    }
    if (a.status !== "in_progress") return { status: a.status, attemptId: a.id, enrollmentId: a.enrollmentId } as const;
    const ids = a.questionOrder.map((q) => q.questionId);
    const rows = await tx
      .select({ id: questions.id, textEn: questions.textEn, textAr: questions.textAr, options: questions.options, isSample: questions.isSample })
      .from(questions)
      .where(inArray(questions.id, ids));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const list: TakingQuestion[] = a.questionOrder.flatMap((q) => {
      const r = byId.get(q.questionId);
      if (!r) return [];
      const opts = new Map(r.options.map((o) => [o.id, o]));
      return [{ id: r.id, textEn: r.textEn, textAr: r.textAr, isSample: r.isSample, options: q.optionOrder.flatMap((oid) => (opts.get(oid) ? [opts.get(oid)!] : [])) }];
    });
    return {
      status: "in_progress",
      attemptId: a.id,
      enrollmentId: a.enrollmentId,
      attemptNumber: a.attemptNumber,
      expiresAt: a.expiresAt,
      serverNow: new Date(),
      answers: a.answers,
      questions: list,
    } as const;
  });
}

/** Autosave one answer. Rejected after the deadline. */
export async function saveAnswer(db: Db, viewer: Viewer, attemptId: string, questionId: string, optionId: string) {
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).for("update").limit(1);
    if (!a || a.userId !== viewer.id) throw notFound();
    if (a.status !== "in_progress") throw new AppError("exam_closed");
    if (a.expiresAt.getTime() + graceMs() < Date.now()) {
      await finalize(tx, a.id, "expired");
      throw new AppError("exam_closed");
    }
    const q = a.questionOrder.find((x) => x.questionId === questionId);
    if (!q || !q.optionOrder.includes(optionId)) throw new AppError("invalid_answer");
    await tx
      .update(examAttempts)
      .set({ answers: { ...a.answers, [questionId]: optionId } })
      .where(eq(examAttempts.id, a.id));
  });
}

/**
 * Submit an attempt. Idempotent: a second submission returns the first result.
 * Answers sent with the submission are merged only if the deadline has not passed.
 */
export async function submitAttempt(db: Db, viewer: Viewer, attemptId: string, answers: Record<string, string> = {}) {
  return db.transaction(async (tx) => {
    const a = await ownAttempt(tx, viewer, attemptId);
    if (!a) throw notFound();
    if (a.status !== "in_progress") return { attemptId: a.id, alreadySubmitted: true };
    const late = a.expiresAt.getTime() + graceMs() < Date.now();
    await finalize(tx, a.id, late ? "expired" : "submitted", late ? undefined : answers);
    return { attemptId: a.id, alreadySubmitted: false };
  });
}

/** Result for the learner. Reveals the score, not the answer key. */
export async function getAttemptResult(db: Db, viewer: Viewer, attemptId: string) {
  const a = await getAttemptForTaking(db, viewer, attemptId);
  if (!a || a.status === "in_progress") return null;
  const [row] = await db
    .select({ attempt: examAttempts, exam: exams, course: courses })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .innerJoin(courses, eq(courses.id, exams.courseId))
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!row) return null;
  const eligibility = await getEligibility(db, viewer, row.attempt.enrollmentId);
  return {
    attemptId: row.attempt.id,
    enrollmentId: row.attempt.enrollmentId,
    attemptNumber: row.attempt.attemptNumber,
    status: row.attempt.status as "submitted" | "expired",
    scorePercent: row.attempt.scorePercent ?? 0,
    correctCount: row.attempt.correctCount ?? 0,
    totalQuestions: row.attempt.questionOrder.length,
    passed: !!row.attempt.passed,
    passingScorePercent: row.exam.passingScorePercent,
    course: { titleEn: row.course.titleEn, titleAr: row.course.titleAr, slug: row.course.slug },
    eligibility,
  };
}

export async function getExamOverview(db: Db, viewer: Viewer, enrollmentId: string) {
  const ctx = await db.transaction((tx) => loadContext(tx, viewer, enrollmentId));
  if (!ctx) return null;
  const eligibility = await getEligibility(db, viewer, enrollmentId);
  return {
    course: { titleEn: ctx.course.titleEn, titleAr: ctx.course.titleAr, code: ctx.course.code, slug: ctx.course.slug },
    exam: ctx.exam,
    eligibility,
  };
}
