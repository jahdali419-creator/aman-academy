import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { getCourseAdmin } from "@/server/services/admin";
import { pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Ltr, PageHeader } from "@/components/ui/primitives";
import { BackLink } from "@/components/admin/back-link";
import { CourseForm } from "@/components/admin/course-form";

export const dynamic = "force-dynamic";

export default async function AdminEditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ locale, id }, { created }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations("admin"), database()]);
  const course = await getCourseAdmin(db, viewer, id);
  if (!course) notFound();

  return (
    <>
      <BackLink href="/admin/courses">{t("courses.back")}</BackLink>
      <PageHeader
        eyebrow={<Ltr>{course.code}</Ltr>}
        title={pick(locale, course.titleEn, course.titleAr)}
        lead={t("courses.editLead")}
        actions={
          <>
            <ButtonLink href={`/admin/courses/${course.id}/exam`} variant="light">
              {t("courses.manageExam")}
            </ButtonLink>
            {course.published ? (
              <ButtonLink href={`/courses/${course.slug}`} variant="ghost">
                {t("courses.viewPublic")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      {created ? (
        <Alert tone="success" role="status">
          {t("courses.created")}
        </Alert>
      ) : null}
      <CourseForm course={course} />
    </>
  );
}
