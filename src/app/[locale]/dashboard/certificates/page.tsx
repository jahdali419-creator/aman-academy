import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, Download } from "lucide-react";
import { database } from "@/server/db/client";
import { requireViewer } from "@/server/auth/session";
import { listCertificatesForUser } from "@/server/services/certificates";
import { formatDateLong, pick } from "@/lib/format";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";
import { CourseIcon } from "@/components/site/course-icon";

export const metadata: Metadata = { robots: { index: false } };

export default async function CertificatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, "/dashboard/certificates");
  const [t, ts, tc, ta] = await Promise.all([getTranslations("dashboard.certificates"), getTranslations("status.certificate"), getTranslations("common"), getTranslations("dashboard.actions")]);
  const certs = await listCertificatesForUser(await database(), viewer.id);
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      {certs.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<Award aria-hidden className="size-6" />} title={t("empty.title")} action={<ButtonLink href="/dashboard" variant="light">{(await getTranslations("dashboard.tabs"))("overview")}</ButtonLink>}>
            {t("empty.body")}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {certs.map((c) => (
            <li key={c.cert.id} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <CourseIcon name={c.icon} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-navy-900">{pick(locale, c.titleEn, c.titleAr)}</h2>
                  <Ltr className="font-mono text-sm text-muted">{c.cert.number}</Ltr>
                </div>
                <Badge tone={c.status === "valid" ? "success" : c.status === "expired" ? "warning" : "danger"}>{ts(c.status)}</Badge>
              </div>
              <p className="mt-4 text-sm text-muted">
                {t("issued", { date: formatDateLong(c.cert.issuedAt, locale) })} · {c.cert.expiresAt ? t("expires", { date: formatDateLong(c.cert.expiresAt, locale) }) : t("noExpiry")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href={`/certificates/${c.cert.number}`} size="sm" variant="secondary">{ta("certificate")}</ButtonLink>
                {c.status !== "revoked" ? (
                  <a href={`/api/certificates/${c.cert.number}/pdf`} className={buttonClass("light", "sm")}>
                    <Download aria-hidden className="size-4" />
                    {tc("actions.download")} PDF
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
