import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2 } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listOrganizationsAdmin } from "@/server/services/admin";
import { formatDate, formatSaudiMobile } from "@/lib/format";
import { Badge, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, tc, db] = await Promise.all([getTranslations("admin"), getTranslations("common"), database()]);
  const rows = await listOrganizationsAdmin(db, viewer);

  return (
    <>
      <PageHeader title={t("companies.title")} lead={t("companies.lead")} />
      {rows.length === 0 ? (
        <EmptyState icon={<Building2 aria-hidden className="size-5" />} title={t("companies.empty.title")}>
          {t("companies.empty.body")}
        </EmptyState>
      ) : (
        <DataTable
          caption={t("companies.title")}
          head={[t("companies.col.name"), t("companies.col.contact"), t("companies.col.members"), t("companies.col.seats"), t("companies.col.registered")]}
        >
          {rows.map(({ org, members, seats, assigned }) => (
            <tr key={org.id}>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy-900">{org.name}</span>
                  {org.isDemo ? <Badge tone="warning">{tc("sampleData")}</Badge> : null}
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-muted">
                  {org.crNumber ? (
                    <p>
                      {t("companies.cr")} <Ltr>{org.crNumber}</Ltr>
                    </p>
                  ) : null}
                  {org.vatNumber ? (
                    <p>
                      {t("companies.vat")} <Ltr>{org.vatNumber}</Ltr>
                    </p>
                  ) : null}
                </div>
              </td>
              <td>
                <p className="text-navy-900">{org.contactName}</p>
                <Ltr className="mt-0.5 block text-xs text-muted">{org.contactEmail}</Ltr>
                {org.phone ? <Ltr className="mt-0.5 block text-xs text-muted">{formatSaudiMobile(org.phone)}</Ltr> : null}
              </td>
              <td>{members}</td>
              <td className="whitespace-nowrap">
                <p className="font-medium text-navy-900">{t("companies.seatsAssigned", { assigned, seats })}</p>
                <p className="mt-0.5 text-xs text-muted">{t("companies.seatsRemaining", { count: Math.max(seats - assigned, 0) })}</p>
              </td>
              <td className="whitespace-nowrap">{formatDate(org.createdAt, locale)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
