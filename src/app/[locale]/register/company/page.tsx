import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getViewer, homePathFor } from "@/server/auth/session";
import { registerCompanyAction } from "@/server/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { AuthShell } from "@/components/site/auth-shell";
import { RegisterTabs } from "@/components/site/register-tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("company.meta"), robots: { index: false } };
}

export default async function RegisterCompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await getViewer();
  if (viewer) redirect({ href: homePathFor(viewer), locale });
  const t = await getTranslations("auth");
  const link = "font-semibold text-emerald-700 underline-offset-4 hover:underline";
  return (
    <AuthShell
      wide
      title={t("company.title")}
      lead={t("company.lead")}
      footer={<p>{t("register.have")} <Link href="/sign-in" className={link}>{t("register.signIn")}</Link></p>}
    >
      <RegisterTabs active="company" />
      <ActionForm action={registerCompanyAction} className="space-y-5">
        <Field name="companyName" label={t("company.companyName")} autoComplete="organization" maxLength={160} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label={t("company.contact")} hint={t("company.contactHint")} autoComplete="name" dir="ltr" className="text-start" maxLength={120} />
          <Field name="phone" type="tel" label={t("register.phone")} hint={t("register.phoneHint")} autoComplete="tel" dir="ltr" inputMode="tel" placeholder="05X XXX XXXX" className="text-start" />
          <Field name="email" type="email" label={t("company.email")} autoComplete="email" dir="ltr" inputMode="email" className="text-start" />
          <Field name="password" type="password" label={t("register.password")} hint={t("register.passwordHint")} autoComplete="new-password" dir="ltr" className="text-start" minLength={10} />
        </div>
        <fieldset className="rounded-2xl border border-line bg-paper p-5">
          <legend className="px-2 text-sm font-semibold text-navy-900">{t("company.optionalTitle")}</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="crNumber" label={t("company.crNumber")} hint={t("company.crHint")} optional dir="ltr" inputMode="numeric" className="text-start" maxLength={10} />
            <Field name="vatNumber" label={t("company.vatNumber")} hint={t("company.vatHint")} optional dir="ltr" inputMode="numeric" className="text-start" maxLength={15} />
          </div>
        </fieldset>
        <p className="text-xs leading-relaxed text-muted">
          {t.rich("register.consent", {
            terms: (c) => <Link href="/legal/terms" className={link}>{c}</Link>,
            privacy: (c) => <Link href="/legal/privacy" className={link}>{c}</Link>,
          })}
        </p>
        <SubmitButton size="lg">{t("company.submit")}</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
