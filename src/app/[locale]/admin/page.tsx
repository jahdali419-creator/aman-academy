import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { getOverview } from "@/server/services/admin";
import { Alert, Card, PageHeader, Stat } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations("admin"), database()]);
  const o = await getOverview(db, viewer);

  const links = [
    { href: "/admin/courses", key: "courses" },
    { href: "/admin/sessions", key: "sessions" },
    { href: "/admin/enrollments", key: "enrollments" },
    { href: "/admin/certificates", key: "certificates" },
    { href: "/admin/inquiries", key: "inquiries" },
    { href: "/admin/audit", key: "audit" },
  ] as const;

  return (
    <>
      <PageHeader title={t("overview.title")} lead={t("overview.lead")} />
      {o.refundsRequired > 0 ? (
        <Alert tone="warning" title={t("overview.refundsTitle", { count: o.refundsRequired })}>
          {t("overview.refundsBody")}
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t("overview.stats.courses")} value={o.courses} />
        <Stat label={t("overview.stats.upcomingSessions")} value={o.upcomingSessions} />
        <Stat label={t("overview.stats.activeEnrollments")} value={o.activeEnrollments} />
        <Stat label={t("overview.stats.validCertificates")} value={o.validCertificates} />
        <Stat label={t("overview.stats.organizations")} value={o.organizations} />
        <Stat label={t("overview.stats.openInquiries")} value={o.openInquiries} />
      </div>
      <section aria-labelledby="admin-shortcuts">
        <h2 id="admin-shortcuts" className="text-lg font-semibold text-navy-900">
          {t("overview.shortcuts")}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="group block h-full">
                <Card className="flex h-full items-start justify-between gap-4 p-5 transition-colors group-hover:border-line-strong">
                  <div>
                    <p className="font-semibold text-navy-900">{t(`tabs.${l.key}`)}</p>
                    <p className="mt-1 text-sm text-muted">{t(`overview.links.${l.key}`)}</p>
                  </div>
                  <ArrowRight aria-hidden className="mt-1 size-4.5 shrink-0 text-emerald-600 rtl:-scale-x-100" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
