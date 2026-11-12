import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { and, eq } from "drizzle-orm";
import { PartyPopper, RotateCcw } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { certificates } from "@/server/db/schema";
import { requireViewer } from "@/server/auth/session";
import { getAttemptForTaking, getAttemptResult } from "@/server/services/exams";
import { formatDateTime, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "exam" }))("result.meta"), robots: { index: false } };
}

export default async function ResultPage({ params }: { params: Promise<{ locale: string; attemptId: string }> }) {
  const { locale, attemptId } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/exam/attempt/${attemptId}/result`);
  const db = await database();
  const state = await getAttemptForTaking(db, viewer, attemptId);
  if (!state) notFound();
  if (state.status === "in_progress") return redirect({ href: `/exam/attempt/${attemptId}`, locale });
  const r = await getAttemptResult(db, viewer, attemptId);
  if (!r) notFound();
  const t = await getTranslations("exam.result");
  const [cert] = r.passed
    ? await db.select({ number: certificates.number }).from(certificates).where(and(eq(certificates.enrollmentId, r.enrollmentId), eq(certificates.status, "valid"))).limit(1)
    : [];
  const course = pick(locale, r.course.titleEn, r.course.titleAr);
  const left = Math.max(0, r.eligibility.maxAttempts - r.eligibility.attemptsUsed);
  const canRetake = !r.passed && r.eligibility.code === "ok";

  return (
    <div className="container-page max-w-2xl py-12 sm:py-16">
      <article role="status" className="overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
        <header className={`px-8 py-10 text-center text-white ${r.passed ? "bg-emerald-600" : "bg-navy-900 bg-weave"}`}>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/15">
            {r.passed ? <PartyPopper aria-hidden className="size-7" /> : <RotateCcw aria-hidden className="size-7" />}
          </span>
          <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">{r.passed ? t("passedTitle") : t("failedTitle")}</h1>
          <p className="mt-2 text-white/85">{r.passed ? t("passedBody", { course }) : t("failedBody", { course })}</p>
        </header>
        <div className="px-8 py-8">
          <div className="flex flex-wrap items-end justify-center gap-x-10 gap-y-4 text-center">
            <div>
              <p className="text-sm text-muted">{t("score")}</p>
              <p className="font-display text-6xl font-semibold text-navy-900"><bdi dir="ltr">{r.scorePercent}%</bdi></p>
            </div>
            <div className="pb-2 text-sm text-muted">
              <p>{t("correct", { correct: r.correctCount, total: r.totalQuestions })}</p>
              <p>{t("passMark", { pass: r.passingScorePercent })} · {t("attempt", { n: r.attemptNumber })}</p>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-paper-2" aria-hidden>
            <div className={`h-full rounded-full ${r.passed ? "bg-emerald-600" : "bg-navy-600"}`} style={{ width: `${r.scorePercent}%` }} />
          </div>
          {r.status === "expired" ? <Alert tone="warning" className="mt-6">{t("expiredNote")}</Alert> : null}

          <h2 className="mt-8 text-lg font-semibold text-navy-900">{t("next")}</h2>
          <p className="mt-2 leading-relaxed text-navy-800">
            {r.passed
              ? cert
                ? t("nextCertificate")
                : t("nextCertificatePending")
              : canRetake
                ? t("nextRetake", { left })
                : r.eligibility.code === "cooldown" && r.eligibility.availableAt
                  ? t("nextCooldown", { date: formatDateTime(r.eligibility.availableAt, locale) })
                  : t("nextNone")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {cert ? <ButtonLink href={`/certificates/${cert.number}`} size="lg">{t("viewCertificate")}</ButtonLink> : null}
            {canRetake ? <ButtonLink href={`/exam/${r.enrollmentId}`} size="lg">{t("retake")}</ButtonLink> : null}
            {!r.passed && !canRetake && r.eligibility.code !== "cooldown" ? <ButtonLink href="/contact" size="lg" variant="secondary">{t("contact")}</ButtonLink> : null}
            <ButtonLink href="/dashboard" size="lg" variant="light">{t("back")}</ButtonLink>
          </div>
          <p className="mt-6 text-xs text-muted">{t("noAnswers")}</p>
        </div>
      </article>
    </div>
  );
}
