import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, ListChecks, RotateCcw, Target } from "lucide-react";
import { database } from "@/server/db/client";
import { config } from "@/server/config";
import { requireViewer } from "@/server/auth/session";
import { startExamAction } from "@/server/actions/exam";
import { getExamOverview } from "@/server/services/exams";
import { formatDateTime, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/form";
import { Alert, Card, Eyebrow, Ltr } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "exam" }))("meta"), robots: { index: false } };
}

export default async function ExamOverviewPage({ params }: { params: Promise<{ locale: string; enrollmentId: string }> }) {
  const { locale, enrollmentId } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/exam/${enrollmentId}`);
  const data = await getExamOverview(await database(), viewer, enrollmentId);
  if (!data) notFound();
  const t = await getTranslations("exam.overview");
  const { eligibility: e, exam } = data;
  const canStart = e.code === "ok" || e.code === "in_progress";
  const blocked = !canStart ? (e.code as Exclude<typeof e.code, "ok" | "in_progress">) : null;
  const facts = exam
    ? ([
        [ListChecks, t("questions"), String(exam.questionsPerAttempt)],
        [Clock, t("duration"), t("minutes", { n: exam.durationMinutes })],
        [Target, t("pass"), `${exam.passingScorePercent}%`],
        [RotateCcw, t("attempts"), t("attemptsValue", { used: e.attemptsUsed, max: e.maxAttempts })],
      ] as const)
    : [];

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <Eyebrow>{t("eyebrow")} · <Ltr>{data.course.code}</Ltr></Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold text-navy-900 sm:text-4xl">{pick(locale, data.course.titleEn, data.course.titleAr)}</h1>

      {facts.length ? (
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map(([Icon, label, value]) => (
            <Card key={label} className="p-4">
              <Icon aria-hidden className="size-5 text-emerald-600" />
              <dt className="mt-3 text-xs text-muted">{label}</dt>
              <dd className="font-display text-lg font-semibold text-navy-900"><bdi>{value}</bdi></dd>
            </Card>
          ))}
        </dl>
      ) : null}

      {blocked ? (
        <Alert tone={blocked === "already_passed" ? "success" : "warning"} title={t(`blocked.${blocked}.title`)} className="mt-8">
          {t(`blocked.${blocked}.body`, { date: e.availableAt ? formatDateTime(e.availableAt, locale) : "" })}
        </Alert>
      ) : (
        <Card className="mt-8 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-navy-900">{t("rules")}</h2>
          <ul className="mt-4 list-disc space-y-2.5 ps-5 leading-relaxed text-navy-800 marker:text-emerald-600">
            {(t.raw("points") as string[]).map((p) => <li key={p}>{p}</li>)}
          </ul>
          {config.demoMode ? <Alert tone="warning" className="mt-6">{t("sampleNote")}</Alert> : null}
        </Card>
      )}

      <div className="mt-8 flex flex-wrap items-start gap-3">
        {canStart ? (
          <ActionButton action={startExamAction} fields={{ enrollmentId }} variant="primary" size="lg">
            {e.code === "in_progress" ? t("resume") : t("start")}
          </ActionButton>
        ) : null}
        <ButtonLink href="/dashboard" variant="light" size="lg">{t("back")}</ButtonLink>
      </div>
    </div>
  );
}
