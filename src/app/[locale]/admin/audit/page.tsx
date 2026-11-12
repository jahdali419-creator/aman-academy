import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listAudit } from "@/server/services/admin";
import { formatDateTime } from "@/lib/format";
import { DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations("admin"), database()]);
  const rows = await listAudit(db, viewer);

  return (
    <>
      <PageHeader title={t("audit.title")} lead={t("audit.lead", { count: rows.length })} />
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText aria-hidden className="size-5" />} title={t("audit.empty.title")}>
          {t("audit.empty.body")}
        </EmptyState>
      ) : (
        <DataTable caption={t("audit.title")} head={[t("audit.col.time"), t("audit.col.actor"), t("audit.col.action"), t("audit.col.entity"), t("audit.col.details")]}>
          {rows.map(({ entry, actorName }) => {
            const meta = Object.keys(entry.meta ?? {}).length ? JSON.stringify(entry.meta) : "";
            return (
              <tr key={entry.id}>
                <td className="whitespace-nowrap text-xs text-muted">{formatDateTime(entry.createdAt, locale)}</td>
                <td>{actorName ? <bdi className="text-navy-900">{actorName}</bdi> : <span className="text-muted">{t("audit.system")}</span>}</td>
                <td>
                  <Ltr className="font-mono text-xs font-semibold text-navy-800">{entry.action}</Ltr>
                </td>
                <td className="whitespace-nowrap">
                  <Ltr className="font-mono text-xs text-navy-800">{entry.entityType}</Ltr>
                  <Ltr className="ms-2 font-mono text-xs text-muted" >
                    <span title={entry.entityId}>{entry.entityId.slice(0, 8)}</span>
                  </Ltr>
                </td>
                <td>
                  {meta ? (
                    <Ltr className="max-w-xs">
                      <code className="block break-all font-mono text-xs text-muted">{meta}</code>
                    </Ltr>
                  ) : (
                    <span className="text-muted">{t("shared.none")}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}
