import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BookOpen, Building2, CalendarDays, ClipboardCheck, GraduationCap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { requireViewer } from "@/server/auth/session";
import { loadProgress, type ProgressRow } from "@/server/services/enrollment";
import { formatDate, formatTimeRange, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Ltr } from "@/components/ui/primitives";
import { CourseIcon } from "@/components/site/course-icon";
import { ProgressBadge } from "@/components/site/progress-badge";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "dashboard" }))("meta"), robots: { index: false } };
}

const priority = ["exam_in_progress", "exam_available", "session_upcoming", "attendance_pending", "action_required", "passed"] as const;

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, "/dashboard");
  const [t, ts, tc] = await Promise.all([getTranslations("dashboard"), getTranslations("status"), getTranslations("common")]);
  const rows = (await loadProgress(await database(), { userId: viewer.id })).filter((r) => r.enrollment.status === "active");
  const title = (r: ProgressRow) => pick(locale, r.course.titleEn, r.course.titleAr);

  /** The single most useful action for one enrollment. */
  const actionFor = (r: ProgressRow) => {
    const s = r.progress.status;
    if (s === "exam_in_progress") return { href: `/exam/${r.enrollment.id}`, label: t("actions.continueExam"), primary: true };
    if (s === "exam_available") return { href: `/exam/${r.enrollment.id}`, label: t("actions.startExam"), primary: true };
    if (s === "session_upcoming") return { href: `/dashboard/enrollments/${r.enrollment.id}`, label: t("actions.joining"), primary: true };
    if (s === "passed" && r.certificate?.status === "valid") return { href: `/certificates/${r.certificate.number}`, label: t("actions.certificate"), primary: false };
    return { href: `/dashboard/enrollments/${r.enrollment.id}`, label: t("actions.details"), primary: false };
  };

  // Soonest upcoming session first; otherwise by priority of status.
  const next = priority
    .map((p) => rows.filter((r) => r.progress.status === p).sort((a, b) => +a.session.startsAt - +b.session.startsAt)[0])
    .find(Boolean);

  return (
    <>
      <h1 className="text-3xl font-semibold text-navy-900 sm:text-4xl">{t("greeting", { name: pick(locale, viewer.name, viewer.nameAr).split(" ")[0] })}</h1>
      <p className="mt-2 text-muted">{t("lead")}</p>

      {next ? (
        <section aria-labelledby="next-h" className="mt-8 overflow-hidden rounded-3xl bg-navy-900 bg-weave p-7 text-white shadow-lift sm:p-9">
          <p id="next-h" className="text-sm font-semibold text-emerald-300">{t("next.label")}</p>
          <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">{t(`next.${next.progress.status as (typeof priority)[number]}.title`)}</h2>
              <p className="mt-2 text-navy-100">{t(`next.${next.progress.status as (typeof priority)[number]}.body`, { course: title(next), date: formatDate(next.session.startsAt, locale) })}</p>
            </div>
            <ButtonLink href={actionFor(next).href} size="lg" className="shrink-0">
              {actionFor(next).label}
              <ArrowRight aria-hidden className="size-4.5 rtl:-scale-x-100" />
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="enr-h">
        <h2 id="enr-h" className="text-xl font-semibold text-navy-900">{t("enrollments")}</h2>
        {rows.length === 0 ? (
          <div className="mt-5">
            <EmptyState icon={<BookOpen aria-hidden className="size-6" />} title={t("empty.title")} action={<ButtonLink href="/courses">{t("actions.browse")}</ButtonLink>}>
              {t("empty.body")}
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {rows.map((r) => {
              const a = actionFor(r);
              const best = r.attempts.reduce<number | null>((m, x) => (x.scorePercent === null ? m : Math.max(m ?? 0, x.scorePercent)), null);
              return (
                <li key={r.enrollment.id} className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <CourseIcon name={r.course.icon} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className="text-lg font-semibold text-navy-900">
                          <Link href={`/dashboard/enrollments/${r.enrollment.id}`} className="hover:underline">{title(r)}</Link>
                        </h3>
                        <ProgressBadge status={r.progress.status} />
                      </div>
                      {r.progress.reason ? <p className="mt-1 text-sm font-medium text-red-700">{ts(`reason.${r.progress.reason}`)}</p> : null}
                      <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                        <div className="flex gap-2.5">
                          <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <div>
                            <dt className="text-muted">{t("row.session")}</dt>
                            <dd className="font-medium text-navy-900">{formatDate(r.session.startsAt, locale)}</dd>
                            <dd className="text-xs text-muted"><bdi>{formatTimeRange(r.session.startsAt, r.session.endsAt, locale)}</bdi> · {tc("time.zoneShort")}</dd>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <ClipboardCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <div>
                            <dt className="text-muted">{t("row.attendance")}</dt>
                            <dd className="font-medium text-navy-900">{r.attendance ? `${ts(`attendance.${r.attendance.status}`)} · ${r.attendance.percent}%` : ts("attendance.pending")}</dd>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <GraduationCap aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <div>
                            <dt className="text-muted">{t("row.exam")}</dt>
                            <dd className="font-medium text-navy-900">{r.exam ? (r.attempts.length ? t("row.attempts", { used: r.attempts.length, max: r.exam.maxAttempts }) : t("row.notStarted")) : "—"}</dd>
                            {best !== null ? <dd className="text-xs text-muted">{t("row.bestScore", { score: best })}</dd> : null}
                          </div>
                        </div>
                      </dl>
                      {r.certificate?.status === "valid" ? (
                        <p className="mt-4 text-sm text-muted">{t("row.certificate")}: <Ltr className="font-mono font-semibold text-navy-900">{r.certificate.number}</Ltr></p>
                      ) : null}
                      {r.enrollment.orgId ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted"><Building2 aria-hidden className="size-3.5" />{t("row.sponsored")}</p> : null}
                    </div>
                    <ButtonLink href={a.href} variant={a.primary ? "primary" : "light"} size="sm" className="shrink-0 self-start">{a.label}</ButtonLink>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
