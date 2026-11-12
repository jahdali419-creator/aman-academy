import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listCoursesAdmin, listInstructorsAdmin } from "@/server/services/admin";
import { getSessionForDelivery } from "@/server/services/instructor";
import { markAttendanceAction } from "@/server/actions/admin";
import { formatDate, formatTimeRange, pick } from "@/lib/format";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/ui/form";
import { Alert, Badge, Card, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";
import { BackLink } from "@/components/admin/back-link";
import { SessionForm } from "@/components/admin/session-form";
import { attendanceTone, progressTone, sessionTone } from "@/components/admin/tones";

export const dynamic = "force-dynamic";

export default async function AdminEditSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ locale, id }, { created }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, tc, ts, db] = await Promise.all([getTranslations("admin"), getTranslations("common"), getTranslations("status"), database()]);
  const [data, courses, instructors] = await Promise.all([getSessionForDelivery(db, viewer, id), listCoursesAdmin(db, viewer), listInstructorsAdmin(db, viewer)]);
  if (!data) notFound();
  const { session, course, roster } = data;
  const started = session.startsAt <= new Date();

  return (
    <>
      <BackLink href="/admin/sessions">{t("sessions.back")}</BackLink>
      <PageHeader
        eyebrow={<Ltr>{course.code}</Ltr>}
        title={pick(locale, course.titleEn, course.titleAr)}
        lead={
          <>
            {formatDate(session.startsAt, locale)} · {formatTimeRange(session.startsAt, session.endsAt, locale)} · {tc("time.zone")}
          </>
        }
        actions={<Badge tone={sessionTone(session.status)}>{ts(`session.${session.status}`)}</Badge>}
      />
      {created ? (
        <Alert tone="success" role="status">
          {t("sessions.created")}
        </Alert>
      ) : null}

      <SessionForm session={session} courses={courses} instructors={instructors} />

      <section aria-labelledby="roster" className="space-y-4">
        <div>
          <h2 id="roster" className="text-lg font-semibold text-navy-900">
            {t("roster.title", { count: roster.length })}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("roster.lead", { percent: course.minAttendancePercent })}</p>
        </div>
        {roster.length === 0 ? (
          <EmptyState icon={<Users aria-hidden className="size-5" />} title={t("roster.empty.title")}>
            {t("roster.empty.body")}
          </EmptyState>
        ) : (
          <>
            <Alert tone="info">{started ? t("roster.auditNote") : t("roster.notStarted")}</Alert>
            <ul className="space-y-4">
              {roster.map((r) => (
                <li key={r.enrollmentId}>
                  <Card className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900">{pick(locale, r.name, r.nameAr)}</p>
                        {r.nameAr ? <p className="mt-0.5 text-xs text-muted">{pick(locale === "ar" ? "en" : "ar", r.name, r.nameAr)}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={attendanceTone(r.attendance?.status)} className="whitespace-nowrap">
                          {r.attendance ? (
                            <>
                              {ts(`attendance.${r.attendance.status}`)} · <Ltr>{r.attendance.percent}%</Ltr>
                            </>
                          ) : (
                            ts("attendance.pending")
                          )}
                        </Badge>
                        <Badge tone={progressTone(r.status)}>{ts(`progress.${r.status}`)}</Badge>
                      </div>
                    </div>
                    {r.reason ? <p className="mt-2 text-sm text-red-700">{ts(`reason.${r.reason}`)}</p> : null}
                    {started ? (
                      <ActionForm action={markAttendanceAction} className="mt-5 border-t border-line pt-5">
                        <input type="hidden" name="enrollmentId" value={r.enrollmentId} />
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-start">
                          <SelectField name="status" label={t("roster.status")} defaultValue={r.attendance?.status ?? "present"}>
                            <option value="present">{ts("attendance.present")}</option>
                            <option value="partial">{ts("attendance.partial")}</option>
                            <option value="absent">{ts("attendance.absent")}</option>
                          </SelectField>
                          <Field
                            name="percent"
                            label={t("roster.percent")}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={100}
                            dir="ltr"
                            defaultValue={r.attendance?.percent ?? 100}
                          />
                          <Field name="note" label={t("roster.note")} maxLength={300} optional />
                          <div className="lg:pt-7">
                            <SubmitButton variant="secondary">{r.attendance ? t("roster.update") : t("roster.record")}</SubmitButton>
                          </div>
                        </div>
                      </ActionForm>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
