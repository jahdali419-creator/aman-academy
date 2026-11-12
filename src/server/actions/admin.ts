"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { fromRiyadhInput } from "@/lib/format";
import { attendanceSchema, email } from "@/lib/validation";
import { getViewer } from "../auth/session";
import { database } from "../db/client";
import { AppError, forbidden, notFound } from "../errors";
import {
  adminEnroll,
  getCourseAdmin,
  getExamAdmin,
  saveCourse,
  saveExamConfig,
  saveQuestion,
  saveSession,
  setInquiryHandled,
  setQuestionActive,
} from "../services/admin";
import { markAttendance } from "../services/attendance";
import { replaceCertificate, revokeCertificate } from "../services/certificates";
import { cancelEnrollment } from "../services/enrollment";
import { parseForm, run } from "./helpers";

/* ---------------- Shared helpers ---------------- */

/** The viewer is always re-derived from the session; services enforce the admin role again. */
async function adminViewer() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") throw forbidden();
  return viewer;
}

/** Every admin page is dynamic; this also refreshes the client router cache after a mutation. */
const refresh = () => revalidatePath("/[locale]/admin", "layout");

/** Like `run`, but keeps what the administrator typed when a business rule rejects the form. */
function runForm(formData: FormData, fn: () => Promise<ActionState | void>): Promise<ActionState> {
  return run(async () => {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      const values: Record<string, string> = {};
      for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v;
      return { ok: false, error: e.code, values };
    }
  });
}

const text = (max = 200) => z.string().trim().min(1, "required").max(max, "too_long");
const optionalText = (max = 200) => z.string().trim().max(max, "too_long").optional().default("");
const idField = text(64);
const optionalId = optionalText(64);
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");
/** Required whole number within a range (an empty field is "required", not zero). */
const int = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, "required")
    .pipe(z.coerce.number<string>("invalid_number").int("invalid_number").min(min, "invalid_number").max(max, "invalid_number"));

const lines = (v: string) =>
  v
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/* ---------------- Courses ---------------- */

const courseSchema = z.object({
  id: optionalId,
  slug: text(80).transform((v) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  ).pipe(z.string().min(1, "required")),
  code: text(20).transform((v) => v.toUpperCase()),
  icon: text(40),
  titleEn: text(160),
  titleAr: text(160),
  summaryEn: optionalText(400),
  summaryAr: optionalText(400),
  overviewEn: optionalText(4000),
  overviewAr: optionalText(4000),
  outcomesEn: optionalText(3000),
  outcomesAr: optionalText(3000),
  audienceEn: optionalText(3000),
  audienceAr: optionalText(3000),
  prerequisitesEn: optionalText(3000),
  prerequisitesAr: optionalText(3000),
  practicalNoteEn: optionalText(1500),
  practicalNoteAr: optionalText(1500),
  durationMinutes: int(15, 6000),
  priceSar: z
    .string()
    .trim()
    .min(1, "required")
    .pipe(z.coerce.number<string>("invalid_number").min(0, "invalid_number").max(1_000_000, "invalid_number")),
  minAttendancePercent: z
    .string()
    .trim()
    .min(1, "required")
    .pipe(z.coerce.number<string>("invalid_number").int("invalid_percent").min(0, "invalid_percent").max(100, "invalid_percent")),
  // Empty = certificates for this course never expire.
  certificateValidityMonths: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) >= 1), "invalid_number")
    .transform((v) => (v === "" ? null : Number(v))),
  published: checkbox,
});

export async function saveCourseAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(courseSchema, formData);
    if ("state" in parsed) return parsed.state;
    const d = parsed.data;
    const db = await database();
    const existing = d.id ? await getCourseAdmin(db, viewer, d.id) : null;
    if (d.id && !existing) throw notFound();
    const saved = await saveCourse(db, viewer, existing?.id ?? null, {
      slug: d.slug,
      code: d.code,
      icon: d.icon,
      titleEn: d.titleEn,
      titleAr: d.titleAr,
      summaryEn: d.summaryEn,
      summaryAr: d.summaryAr,
      overviewEn: d.overviewEn,
      overviewAr: d.overviewAr,
      outcomes: { en: lines(d.outcomesEn), ar: lines(d.outcomesAr) },
      audience: { en: lines(d.audienceEn), ar: lines(d.audienceAr) },
      prerequisites: { en: lines(d.prerequisitesEn), ar: lines(d.prerequisitesAr) },
      // The syllabus is not editable in this release: keep whatever is stored.
      syllabus: existing?.syllabus ?? [],
      practicalNoteEn: d.practicalNoteEn,
      practicalNoteAr: d.practicalNoteAr,
      durationMinutes: d.durationMinutes,
      priceHalalas: Math.round(d.priceSar * 100),
      minAttendancePercent: d.minAttendancePercent,
      certificateValidityMonths: d.certificateValidityMonths,
      published: d.published,
    });
    refresh();
    if (!existing) {
      return redirect({ href: { pathname: `/admin/courses/${saved.id}`, query: { created: "1" } }, locale: await getLocale() });
    }
    return { ok: true, success: "saved" };
  });
}

/* ---------------- Sessions ---------------- */

const riyadhDateTime = z
  .string()
  .trim()
  .min(1, "required")
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "required")
  .transform((v) => fromRiyadhInput(v))
  .refine((d) => !Number.isNaN(d.getTime()), "required");

const httpsUrl = z
  .string()
  .trim()
  .max(600, "too_long")
  .optional()
  .default("")
  .refine((v) => {
    if (v === "") return true;
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "invalid_url");

const sessionSchema = z.object({
  id: optionalId,
  courseId: idField,
  instructorId: optionalId,
  language: z.enum(["ar", "en"], "required"),
  startsAt: riyadhDateTime,
  endsAt: riyadhDateTime,
  maxSeats: z
    .string()
    .trim()
    .min(1, "required")
    .pipe(z.coerce.number<string>("invalid_number").int("invalid_seats").min(1, "invalid_seats").max(1000, "invalid_seats")),
  provider: z.enum(["teams", "zoom"], "required"),
  joinUrl: httpsUrl,
  joinInstructionsEn: optionalText(1000),
  joinInstructionsAr: optionalText(1000),
  status: z.enum(["scheduled", "completed", "cancelled"], "required"),
});

export async function saveSessionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(sessionSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { id, instructorId, ...d } = parsed.data;
    const db = await database();
    const saved = await saveSession(db, viewer, id || null, { ...d, instructorId: instructorId || null });
    refresh();
    if (!id) {
      return redirect({ href: { pathname: `/admin/sessions/${saved.id}`, query: { created: "1" } }, locale: await getLocale() });
    }
    return { ok: true, success: "saved" };
  });
}

export async function markAttendanceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(attendanceSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { enrollmentId, ...input } = parsed.data;
    await markAttendance(await database(), viewer, enrollmentId, input);
    refresh();
    return { ok: true, success: "recorded" };
  });
}

/* ---------------- Exams ---------------- */

const examConfigSchema = z.object({
  courseId: idField,
  durationMinutes: int(5, 300),
  passingScorePercent: z
    .string()
    .trim()
    .min(1, "required")
    .pipe(z.coerce.number<string>("invalid_number").int("invalid_percent").min(1, "invalid_percent").max(100, "invalid_percent")),
  maxAttempts: int(1, 20),
  questionsPerAttempt: int(1, 200),
  retakeCooldownHours: int(0, 720),
  shuffleQuestions: checkbox,
  shuffleOptions: checkbox,
});

export async function saveExamConfigAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(examConfigSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { courseId, ...input } = parsed.data;
    const db = await database();
    // The exam is resolved from the course on the server, never taken from the form.
    const bank = await getExamAdmin(db, viewer, courseId);
    if (!bank) throw notFound();
    await saveExamConfig(db, viewer, bank.exam.id, input);
    refresh();
    return { ok: true, success: "saved" };
  });
}

const OPTION_COUNT = 4;
const optionText = text(400);
const questionSchema = z.object({
  courseId: idField,
  questionId: optionalId,
  textEn: text(1000),
  textAr: text(1000),
  o0En: optionText,
  o0Ar: optionText,
  o1En: optionText,
  o1Ar: optionText,
  o2En: optionText,
  o2Ar: optionText,
  o3En: optionText,
  o3Ar: optionText,
  correct: z.string().optional().default(""),
  isSample: checkbox,
});

export async function saveQuestionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(questionSchema, formData);
    if ("state" in parsed) return parsed.state;
    const d = parsed.data;
    const correctIndex = /^[0-3]$/.test(d.correct) ? Number(d.correct) : -1;
    if (correctIndex < 0) throw new AppError("question_needs_correct");

    const db = await database();
    const bank = await getExamAdmin(db, viewer, d.courseId);
    if (!bank) throw notFound();
    const existing = d.questionId ? bank.questions.find((q) => q.id === d.questionId) : null;
    if (d.questionId && !existing) throw notFound();

    const texts = [
      { en: d.o0En, ar: d.o0Ar },
      { en: d.o1En, ar: d.o1Ar },
      { en: d.o2En, ar: d.o2Ar },
      { en: d.o3En, ar: d.o3Ar },
    ];
    // Option ids are stable across edits so earlier attempts keep pointing at the same options.
    const options = texts.slice(0, OPTION_COUNT).map((o, i) => ({ id: existing?.options[i]?.id ?? crypto.randomUUID().slice(0, 8), ...o }));
    await saveQuestion(db, viewer, bank.exam.id, existing?.id ?? null, {
      textEn: d.textEn,
      textAr: d.textAr,
      options,
      correctOptionId: options[correctIndex].id,
      isSample: d.isSample,
    });
    refresh();
    return { ok: true, success: "saved" };
  });
}

const questionActiveSchema = z.object({ id: idField, active: z.enum(["0", "1"]) });

export async function setQuestionActiveAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(questionActiveSchema, formData);
    if ("state" in parsed) return { ok: false, error: "unexpected" };
    await setQuestionActive(await database(), viewer, parsed.data.id, parsed.data.active === "1");
    refresh();
  });
}

/* ---------------- Enrollments ---------------- */

const enrollSchema = z.object({ email, sessionId: idField });

export async function adminEnrollAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(enrollSchema, formData);
    if ("state" in parsed) return parsed.state;
    await adminEnroll(await database(), viewer, parsed.data.email, parsed.data.sessionId);
    refresh();
    return { ok: true };
  });
}

const idOnlySchema = z.object({ id: idField });

export async function cancelEnrollmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(idOnlySchema, formData);
    if ("state" in parsed) return { ok: false, error: "unexpected" };
    await cancelEnrollment(await database(), viewer, parsed.data.id);
    refresh();
  });
}

/* ---------------- Certificates ---------------- */

const certificateSchema = z.object({
  id: idField,
  reason: z.string().trim().min(1, "reason_required").max(500, "too_long"),
  mode: z.enum(["revoke", "replace"]).optional().default("revoke"),
});

/** Revoke a certificate, or revoke it and issue a replacement with a new number. A reason is always required. */
export async function certificateAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runForm(formData, async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(certificateSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { id, reason, mode } = parsed.data;
    const db = await database();
    if (mode === "replace") await replaceCertificate(db, viewer, id, reason);
    else await revokeCertificate(db, viewer, id, reason);
    refresh();
    return { ok: true };
  });
}

/* ---------------- Inquiries ---------------- */

const inquirySchema = z.object({ id: idField, handled: z.enum(["0", "1"]) });

export async function setInquiryHandledAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await adminViewer();
    const parsed = parseForm(inquirySchema, formData);
    if ("state" in parsed) return { ok: false, error: "unexpected" };
    await setInquiryHandled(await database(), viewer, parsed.data.id, parsed.data.handled === "1");
    refresh();
  });
}
