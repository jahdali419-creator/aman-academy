import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/primitives";
import { BackLink } from "@/components/admin/back-link";
import { CourseForm } from "@/components/admin/course-form";

export const dynamic = "force-dynamic";

export default async function AdminNewCoursePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations("admin");

  return (
    <>
      <BackLink href="/admin/courses">{t("courses.back")}</BackLink>
      <PageHeader title={t("courses.newTitle")} lead={t("courses.newLead")} />
      <CourseForm />
    </>
  );
}
