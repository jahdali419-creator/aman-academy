import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listCertificatesAdmin } from "@/server/services/admin";
import { effectiveStatus } from "@/server/services/certificates";
import { certificateAction } from "@/server/actions/admin";
import { formatDate, pick } from "@/lib/format";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Badge, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";
import { certificateTone } from "@/components/admin/tones";

export const dynamic = "force-dynamic";

const linkClass = "font-medium text-emerald-700 underline-offset-4 hover:underline";

export default async function AdminCertificatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, ts, db] = await Promise.all([getTranslations("admin"), getTranslations("status"), database()]);
  const rows = await listCertificatesAdmin(db, viewer);

  return (
    <>
      <PageHeader title={t("certificates.title")} lead={t("certificates.lead")} />
      {rows.length === 0 ? (
        <EmptyState icon={<Award aria-hidden className="size-5" />} title={t("certificates.empty.title")}>
          {t("certificates.empty.body")}
        </EmptyState>
      ) : (
        <DataTable
          caption={t("certificates.title")}
          head={[
            t("certificates.col.number"),
            t("certificates.col.learner"),
            t("certificates.col.course"),
            t("certificates.col.issued"),
            t("certificates.col.expires"),
            t("certificates.col.status"),
            t("shared.actions"),
          ]}
        >
          {rows.map(({ cert, ...c }) => {
            const status = effectiveStatus(cert);
            return (
              <tr key={cert.id}>
                <td>
                  <Ltr className="whitespace-nowrap font-mono text-xs font-semibold text-navy-900">{cert.number}</Ltr>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <Link href={{ pathname: "/verify", query: { number: cert.number } }} className={linkClass}>
                      {t("certificates.verify")}
                    </Link>
                    <a href={`/api/certificates/${encodeURIComponent(cert.number)}/pdf`} className={linkClass} target="_blank" rel="noopener">
                      {t("certificates.pdf")}
                    </a>
                  </div>
                </td>
                <td>
                  <p className="font-semibold text-navy-900">{pick(locale, cert.learnerNameEn, cert.learnerNameAr)}</p>
                  {cert.learnerNameAr ? <p className="mt-0.5 text-xs text-muted">{pick(locale === "ar" ? "en" : "ar", cert.learnerNameEn, cert.learnerNameAr)}</p> : null}
                </td>
                <td>
                  <p>{pick(locale, c.courseTitleEn, c.courseTitleAr)}</p>
                  <Ltr className="mt-0.5 font-mono text-xs text-muted">{c.courseCode}</Ltr>
                </td>
                <td className="whitespace-nowrap">{formatDate(cert.issuedAt, locale)}</td>
                <td className="whitespace-nowrap">{cert.expiresAt ? formatDate(cert.expiresAt, locale) : <span className="text-muted">{t("certificates.noExpiry")}</span>}</td>
                <td>
                  <Badge tone={certificateTone(status)}>{ts(`certificate.${status}`)}</Badge>
                  {cert.status === "revoked" ? (
                    <div className="mt-2 max-w-56 text-xs text-muted">
                      {cert.revokedAt ? <p>{t("certificates.revokedOn", { date: formatDate(cert.revokedAt, locale) })}</p> : null}
                      {cert.revokeReason ? (
                        <p className="mt-0.5">
                          <span className="font-semibold text-navy-800">{t("certificates.reasonLabel")}</span> {cert.revokeReason}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td>
                  <details className="min-w-60">
                    <summary className="cursor-pointer whitespace-nowrap text-sm font-semibold text-navy-800 hover:text-navy-900">
                      {cert.status === "valid" ? t("certificates.revokeOpen") : t("certificates.reissueOpen")}
                    </summary>
                    <ActionForm action={certificateAction} successText={t("certificates.done")} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={cert.id} />
                      <Field
                        name="reason"
                        label={t("certificates.reason")}
                        hint={cert.status === "valid" ? t("certificates.reasonHint") : t("certificates.reissueHint")}
                        maxLength={500}
                      />
                      <div className="flex flex-wrap gap-2">
                        {cert.status === "valid" ? (
                          <SubmitButton name="mode" value="revoke" variant="danger" size="sm">
                            {t("certificates.revoke")}
                          </SubmitButton>
                        ) : null}
                        <SubmitButton name="mode" value="replace" variant="light" size="sm">
                          {cert.status === "valid" ? t("certificates.replace") : t("certificates.reissue")}
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  </details>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
      {rows.length > 0 ? <p className="text-xs text-muted">{t("certificates.note")}</p> : null}
    </>
  );
}
