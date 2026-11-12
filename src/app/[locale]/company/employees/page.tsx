import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, MailPlus, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { inviteEmployeeAction, revokeInvitationAction } from "@/server/actions/company";
import { listEmployees, listInvitations } from "@/server/services/company";
import { formatDate, pick } from "@/lib/format";
import { attendanceTone, progressTone } from "@/components/company/tones";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Badge, Card, DataTable, EmptyState, Ltr, PageHeader, type Tone } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const invitationTone: Record<string, Tone> = { pending: "warning", accepted: "success", revoked: "neutral", expired: "neutral" };

export default async function CompanyEmployeesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "manager");
  const [t, ts, db] = await Promise.all([getTranslations("companyArea.employees"), getTranslations("status"), database()]);
  const [employees, invitations] = await Promise.all([listEmployees(db, viewer), listInvitations(db, viewer)]);

  return (
    <div className="space-y-12">
      <PageHeader title={t("title")} lead={t("lead")} />

      <section aria-labelledby="invite-h">
        <Card className="p-6">
          <h2 id="invite-h" className="text-lg font-semibold text-navy-900">
            {t("invite.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("invite.body")}</p>
          <ActionForm action={inviteEmployeeAction} className="mt-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="name" label={t("invite.name")} autoComplete="off" maxLength={120} />
              <Field name="email" label={t("invite.email")} type="email" dir="ltr" autoComplete="off" />
            </div>
            <div className="mt-6">
              <SubmitButton>
                <MailPlus aria-hidden className="size-4" />
                {t("invite.submit")}
              </SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </section>

      <section aria-labelledby="team-h" className="space-y-4">
        <h2 id="team-h" className="text-xl font-semibold text-navy-900">
          {t("team.title")}
        </h2>
        {employees.length === 0 ? (
          <EmptyState icon={<Users aria-hidden className="size-6" />} title={t("team.emptyTitle")}>
            {t("team.emptyBody")}
          </EmptyState>
        ) : (
          <DataTable caption={t("team.caption")} head={[t("team.employee"), t("team.training")]}>
            {employees.map((e) => {
              const rows = e.enrollments.filter((p) => p.enrollment.status === "active");
              return (
                <tr key={e.userId}>
                  <td className="w-64">
                    <p className="font-semibold text-navy-900">
                      {pick(locale, e.name, e.nameAr)}
                      {e.role === "manager" ? (
                        <Badge tone="navy" className="ms-2">
                          {t("team.manager")}
                        </Badge>
                      ) : null}
                    </p>
                    <Ltr className="mt-0.5 break-all text-xs text-muted">{e.email}</Ltr>
                  </td>
                  <td>
                    {rows.length === 0 ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-muted">{t("team.noEnrollments")}</p>
                        <ButtonLink href="/company/seats#assign" size="sm" variant="light">
                          {t("team.assign")}
                        </ButtonLink>
                      </div>
                    ) : (
                      <ul className="divide-y divide-line">
                        {rows.map((p) => {
                          const cert = p.certificate?.status === "valid" ? p.certificate : null;
                          return (
                            <li key={p.enrollment.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="font-medium text-navy-900">{pick(locale, p.course.titleEn, p.course.titleAr)}</span>
                                <span className="text-xs text-muted">{formatDate(p.session.startsAt, locale)}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted">{t("team.attendance")}</span>
                                <Badge tone={attendanceTone(p.attendance?.status)}>
                                  {p.attendance
                                    ? t("team.attendanceValue", { status: ts(`attendance.${p.attendance.status}`), percent: p.attendance.percent })
                                    : ts("attendance.pending")}
                                </Badge>
                                <Badge tone={progressTone(p.progress.status)}>{ts(`progress.${p.progress.status}`)}</Badge>
                              </div>
                              {p.progress.reason ? <p className="text-xs font-medium text-red-700">{ts(`reason.${p.progress.reason}`)}</p> : null}
                              {cert ? (
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                  <span className="text-muted">
                                    {t("team.certificate")} <Ltr className="font-medium text-navy-900">{cert.number}</Ltr>
                                  </span>
                                  <Link href={`/certificates/${cert.number}`} className="font-semibold text-emerald-700 underline-offset-4 hover:underline">
                                    {t("team.viewCertificate")}
                                  </Link>
                                  <a
                                    href={`/api/certificates/${encodeURIComponent(cert.number)}/pdf`}
                                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline-offset-4 hover:underline"
                                  >
                                    <Download aria-hidden className="size-3.5" />
                                    {t("team.downloadPdf")}
                                  </a>
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </section>

      <section aria-labelledby="invitations" className="space-y-4">
        <h2 id="invitations" className="scroll-mt-24 text-xl font-semibold text-navy-900">
          {t("invitations.title")}
        </h2>
        {invitations.length === 0 ? (
          <EmptyState icon={<MailPlus aria-hidden className="size-6" />} title={t("invitations.emptyTitle")}>
            {t("invitations.emptyBody")}
          </EmptyState>
        ) : (
          <DataTable
            caption={t("invitations.caption")}
            head={[t("invitations.name"), t("invitations.email"), t("invitations.sent"), t("invitations.expires"), t("invitations.status"), t("invitations.actions")]}
          >
            {invitations.map((i) => (
              <tr key={i.id}>
                <td className="font-medium text-navy-900">{i.name}</td>
                <td>
                  <Ltr className="break-all">{i.email}</Ltr>
                </td>
                <td>{formatDate(i.createdAt, locale)}</td>
                <td>{formatDate(i.expiresAt, locale)}</td>
                <td>
                  <Badge tone={invitationTone[i.status]}>{ts(`invitation.${i.status}`)}</Badge>
                </td>
                <td>
                  {i.status === "pending" ? (
                    <ActionButton action={revokeInvitationAction} fields={{ id: i.id }} confirm={t("invitations.revokeConfirm")}>
                      {t("invitations.revoke")}
                    </ActionButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
