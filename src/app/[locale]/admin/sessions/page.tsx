import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Plus } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listSessionsAdmin } from "@/server/services/admin";
import { formatDate, formatTimeRange, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";
import { sessionTone } from "@/components/admin/tones";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, tc, ts, db] = await Promise.all([getTranslations("admin"), getTranslations("common"), getTranslations("status"), database()]);
  const rows = await listSessionsAdmin(db, viewer);

  const newButton = (
    <ButtonLink href="/admin/sessions/new">
      <Plus aria-hidden className="size-4" />
      {t("sessions.new")}
    </ButtonLink>
  );

  return (
    <>
      <PageHeader title={t("sessions.title")} lead={t("sessions.lead")} actions={newButton} />
      {rows.length === 0 ? (
        <EmptyState icon={<CalendarDays aria-hidden className="size-5" />} title={t("sessions.empty.title")} action={newButton}>
          {t("sessions.empty.body")}
        </EmptyState>
      ) : (
        <>
          <DataTable
            caption={t("sessions.title")}
            head={[
              t("sessions.col.course"),
              t("sessions.col.when"),
              tc("teaching.label"),
              t("sessions.col.instructor"),
              t("sessions.col.seats"),
              t("sessions.col.status"),
              t("sessions.col.joinLink"),
              t("shared.actions"),
            ]}
          >
            {rows.map((r) => (
              <tr key={r.session.id}>
                <td>
                  <p className="font-semibold text-navy-900">{pick(locale, r.courseTitleEn, r.courseTitleAr)}</p>
                  <Ltr className="mt-0.5 font-mono text-xs text-muted">{r.courseCode}</Ltr>
                </td>
                <td className="whitespace-nowrap">
                  <p className="font-medium text-navy-900">{formatDate(r.session.startsAt, locale)}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatTimeRange(r.session.startsAt, r.session.endsAt, locale)}</p>
                </td>
                <td>{tc(`teaching.${r.session.language}`)}</td>
                <td>{r.instructorEn ? pick(locale, r.instructorEn, r.instructorAr) : <span className="text-muted">{t("sessions.unassigned")}</span>}</td>
                <td className="whitespace-nowrap">
                  <Ltr>
                    {r.enrolled} / {r.session.maxSeats}
                  </Ltr>
                </td>
                <td>
                  <Badge tone={sessionTone(r.session.status)}>{ts(`session.${r.session.status}`)}</Badge>
                </td>
                <td>{r.session.joinUrl ? <Badge tone="success">{t("sessions.linkSet")}</Badge> : <Badge tone="warning">{t("sessions.linkMissing")}</Badge>}</td>
                <td>
                  <ButtonLink href={`/admin/sessions/${r.session.id}`} variant="light" size="sm">
                    {t("sessions.manage")}
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </DataTable>
          <p className="text-xs text-muted">{tc("time.zoneNote")}</p>
        </>
      )}
    </>
  );
}
