import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, ChevronLeft, CircleAlert, Lock, Video } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { requireViewer } from "@/server/auth/session";
import { getJoinDetails, loadProgress, meetsAttendance } from "@/server/services/enrollment";
import { formatDate, formatDateTime, formatTimeRange, pick } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Alert, Card, DataTable, DefinitionRow, Ltr } from "@/components/ui/primitives";
import { ProgressBadge } from "@/components/site/progress-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function EnrollmentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/dashboard/enrollments/${id}`);
  const db = await database();
  // Scoped to the viewer's own enrollments: another learner's id simply is not found.
  const r = (await loadProgress(db, { userId: viewer.id })).find((x) => x.enrollment.id === id && x.enrollment.status === "active");
  if (!r) notFound();
  const [t, td, ts, tc, join] = await Promise.all([getTranslations("dashboard"), getTranslations("dashboard.detail"), getTranslations("status"), getTranslations("common"), getJoinDetails(db, viewer, r.session.id)]);

  const attended = meetsAttendance(r.attendance, r.course.minAttendancePercent);
  const passed = r.attempts.some((a) => a.passed);
  const ended = r.session.endsAt < new Date();
  type State = "done" | "current" | "locked" | "issue";
  const steps: { title: string; body: string; state: State; action?: React.ReactNode }[] = [
    {
      title: td("step.attendance"),
      body: r.attendance ? td("step.attendanceGot", { status: ts(`attendance.${r.attendance.status}`), percent: r.attendance.percent }) : td("step.attendanceNeed", { percent: r.course.minAttendancePercent }),
      state: attended ? "done" : r.attendance ? "issue" : "current",
    },
    {
      title: td("step.exam"),
      body: !attended ? td("step.examLocked") : r.exam ? td("step.examNeed", { pass: r.exam.passingScorePercent, max: r.exam.maxAttempts }) : "—",
      state: passed ? "done" : !attended ? "locked" : r.progress.reason === "no_attempts_left" ? "issue" : "current",
      action:
        r.progress.status === "exam_available" || r.progress.status === "exam_in_progress" ? (
          <ButtonLink href={`/exam/${r.enrollment.id}`} size="sm">{r.progress.status === "exam_in_progress" ? t("actions.continueExam") : t("actions.startExam")}</ButtonLink>
        ) : undefined,
    },
    {
      title: td("step.certificate"),
      body: r.certificate?.status === "valid" ? r.certificate.number : td("step.certificateNeed"),
      state: r.certificate?.status === "valid" ? "done" : r.certificate?.status === "revoked" ? "issue" : "locked",
      action: r.certificate?.status === "valid" ? <ButtonLink href={`/certificates/${r.certificate.number}`} size="sm" variant="light">{t("actions.certificate")}</ButtonLink> : undefined,
    },
  ];
  const stateUi: Record<State, { cls: string; icon: React.ReactNode; label: string }> = {
    done: { cls: "bg-emerald-600 text-white", icon: <Check aria-hidden className="size-4" />, label: td("step.done") },
    current: { cls: "bg-navy-900 text-emerald-300", icon: <span aria-hidden className="size-2 rounded-full bg-emerald-300" />, label: td("step.current") },
    locked: { cls: "bg-paper-2 text-muted", icon: <Lock aria-hidden className="size-3.5" />, label: td("step.locked") },
    issue: { cls: "bg-red-700 text-white", icon: <CircleAlert aria-hidden className="size-4" />, label: td("step.issue") },
  };

  return (
    <>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900">
        <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
        {td("back")}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold text-navy-900">{pick(locale, r.course.titleEn, r.course.titleAr)}</h1>
        <ProgressBadge status={r.progress.status} />
      </div>
      {r.progress.reason ? (
        <Alert tone="danger" className="mt-5">
          {ts(`reason.${r.progress.reason}`)}{" "}
          <Link href="/contact" className="font-semibold underline underline-offset-4">{t("actions.contact")}</Link>
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <Card className="p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-900">
            <Video aria-hidden className="size-5 text-emerald-600" />
            {td("joinTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{td("joinLead")}</p>
          <dl className="mt-4 divide-y divide-line">
            <DefinitionRow label={td("when")}>
              {formatDate(join.startsAt, locale)}
              <span className="block text-sm font-normal text-muted"><bdi>{formatTimeRange(join.startsAt, join.endsAt, locale)}</bdi> · {tc("time.zone")}</span>
            </DefinitionRow>
            <DefinitionRow label={tc("teaching.label")}>{tc(`teaching.${r.session.language}`)}</DefinitionRow>
            {join.instructor ? <DefinitionRow label={td("instructor")}>{pick(locale, join.instructor.nameEn, join.instructor.nameAr)}</DefinitionRow> : null}
          </dl>
          <div className="mt-5">
            {ended ? (
              <Alert tone="neutral">{td("joinEnded")}</Alert>
            ) : join.joinUrl ? (
              <a href={join.joinUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
                <Video aria-hidden className="size-4.5" />
                {td("joinButton", { provider: tc(`provider.${join.provider}`) })}
              </a>
            ) : (
              <Alert tone="info">{td("joinPending")}</Alert>
            )}
          </div>
          {pick(locale, join.joinInstructionsEn, join.joinInstructionsAr) ? (
            <div className="mt-6 rounded-2xl bg-paper p-5">
              <h3 className="text-sm font-semibold text-navy-900">{td("instructions")}</h3>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-navy-800">{pick(locale, join.joinInstructionsEn, join.joinInstructionsAr)}</p>
            </div>
          ) : null}
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-navy-900">{td("requirements")}</h2>
          <ol className="mt-5 space-y-5">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-4">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", stateUi[s.state].cls)}>{stateUi[s.state].icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{s.title} <span className="sr-only">— {stateUi[s.state].label}</span></p>
                  <p className="mt-0.5 text-sm text-muted"><bdi>{s.body}</bdi></p>
                  {s.action ? <div className="mt-3">{s.action}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-navy-900">{td("attempts")}</h2>
        {r.attempts.length === 0 ? (
          <p className="mt-3 text-muted">{td("noAttempts")}</p>
        ) : (
          <div className="mt-4">
            <DataTable caption={td("attempts")} head={["#", td("date"), td("score"), td("result"), ""]}>
              {r.attempts.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{td("attemptN", { n: a.attemptNumber })}</td>
                  <td>{a.submittedAt ? formatDateTime(a.submittedAt, locale) : ts(`attempt.${a.status}`)}</td>
                  <td><Ltr>{a.scorePercent !== null ? `${a.scorePercent}%` : "—"}</Ltr></td>
                  <td>{a.status === "in_progress" ? ts("attempt.in_progress") : a.passed ? td("passed") : td("notPassed")}</td>
                  <td className="text-end">
                    <Link href={a.status === "in_progress" ? `/exam/attempt/${a.id}` : `/exam/attempt/${a.id}/result`} className="font-semibold text-emerald-700 hover:underline">{tc("actions.view")}</Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        )}
      </section>
    </>
  );
}
