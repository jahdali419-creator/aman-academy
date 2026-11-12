import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resetPasswordAction } from "@/server/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { AuthShell } from "@/components/site/auth-shell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("reset.meta"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const token = (sp.token ?? "").slice(0, 300);
  return (
    <AuthShell title={t("reset.title")}>
      {!token ? (
        <>
          <Alert tone="danger">{t("reset.missing")}</Alert>
          <ButtonLink href="/forgot-password" variant="light" className="mt-5">{t("forgot.title")}</ButtonLink>
        </>
      ) : (
        <ActionForm action={resetPasswordAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <Field name="password" type="password" label={t("reset.password")} hint={t("register.passwordHint")} autoComplete="new-password" dir="ltr" className="text-start" minLength={10} />
          <Field name="confirm" type="password" label={t("reset.confirm")} autoComplete="new-password" dir="ltr" className="text-start" />
          <SubmitButton size="lg">{t("reset.submit")}</SubmitButton>
        </ActionForm>
      )}
    </AuthShell>
  );
}
