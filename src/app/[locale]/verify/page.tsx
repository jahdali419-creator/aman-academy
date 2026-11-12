import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, CircleSlash, Clock3, SearchX, ShieldCheck } from "lucide-react";
import { database } from "@/server/db/client";
import { config } from "@/server/config";
import { checkRateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/actions/helpers";
import { verifyCertificate } from "@/server/services/certificates";
import { formatDateLong, pick } from "@/lib/format";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Alert, DefinitionRow, Ltr, SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "contact.verify" }))("meta"), robots: { index: false } };
}

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ number?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [t, te, ts] = await Promise.all([getTranslations("contact.verify"), getTranslations("errors"), getTranslations("status.certificate")]);
  const number = (sp.number ?? "").trim().slice(0, 40);

  // Rate-limited to make guessing certificate numbers impractical.
  const limited = number ? !checkRateLimit(`verify:${await clientIp()}`, 30, 300) : false;
  const result = number && !limited ? await verifyCertificate(await database(), number) : null;

  const tone = result?.found ? (result.status === "valid" ? "valid" : result.status) : null;
  const banner = {
    valid: { cls: "bg-emerald-600", icon: BadgeCheck, text: t("resultValid") },
    revoked: { cls: "bg-red-700", icon: CircleSlash, text: t("resultRevoked") },
    expired: { cls: "bg-amber-700", icon: Clock3, text: t("resultExpired") },
  } as const;

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <SectionHeading eyebrow={t("eyebrow")} title={<span>{t("title")}</span>} lead={t("lead")} />

        <form method="get" className="mt-10 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
          <label htmlFor="cert-number" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("label")}</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="cert-number"
              name="number"
              defaultValue={number}
              required
              dir="ltr"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={t("placeholder")}
              aria-describedby="cert-hint"
              className="block w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 font-mono text-base uppercase tracking-wider text-navy-900 placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
            <button type="submit" className={buttonClass("secondary", "lg", "shrink-0")}>
              <ShieldCheck aria-hidden className="size-4.5" />
              {t("submit")}
            </button>
          </div>
          <p id="cert-hint" className="mt-2 text-xs text-muted">{t("hint")}</p>
        </form>

        <div aria-live="polite" className="mt-8">
          {limited ? <Alert tone="danger" role="alert">{te("rate_limited")}</Alert> : null}

          {result && !result.found ? (
            <div className="flex flex-col items-center rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-soft">
              <span className="grid size-14 place-items-center rounded-full bg-paper-2 text-navy-700"><SearchX aria-hidden className="size-7" /></span>
              <h2 className="mt-5 text-xl font-semibold text-navy-900">{t("notFoundTitle")}</h2>
              <p className="mt-2 max-w-md text-muted">{t("notFoundBody")}</p>
            </div>
          ) : null}

          {result?.found && tone ? (
            <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
              {(() => {
                const b = banner[tone];
                const Icon = b.icon;
                return (
                  <header className={`flex items-center gap-3 px-6 py-5 text-white sm:px-8 ${b.cls}`}>
                    <Icon aria-hidden className="size-7 shrink-0" />
                    <h2 className="text-xl font-semibold">{b.text}</h2>
                  </header>
                );
              })()}
              <dl className="divide-y divide-line px-6 py-2 sm:px-8">
                <DefinitionRow label={t("holder")}>
                  <span className="block text-lg">{pick(locale, result.learnerNameEn, result.learnerNameAr)}</span>
                  {result.learnerNameAr && result.learnerNameAr !== result.learnerNameEn ? (
                    <span className="block text-sm font-normal text-muted" lang={locale === "ar" ? "en" : "ar"} dir="auto">{locale === "ar" ? result.learnerNameEn : result.learnerNameAr}</span>
                  ) : null}
                </DefinitionRow>
                <DefinitionRow label={t("course")}>{pick(locale, result.courseTitleEn, result.courseTitleAr)}</DefinitionRow>
                <DefinitionRow label={t("issued")}>{formatDateLong(result.issuedAt, locale)}</DefinitionRow>
                <DefinitionRow label={t("expires")}>{result.expiresAt ? formatDateLong(result.expiresAt, locale) : t("noExpiry")}</DefinitionRow>
                <DefinitionRow label={t("number")}><Ltr className="font-mono">{result.number}</Ltr></DefinitionRow>
                <DefinitionRow label={t("status")}>{ts(result.status)}</DefinitionRow>
              </dl>
              <footer className="space-y-2 border-t border-line bg-paper px-6 py-5 text-sm text-muted sm:px-8">
                <p>{t("meaning")}</p>
                <p>{t("privacy")}</p>
                {config.demoMode ? <p className="font-semibold text-amber-700">{t("sample")}</p> : null}
              </footer>
            </article>
          ) : null}

          {result ? <ButtonLink href="/verify" variant="ghost" className="mt-6">{t("another")}</ButtonLink> : null}
        </div>
      </div>
    </div>
  );
}
