import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, FileSpreadsheet } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { getReportRows } from "@/server/services/company";
import { formatDate, pick } from "@/lib/format";
import { attendanceTone, progressTone } from "@/components/company/tones";
import { buttonClass } from "@/components/ui/button";
import { Badge, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CompanyReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "manager");
  const [t, ts, tc, db] = await Promise.all([getTranslations("companyArea.reports"), getTranslations("status"), getTranslations("common"), database()]);
  const rows = await getReportRows(db, viewer);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          rows.length > 0 ? (
            // A plain link: the route handler streams a file, so no client-side navigation.
            <a href={`/api/company/report?locale=${locale}`} download className={buttonClass("primary", "md")}>
              <Download aria-hidden className="size-4" />
              {t("download")}
            </a>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet aria-hidden className="size-6" />} title={t("emptyTitle")}>
          {t("emptyBody")}
        </EmptyState>
      ) : (
        <>
          <DataTable
            caption={t("caption")}
            head={[
              t("columns.employee"),
              t("columns.course"),
              t("columns.session"),
              t("columns.attendance"),
              t("columns.attempts"),
              t("columns.bestScore"),
              t("columns.status"),
              t("columns.certificate"),
            ]}
          >
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <p className="font-semibold text-navy-900">{pick(locale, r.employee, r.employeeAr)}</p>
                  <Ltr className="mt-0.5 break-all text-xs text-muted">{r.email}</Ltr>
                </td>
                <td>
                  <p>{pick(locale, r.courseEn, r.courseAr)}</p>
                  <Ltr className="text-xs text-muted">{r.courseCode}</Ltr>
                </td>
                <td>
                  <p className="whitespace-nowrap">{formatDate(r.sessionStart, locale)}</p>
                  <p className="text-xs text-muted">{tc(`teaching.${r.language}`)}</p>
                </td>
                <td>
                  <Badge tone={attendanceTone(r.attendanceStatus)}>
                    {r.attendanceStatus ? `${ts(`attendance.${r.attendanceStatus}`)} · ${r.attendancePercent ?? 0}%` : ts("attendance.pending")}
                  </Badge>
                </td>
                <td>{r.attempts}</td>
                <td>{r.bestScore === null ? <span className="text-muted">{t("notAttempted")}</span> : `${r.bestScore}%`}</td>
                <td>
                  <Badge tone={progressTone(r.status)}>{ts(`progress.${r.status}`)}</Badge>
                </td>
                <td>{r.certificateNumber ? <Ltr className="whitespace-nowrap font-medium text-navy-900">{r.certificateNumber}</Ltr> : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </DataTable>
          <p className="text-sm text-muted">{t("downloadHint")}</p>
        </>
      )}
    </div>
  );
}
