import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { config } from "@/server/config";
import { forgotPasswordAction } from "@/server/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { AuthShell } from "@/components/site/auth-shell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("forgot.meta"), robots: { index: false } };
}

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("forgot.title")} lead={t("forgot.lead")} footer={<Link href="/sign-in" className="font-semibold text-emerald-700 underline-offset-4 hover:underline">{t("forgot.back")}</Link>}>
      <ActionForm action={forgotPasswordAction} className="space-y-5">
        <Field name="email" type="email" label={t("signIn.email")} autoComplete="email" dir="ltr" inputMode="email" className="text-start" />
        <SubmitButton size="lg">{t("forgot.submit")}</SubmitButton>
      </ActionForm>
      {config.demoMode ? <Alert tone="info" className="mt-6">{t("forgot.demoNote")}</Alert> : null}
    </AuthShell>
  );
}
