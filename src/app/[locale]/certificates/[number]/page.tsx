import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import QRCode from "qrcode";
import { Download, ExternalLink } from "lucide-react";
import { database } from "@/server/db/client";
import { config } from "@/server/config";
import { homePathFor, requireViewer } from "@/server/auth/session";
import { getCertificateForViewer } from "@/server/services/certificates";
import { formatDateLong, pick } from "@/lib/format";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Alert, Ltr } from "@/components/ui/primitives";
import { LogoMark } from "@/components/site/logo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "certificate" }))("meta"), robots: { index: false } };
}

export default async function CertificatePage({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/certificates/${number}`);
  const row = await getCertificateForViewer(await database(), viewer, number);
  if (!row) notFound();
  const [t, tc] = await Promise.all([getTranslations("certificate"), getTranslations("common")]);
  const { cert, course, instructor, status } = row;
  const verifyUrl = `${config.appUrl}/${locale}/verify?number=${cert.number}`;
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, color: { dark: "#0a1c36", light: "#ffffff" } });
  const other = locale === "ar" ? "en" : "ar";
  const otherName = locale === "ar" ? cert.learnerNameEn : cert.learnerNameAr;
  const fact = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-navy-900">{value}</dd>
    </div>
  );

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <ButtonLink href={cert.userId === viewer.id ? "/dashboard/certificates" : homePathFor(viewer)} variant="ghost" size="sm">{t("back")}</ButtonLink>
        <div className="flex flex-wrap gap-2">
          <a href={`/${locale}/verify?number=${cert.number}`} className={buttonClass("light", "sm")}>
            <ExternalLink aria-hidden className="size-4" />
            {t("verifyLink")}
          </a>
          {status !== "revoked" ? (
            <a href={`/api/certificates/${cert.number}/pdf`} className={buttonClass("primary", "sm")}>
              <Download aria-hidden className="size-4" />
              {t("download")}
            </a>
          ) : null}
        </div>
      </div>

      {status === "revoked" ? (
        <Alert tone="danger" title={t("revokedTitle")} className="mt-6">{cert.revokeReason ? t("revokedReason", { reason: cert.revokeReason }) : null}</Alert>
      ) : status === "expired" ? (
        <Alert tone="warning" title={t("expiredTitle")} className="mt-6" />
      ) : null}

      <article className={`relative mt-6 overflow-hidden rounded-3xl border-2 border-navy-900 bg-paper p-2 shadow-lift ${status === "revoked" ? "opacity-70" : ""}`}>
        <div className="relative rounded-[1.25rem] border border-emerald-600/60 px-6 py-10 text-center sm:px-12 sm:py-14">
          {config.demoMode ? <p className="mx-auto mb-6 w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{t("sample")}</p> : null}
          <LogoMark className="mx-auto size-12" />
          <p className="mt-2 font-display font-semibold text-navy-900">{tc("brand")}</p>
          <h1 className="mt-6 text-3xl font-semibold text-navy-900 sm:text-5xl">{t("title")}</h1>
          <p className="mt-8 text-sm text-muted">{t("certifies")}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">{pick(locale, cert.learnerNameEn, cert.learnerNameAr)}</p>
          {otherName && otherName !== pick(locale, cert.learnerNameEn, cert.learnerNameAr) ? (
            <p className="mt-1 text-lg text-navy-700" lang={other} dir={other === "ar" ? "rtl" : "ltr"}>{otherName}</p>
          ) : null}
          <div aria-hidden className="mx-auto mt-6 h-px w-48 bg-line-strong" />
          <p className="mt-6 text-sm text-muted">{t("attended")}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-700 sm:text-3xl">{pick(locale, course.titleEn, course.titleAr)}</p>

          <div className="mt-10 flex flex-col items-center gap-8 border-t border-line pt-8 text-start sm:flex-row sm:items-end sm:justify-between">
            <dl className="grid w-full grid-cols-2 gap-x-8 gap-y-4 sm:w-auto sm:grid-cols-3">
              {fact(t("completed"), formatDateLong(cert.completedAt, locale))}
              {fact(t("number"), <Ltr className="font-mono text-sm">{cert.number}</Ltr>)}
              {fact(t("expires"), cert.expiresAt ? formatDateLong(cert.expiresAt, locale) : t("noExpiry"))}
              {instructor ? fact(t("instructor"), pick(locale, instructor.nameEn, instructor.nameAr)) : null}
              {fact(t("issuer"), tc("brand"))}
            </dl>
            <div className="shrink-0 text-center">
              <div className="size-28 rounded-xl bg-white p-2 shadow-soft [&>svg]:size-full" role="img" aria-label={t("scan")} dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="mt-2 text-xs text-muted">{t("scan")}</p>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted">{t("disclaimer")}</p>
        </div>
      </article>

      <div className="no-print mt-6 rounded-2xl border border-line bg-white p-5 text-sm">
        <p className="text-muted">{t("share")}</p>
        <Ltr className="mt-1 break-all font-mono text-navy-900">{verifyUrl}</Ltr>
      </div>
    </div>
  );
}
