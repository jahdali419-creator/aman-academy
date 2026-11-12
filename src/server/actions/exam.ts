"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { getViewer } from "../auth/session";
import { database } from "../db/client";
import { AppError } from "../errors";
import { saveAnswer, startOrResumeAttempt, submitAttempt } from "../services/exams";
import { notifyCertificateIssued } from "../services/notifications";
import { limit, run } from "./helpers";

const ID = /^[\w-]{1,64}$/;

async function viewerOrThrow() {
  const v = await getViewer();
  if (!v) throw new AppError("forbidden", 403);
  return v;
}

export async function startExamAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await viewerOrThrow();
    await limit("exam-start", 10, 300, viewer.id);
    const { attemptId } = await startOrResumeAttempt(await database(), viewer, String(formData.get("enrollmentId") ?? ""));
    return redirect({ href: `/exam/attempt/${attemptId}`, locale: await getLocale() });
  });
}

type Result = { ok: true } | { ok: false; error: string };

/** Autosave one answer. Eligibility, ownership and the deadline are all checked on the server. */
export async function saveAnswerAction(attemptId: string, questionId: string, optionId: string): Promise<Result> {
  try {
    if (![attemptId, questionId, optionId].every((v) => typeof v === "string" && ID.test(v))) throw new AppError("invalid_answer");
    const viewer = await viewerOrThrow();
    await limit("exam-save", 600, 600, viewer.id);
    await saveAnswer(await database(), viewer, attemptId, questionId, optionId);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.code };
    console.error("[exam] save failed");
    return { ok: false, error: "unexpected" };
  }
}

/** Submit the attempt. Scoring happens on the server; repeated submissions are harmless. */
export async function submitExamAction(attemptId: string, answers: Record<string, string>): Promise<Result> {
  try {
    const viewer = await viewerOrThrow();
    if (typeof attemptId !== "string" || !ID.test(attemptId)) throw new AppError("not_found", 404);
    const clean: Record<string, string> = {};
    for (const [q, o] of Object.entries(answers ?? {}).slice(0, 200)) if (ID.test(q) && typeof o === "string" && ID.test(o)) clean[q] = o;
    await limit("exam-submit", 30, 300, viewer.id);
    const db = await database();
    const res = await submitAttempt(db, viewer, attemptId, clean);
    if (!res.alreadySubmitted) await notifyCertificateIssued(db, attemptId);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.code };
    console.error("[exam] submit failed");
    return { ok: false, error: "unexpected" };
  }
}
