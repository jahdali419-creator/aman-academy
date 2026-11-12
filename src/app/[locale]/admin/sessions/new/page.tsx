import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listCoursesAdmin, listInstructorsAdmin } from "@/server/services/admin";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { BackLink } from "@/components/admin/back-link";
import { SessionForm } from "@/components/admin/session-form";

export const dynamic = "force-dynamic";

export default async function AdminNewSessionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations("admin"), database()]);
  const [courses, instructors] = await Promise.all([listCoursesAdmin(db, viewer), listInstructorsAdmin(db, viewer)]);

  return (
    <>
      <BackLink href="/admin/sessions">{t("sessions.back")}</BackLink>
      <PageHeader title={t("sessions.newTitle")} lead={t("sessions.newLead")} />
      {courses.length === 0 ? (
        <EmptyState title={t("sessions.needCourse.title")} action={<ButtonLink href="/admin/courses/new">{t("courses.new")}</ButtonLink>}>
          {t("sessions.needCourse.body")}
        </EmptyState>
      ) : (
        <SessionForm courses={courses} instructors={instructors} />
      )}
    </>
  );
}
