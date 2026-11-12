import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { getViewer, homePathFor } from "@/server/auth/session";
import { registerAction } from "@/server/actions/auth";
import { getInvitationByToken } from "@/server/services/company";
import { safeNext } from "@/lib/validation";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { AuthShell } from "@/components/site/auth-shell";
import { RegisterTabs } from "@/components/site/register-tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("register.meta"), robots: { index: false } };
}

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; invite?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const viewer = await getViewer();
  if (viewer) redirect({ href: homePathFor(viewer), locale });
  const t = await getTranslations("auth");
  const next = safeNext(sp.next) ?? "";
  const token = /^[a-f0-9]{64}$/.test(sp.invite ?? "") ? sp.invite! : "";
  const invitation = token ? await getInvitationByToken(await database(), token) : null;
  const invited = invitation?.usable ? invitation : null;
  const link = "font-semibold text-emerald-700 underline-offset-4 hover:underline";

  return (
    <AuthShell
      title={t("register.title")}
      lead={t("register.lead")}
      footer={
        <p>
          {t("register.have")}{" "}
          <Link href={next ? { pathname: "/sign-in", query: { next } } : "/sign-in"} className={link}>{t("register.signIn")}</Link>
        </p>
      }
    >
      {invited ? <Alert tone="info" className="mb-6">{t("invite.body", { company: invited.orgName })}</Alert> : <RegisterTabs active="individual" />}
      <ActionForm action={registerAction} className="space-y-5">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="invite" value={invited ? token : ""} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label={t("register.name")} hint={t("register.nameHint")} autoComplete="name" dir="ltr" className="text-start" defaultValue={invited?.name} maxLength={120} />
          <Field name="nameAr" label={t("register.nameAr")} hint={t("register.nameArHint")} optional dir="rtl" lang="ar" maxLength={120} />
        </div>
        <Field name="email" type="email" label={t("register.email")} autoComplete="email" dir="ltr" inputMode="email" className="text-start" defaultValue={invited?.email} readOnly={!!invited} />
        <Field name="phone" type="tel" label={t("register.phone")} hint={t("register.phoneHint")} autoComplete="tel" dir="ltr" inputMode="tel" placeholder="05X XXX XXXX" className="text-start" />
        <Field name="password" type="password" label={t("register.password")} hint={t("register.passwordHint")} autoComplete="new-password" dir="ltr" className="text-start" minLength={10} />
        <p className="text-xs leading-relaxed text-muted">
          {t.rich("register.consent", {
            terms: (c) => <Link href="/legal/terms" className={link}>{c}</Link>,
            privacy: (c) => <Link href="/legal/privacy" className={link}>{c}</Link>,
          })}{" "}
          {t("register.noId")}
        </p>
        <SubmitButton size="lg">{t("register.submit")}</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
