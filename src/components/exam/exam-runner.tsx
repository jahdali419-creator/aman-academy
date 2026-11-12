"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Clock, CloudOff, Flag, Loader2, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { saveAnswerAction, submitExamAction } from "@/server/actions/exam";
import type { TakingQuestion } from "@/server/services/exams";
import { cn } from "@/lib/cn";
import { Alert, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

type Props = {
  attemptId: string;
  attemptNumber: number;
  courseTitle: string;
  questions: TakingQuestion[];
  initialAnswers: Record<string, string>;
  expiresAt: string;
  serverNow: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The exam as taken in the browser.
 * - Receives questions WITHOUT correct answers; scoring happens on the server.
 * - Every choice is saved to the server immediately, with automatic retry.
 * - A copy of unsaved choices is kept in sessionStorage so a refresh or a
 *   dropped connection does not lose work. The server clock is authoritative.
 */
export function ExamRunner({ attemptId, attemptNumber, courseTitle, questions, initialAnswers, expiresAt, serverNow }: Props) {
  const t = useTranslations("exam.taking");
  const locale = useLocale();
  const router = useRouter();
  const storageKey = `aman-exam-${attemptId}`;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [unsynced, setUnsynced] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(0);
  const [online, setOnline] = useState(true);
  const [altLang, setAltLang] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [announce, setAnnounce] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const submitted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // Clock offset so the countdown follows the server, not the device clock.
  const offset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const deadline = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((deadline - (Date.now() + offset)) / 1000)));

  const goResult = useCallback(() => router.replace(`/exam/attempt/${attemptId}/result`), [router, attemptId]);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await submitExamAction(attemptId, answersRef.current);
      if (res.ok || res.error === "exam_closed") {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
        goResult();
        return;
      }
      throw new Error(res.error);
    } catch {
      submitted.current = false;
      setSubmitting(false);
      setSubmitError(true);
    }
  }, [attemptId, goResult, storageKey]);

  // Restore choices that were made but not yet saved (refresh / lost connection).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const pending = JSON.parse(raw) as Record<string, string>;
        const valid = Object.fromEntries(Object.entries(pending).filter(([q, o]) => questions.some((x) => x.id === q && x.options.some((y) => y.id === o))));
        if (Object.keys(valid).length) {
          setAnswers((a) => ({ ...a, ...valid }));
          setUnsynced(valid);
        }
      }
    } catch {}
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (Object.keys(unsynced).length) sessionStorage.setItem(storageKey, JSON.stringify(unsynced));
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }, [unsynced, storageKey]);

  const push = useCallback(
    async (questionId: string, optionId: string) => {
      setSaving((n) => n + 1);
      try {
        const res = await saveAnswerAction(attemptId, questionId, optionId);
        if (res.ok) {
          setUnsynced((u) => {
            if (u[questionId] !== optionId) return u;
            const { [questionId]: _done, ...rest } = u;
            void _done;
            return rest;
          });
        } else if (res.error === "exam_closed") {
          goResult();
        }
      } catch {
        // Network failure: stays in `unsynced` and is retried below.
      } finally {
        setSaving((n) => n - 1);
      }
    },
    [attemptId, goResult],
  );

  // Retry unsaved answers every few seconds and when the connection returns.
  const unsyncedRef = useRef(unsynced);
  unsyncedRef.current = unsynced;
  useEffect(() => {
    const retry = () => {
      if (!navigator.onLine) return;
      for (const [q, o] of Object.entries(unsyncedRef.current)) void push(q, o);
    };
    const id = window.setInterval(retry, 6000);
    window.addEventListener("online", retry);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", retry);
    };
  }, [push]);

  // Countdown.
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((deadline - (Date.now() + offset)) / 1000));
      setLeft(s);
      if (s === 300 || s === 60) setAnnounce(t("timeAnnounce", { minutes: s / 60 }));
      if (s === 0) {
        setTimeUp(true);
        dialog.current?.close();
        void submit();
      }
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline, offset, submit, t]);

  // Warn before leaving only while something is still unsaved.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(unsyncedRef.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const q = questions[index];
  const total = questions.length;
  const answeredCount = questions.filter((x) => answers[x.id]).length;
  const unansweredCount = total - answeredCount;
  const showAr = (locale === "ar") !== altLang;
  const low = left <= 60;
  const hasUnsynced = Object.keys(unsynced).length > 0;

  const choose = (optionId: string) => {
    if (timeUp || submitting) return;
    setAnswers((a) => ({ ...a, [q.id]: optionId }));
    setUnsynced((u) => ({ ...u, [q.id]: optionId }));
    void push(q.id, optionId);
  };
  const go = (i: number) => {
    setIndex(Math.min(total - 1, Math.max(0, i)));
    requestAnimationFrame(() => heading.current?.focus());
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div className="min-w-0">
        <header className="sticky top-[4.25rem] z-30 -mx-5 flex items-center justify-between gap-4 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:px-5 sm:shadow-soft">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-900">{courseTitle}</p>
            <p className="text-xs text-muted">
              {t("attempt", { n: attemptNumber })} · {t("progress", { answered: answeredCount, total })}
            </p>
          </div>
          <div role="timer" aria-label={t("timeLeft")} className={cn("flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-lg font-semibold tabular-nums", low ? "bg-red-50 text-red-700" : "bg-navy-900 text-white")}>
            <Clock aria-hidden className="size-4" />
            <bdi dir="ltr">{pad(Math.floor(left / 60))}:{pad(left % 60)}</bdi>
          </div>
        </header>
        <p aria-live="polite" className="sr-only">{announce}</p>

        {!online ? (
          <Alert tone="warning" role="status" className="mt-4">
            <span className="inline-flex items-center gap-2"><CloudOff aria-hidden className="size-4" />{t("offline")}</span>
          </Alert>
        ) : null}
        {timeUp ? <Alert tone="info" role="status" className="mt-4">{t("timeUp")}</Alert> : null}
        {submitError ? <Alert tone="danger" role="alert" className="mt-4">{t("submitError")}</Alert> : null}

        <section className="mt-5 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8" aria-labelledby="q-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="q-h" ref={heading} tabIndex={-1} className="text-sm font-semibold text-emerald-700 outline-none">
              {t("question", { n: index + 1, total })}
            </h2>
            <div className="flex items-center gap-2">
              {q.isSample ? <Badge tone="warning">{t("sample")}</Badge> : null}
              <button type="button" onClick={() => setAltLang((v) => !v)} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-navy-700 hover:bg-paper-2" lang={showAr ? "en" : "ar"}>
                {altLang ? t("showOriginal") : t("showOther")}
              </button>
            </div>
          </div>

          <fieldset className="mt-4" lang={showAr ? "ar" : "en"} dir={showAr ? "rtl" : "ltr"} disabled={timeUp || submitting}>
            <legend className="text-xl font-semibold leading-relaxed text-navy-900 sm:text-2xl">{showAr ? q.textAr : q.textEn}</legend>
            <p className="mt-2 text-sm text-muted" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>{t("chooseOne")}</p>
            <div className="mt-5 space-y-3">
              {q.options.map((o) => {
                const checked = answers[q.id] === o.id;
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600",
                      checked ? "border-emerald-600 bg-emerald-50" : "border-line-strong bg-white hover:border-navy-300 hover:bg-paper",
                    )}
                  >
                    <input type="radio" name={`q-${q.id}`} value={o.id} checked={checked} onChange={() => choose(o.id)} className="mt-1 size-5 shrink-0 accent-emerald-600 focus:outline-none" />
                    <span className="text-[1.05rem] leading-relaxed text-navy-900">{showAr ? o.ar : o.en}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={flagged.has(q.id)}
              onClick={() =>
                setFlagged((f) => {
                  const n = new Set(f);
                  if (n.has(q.id)) n.delete(q.id);
                  else n.add(q.id);
                  return n;
                })
              }
            >
              <Flag aria-hidden className={cn("size-4", flagged.has(q.id) && "fill-amber-700 text-amber-700")} />
              {flagged.has(q.id) ? t("unflag") : t("flag")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => go(index - 1)} disabled={index === 0}>
                <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
                {t("previous")}
              </Button>
              {index < total - 1 ? (
                <Button type="button" variant="secondary" onClick={() => go(index + 1)}>
                  {t("next")}
                  <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
                </Button>
              ) : (
                <Button type="button" onClick={() => dialog.current?.showModal()} disabled={submitting}>{t("submit")}</Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="rounded-3xl border border-line bg-white p-5 shadow-soft lg:sticky lg:top-28">
        <nav aria-label={t("navigator")}>
          <h2 className="text-sm font-semibold text-navy-900">{t("navigator")}</h2>
          <ol className="mt-4 grid grid-cols-5 gap-2">
            {questions.map((x, i) => {
              const done = !!answers[x.id];
              const mark = flagged.has(x.id);
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`${t("navItem", { n: i + 1 })}, ${done ? t("answered") : t("unanswered")}${mark ? `, ${t("flagged")}` : ""}`}
                    className={cn(
                      "relative grid h-11 w-full place-items-center rounded-xl border text-sm font-semibold transition-colors",
                      done ? "border-emerald-600 bg-emerald-600 text-white" : "border-line-strong bg-white text-navy-800 hover:bg-paper-2",
                      i === index && "ring-2 ring-navy-900 ring-offset-2",
                    )}
                  >
                    {i + 1}
                    {mark ? <span aria-hidden className="absolute -end-1 -top-1 size-3 rounded-full border-2 border-white bg-amber-700" /> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <ul aria-hidden className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-600" />{t("legendAnswered")}</li>
          <li className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-amber-700" />{t("legendFlagged")}</li>
          <li className="inline-flex items-center gap-1.5"><span className="size-3 rounded ring-2 ring-navy-900" />{t("legendCurrent")}</li>
        </ul>
        <p role="status" className={cn("mt-5 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium", hasUnsynced ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
          {saving > 0 ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : hasUnsynced ? <CloudOff aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}
          {saving > 0 ? t("saving") : hasUnsynced ? t("unsynced") : t("saved")}
        </p>
        <Button type="button" className="mt-4 w-full" onClick={() => dialog.current?.showModal()} disabled={submitting}>
          {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </aside>

      <dialog ref={dialog} aria-labelledby="confirm-h" className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-line bg-white p-0 text-start shadow-lift backdrop:bg-navy-950/60">
        <div className="p-7">
          <h2 id="confirm-h" className="text-xl font-semibold text-navy-900">{t("confirmTitle")}</h2>
          <p className={cn("mt-3 rounded-xl px-3 py-2 text-sm font-semibold", unansweredCount ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
            {unansweredCount ? t("confirmUnanswered", { count: unansweredCount }) : t("confirmAll")}
          </p>
          <p className="mt-3 text-sm text-muted">{t("confirmBody")}</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="light" onClick={() => dialog.current?.close()} autoFocus>{t("confirmCancel")}</Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => {
                dialog.current?.close();
                void submit();
              }}
            >
              {t("confirmSubmit")}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
