import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { config } from "@/server/config";
import { getViewer, homePathFor } from "@/server/auth/session";
import { signInAction } from "@/server/actions/auth";
import { safeNext } from "@/lib/validation";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { AuthShell } from "@/components/site/auth-shell";
import { DemoAccess } from "@/components/site/demo-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("signIn.meta"), robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; reset?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const viewer = await getViewer();
  const next = safeNext(sp.next) ?? "";
  if (viewer) redirect({ href: next || homePathFor(viewer), locale });
  const t = await getTranslations("auth");
  const link = "font-semibold text-emerald-700 underline-offset-4 hover:underline";

  return (
    <AuthShell
      title={t("signIn.title")}
      lead={t("signIn.lead")}
      footer={
        <p>
          {t("signIn.noAccount")}{" "}
          <Link href={next ? { pathname: "/register", query: { next } } : "/register"} className={link}>{t("signIn.create")}</Link>
        </p>
      }
    >
      {sp.reset ? <Alert tone="success" role="status" className="mb-5">{t("signIn.resetDone")}</Alert> : null}
      {next ? <Alert tone="info" className="mb-5">{t("signIn.nextNote")}</Alert> : null}
      <ActionForm action={signInAction} className="space-y-5">
        <input type="hidden" name="next" value={next} />
        <Field name="email" type="email" label={t("signIn.email")} autoComplete="email" dir="ltr" inputMode="email" className="text-start" />
        <Field name="password" type="password" label={t("signIn.password")} autoComplete="current-password" dir="ltr" className="text-start" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SubmitButton size="lg">{t("signIn.submit")}</SubmitButton>
          <Link href="/forgot-password" className={`text-sm ${link}`}>{t("signIn.forgot")}</Link>
        </div>
      </ActionForm>
      {config.demoMode ? <DemoAccess next={next} /> : null}
    </AuthShell>
  );
}
