import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { updateOrganizationAction } from "@/server/actions/company";
import { getOrganization } from "@/server/services/company";
import { formatSaudiMobile } from "@/lib/format";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CompanyDetailsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "manager");
  const [t, tc, db] = await Promise.all([getTranslations("companyArea.details"), getTranslations("common"), database()]);
  const org = await getOrganization(db, viewer);
  if (!org) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Card className="max-w-3xl p-6">
        <ActionForm action={updateOrganizationAction}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field name="name" label={t("name")} defaultValue={org.name} autoComplete="organization" maxLength={160} />
            </div>
            <Field name="contactName" label={t("contactName")} defaultValue={org.contactName} autoComplete="name" maxLength={120} />
            <Field name="contactEmail" label={t("contactEmail")} type="email" dir="ltr" defaultValue={org.contactEmail} autoComplete="email" />
            <Field
              name="phone"
              label={t("phone")}
              hint={t("phoneHint")}
              type="tel"
              dir="ltr"
              inputMode="tel"
              defaultValue={formatSaudiMobile(org.phone)}
              autoComplete="tel"
            />
            <div className="hidden sm:block" />
            <Field name="crNumber" label={t("crNumber")} hint={t("crHint")} optional dir="ltr" inputMode="numeric" maxLength={10} defaultValue={org.crNumber ?? ""} />
            <Field name="vatNumber" label={t("vatNumber")} hint={t("vatHint")} optional dir="ltr" inputMode="numeric" maxLength={15} defaultValue={org.vatNumber ?? ""} />
          </div>
          <div className="mt-6">
            <SubmitButton>{tc("actions.save")}</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
