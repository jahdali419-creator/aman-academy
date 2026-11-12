import { getTranslations, setRequestLocale } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listEnrollmentsAdmin, listSessionsAdmin } from "@/server/services/admin";
import { adminEnrollAction, cancelEnrollmentAction } from "@/server/actions/admin";
import { formatDate, formatTime, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton, ActionForm, Field, SelectField, SubmitButton } from "@/components/ui/form";
import { Badge, Card, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";
import { attendanceTone, progressTone } from "@/components/admin/tones";

export const dynamic = "force-dynamic";

export default async function AdminEnrollmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, ts, db] = await Promise.all([getTranslations("admin"), getTranslations("status"), database()]);
  const [rows, sessions] = await Promise.all([listEnrollmentsAdmin(db, viewer), listSessionsAdmin(db, viewer)]);
  const now = new Date();
  const open = sessions.filter((s) => s.session.status === "scheduled" && s.session.startsAt > now).reverse();

  return (
    <>
      <PageHeader title={t("enrollments.title")} lead={t("enrollments.lead")} />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("enrollments.enrol.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("enrollments.enrol.lead")}</p>
        {open.length === 0 ? (
          <p className="mt-5 text-sm text-muted">
            {t("enrollments.enrol.noSessions")}{" "}
            <ButtonLink href="/admin/sessions/new" variant="ghost" size="sm">
              {t("sessions.new")}
            </ButtonLink>
          </p>
        ) : (
          <ActionForm action={adminEnrollAction} successText={t("enrollments.enrol.success")} className="mt-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_auto] lg:items-start">
              <Field name="email" label={t("enrollments.enrol.email")} hint={t("enrollments.enrol.emailHint")} type="email" inputMode="email" dir="ltr" autoComplete="off" />
              <SelectField name="sessionId" label={t("enrollments.enrol.session")} defaultValue="">
                <option value="" disabled>
                  {t("enrollments.enrol.chooseSession")}
                </option>
                {open.map((s) => (
                  <option key={s.session.id} value={s.session.id}>
                    {s.courseCode} · {pick(locale, s.courseTitleEn, s.courseTitleAr)} · {formatDate(s.session.startsAt, locale)} {formatTime(s.session.startsAt, locale)} ({s.enrolled}/
                    {s.session.maxSeats})
                  </option>
                ))}
              </SelectField>
              <div className="lg:pt-7">
                <SubmitButton>{t("enrollments.enrol.submit")}</SubmitButton>
              </div>
            </div>
          </ActionForm>
        )}
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={<GraduationCap aria-hidden className="size-5" />} title={t("enrollments.empty.title")}>
          {t("enrollments.empty.body")}
        </EmptyState>
      ) : (
        <DataTable
          caption={t("enrollments.title")}
          head={[
            t("enrollments.col.learner"),
            t("enrollments.col.course"),
            t("enrollments.col.session"),
            t("enrollments.col.attendance"),
            t("enrollments.col.progress"),
            t("enrollments.col.certificate"),
            t("shared.actions"),
          ]}
        >
          {rows.map((r) => (
            <tr key={r.enrollment.id}>
              <td>
                <p className="font-semibold text-navy-900">{pick(locale, r.learner.name, r.learner.nameAr)}</p>
                <Ltr className="mt-0.5 text-xs text-muted">{r.learner.email}</Ltr>
              </td>
              <td>
                <p className="text-navy-900">{pick(locale, r.course.titleEn, r.course.titleAr)}</p>
                <Ltr className="mt-0.5 font-mono text-xs text-muted">{r.course.code}</Ltr>
              </td>
              <td className="whitespace-nowrap">
                <p>{formatDate(r.session.startsAt, locale)}</p>
                <p className="mt-0.5 text-xs text-muted">{formatTime(r.session.startsAt, locale)}</p>
              </td>
              <td>
                <Badge tone={attendanceTone(r.attendance?.status)} className="whitespace-nowrap">
                  {r.attendance ? (
                    <>
                      {ts(`attendance.${r.attendance.status}`)} · <Ltr>{r.attendance.percent}%</Ltr>
                    </>
                  ) : (
                    ts("attendance.pending")
                  )}
                </Badge>
              </td>
              <td>
                <Badge tone={progressTone(r.progress.status)} className="whitespace-nowrap">{ts(`progress.${r.progress.status}`)}</Badge>
                {r.progress.reason ? <p className="mt-1.5 max-w-52 text-xs text-muted">{ts(`reason.${r.progress.reason}`)}</p> : null}
              </td>
              <td>
                {r.certificate ? (
                  <>
                    <Ltr className="font-mono text-xs font-semibold text-navy-800">{r.certificate.number}</Ltr>
                    {r.certificate.status === "revoked" ? <p className="mt-1 text-xs text-red-700">{ts("certificate.revoked")}</p> : null}
                  </>
                ) : (
                  <span className="text-muted">{t("shared.none")}</span>
                )}
              </td>
              <td>
                {r.enrollment.status === "active" ? (
                  <ActionButton action={cancelEnrollmentAction} fields={{ id: r.enrollment.id }} confirm={t("enrollments.cancelConfirm", { name: r.learner.name })}>
                    {t("enrollments.cancel")}
                  </ActionButton>
                ) : (
                  <span className="text-muted">{t("shared.none")}</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      {rows.length > 0 ? <p className="text-xs text-muted">{t("enrollments.cancelNote")}</p> : null}
    </>
  );
}
