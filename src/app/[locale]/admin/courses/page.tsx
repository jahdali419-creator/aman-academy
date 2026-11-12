import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen, Plus } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listCoursesAdmin } from "@/server/services/admin";
import { formatDuration, formatSar, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, tc, db] = await Promise.all([getTranslations("admin"), getTranslations("common"), database()]);
  const courses = await listCoursesAdmin(db, viewer);

  const newButton = (
    <ButtonLink href="/admin/courses/new">
      <Plus aria-hidden className="size-4" />
      {t("courses.new")}
    </ButtonLink>
  );

  return (
    <>
      <PageHeader title={t("courses.title")} lead={t("courses.lead")} actions={newButton} />
      {courses.length === 0 ? (
        <EmptyState icon={<BookOpen aria-hidden className="size-5" />} title={t("courses.empty.title")} action={newButton}>
          {t("courses.empty.body")}
        </EmptyState>
      ) : (
        <DataTable
          caption={t("courses.title")}
          head={[t("courses.col.code"), t("courses.col.title"), t("courses.col.duration"), t("courses.col.price"), t("courses.col.status"), t("shared.actions")]}
        >
          {courses.map((c) => (
            <tr key={c.id}>
              <td>
                <Ltr className="font-mono text-xs font-semibold text-navy-800">{c.code}</Ltr>
              </td>
              <td>
                <p className="font-semibold text-navy-900">{pick(locale, c.titleEn, c.titleAr)}</p>
                <p className="mt-0.5 text-xs text-muted">{pick(locale === "ar" ? "en" : "ar", c.titleEn, c.titleAr)}</p>
              </td>
              <td className="whitespace-nowrap">{formatDuration(c.durationMinutes, locale)}</td>
              <td className="whitespace-nowrap">{formatSar(c.priceHalalas, locale)}</td>
              <td>{c.published ? <Badge tone="success">{t("courses.published")}</Badge> : <Badge>{tc("draft")}</Badge>}</td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/admin/courses/${c.id}`} variant="light" size="sm">
                    {tc("actions.edit")}
                  </ButtonLink>
                  <ButtonLink href={`/admin/courses/${c.id}/exam`} variant="ghost" size="sm">
                    {t("courses.exam")}
                  </ButtonLink>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
