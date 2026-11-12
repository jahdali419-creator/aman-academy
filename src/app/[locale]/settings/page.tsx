import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireViewer } from "@/server/auth/session";
import { changePasswordAction, updateProfileAction } from "@/server/actions/auth";
import { formatSaudiMobile } from "@/lib/format";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/ui/form";
import { Alert, Card, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("settings.meta"), robots: { index: false } };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, "/settings");
  const [t, tr, tc] = await Promise.all([getTranslations("auth.settings"), getTranslations("auth.register"), getTranslations("common")]);
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <PageHeader title={t("title")} />
      {viewer.isDemo ? <Alert tone="warning" className="mt-6">{t("demoNote")}</Alert> : null}
      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-navy-900">{t("profile")}</h2>
        <p className="mt-1 text-sm text-muted">{t("profileLead")}</p>
        <dl className="mt-5 rounded-xl bg-paper px-4 py-3 text-sm">
          <dt className="text-muted">{t("email")}</dt>
          <dd className="font-semibold text-navy-900"><Ltr>{viewer.email}</Ltr></dd>
          <dd className="mt-1 text-xs text-muted">{t("emailNote")}</dd>
          {viewer.org ? (
            <>
              <dt className="mt-3 text-muted">{t("company")}</dt>
              <dd className="font-semibold text-navy-900">{viewer.org.name} · {t(`role.${viewer.org.role}`)}</dd>
            </>
          ) : null}
        </dl>
        <ActionForm action={updateProfileAction} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="name" label={tr("name")} hint={tr("nameHint")} defaultValue={viewer.name} autoComplete="name" dir="ltr" className="text-start" />
            <Field name="nameAr" label={tr("nameAr")} hint={tr("nameArHint")} defaultValue={viewer.nameAr ?? ""} optional dir="rtl" lang="ar" />
            <Field name="phone" type="tel" label={tr("phone")} hint={tr("phoneHint")} defaultValue={formatSaudiMobile(viewer.phone)} autoComplete="tel" dir="ltr" inputMode="tel" className="text-start" />
            <SelectField name="locale" label={t("language")} defaultValue={viewer.locale}>
              <option value="ar">{t("languageAr")}</option>
              <option value="en">{t("languageEn")}</option>
            </SelectField>
          </div>
          <SubmitButton>{tc("actions.save")}</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-navy-900">{t("password")}</h2>
        <ActionForm action={changePasswordAction} className="mt-5 space-y-5">
          <Field name="currentPassword" type="password" label={t("current")} autoComplete="current-password" dir="ltr" className="text-start" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="password" type="password" label={t("new")} hint={tr("passwordHint")} autoComplete="new-password" dir="ltr" className="text-start" minLength={10} />
            <Field name="confirm" type="password" label={t("confirm")} autoComplete="new-password" dir="ltr" className="text-start" />
          </div>
          <SubmitButton variant="secondary">{t("changePassword")}</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
