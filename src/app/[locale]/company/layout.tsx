import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { AreaTabs } from "@/components/site/nav-link";
import { Eyebrow } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "companyArea" });
  return { title: t("meta.title"), robots: { index: false } };
}

export default async function CompanyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "manager");
  const t = await getTranslations("companyArea.layout");

  return (
    <div className="container-page py-10">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <p className="mt-1 font-display text-xl font-semibold text-navy-900">{viewer.org?.name}</p>
      <div className="mt-6">
        <AreaTabs
          label={t("tabsLabel")}
          items={[
            { href: "/company", label: t("tabs.overview"), exact: true },
            { href: "/company/employees", label: t("tabs.employees") },
            { href: "/company/seats", label: t("tabs.seats") },
            { href: "/company/reports", label: t("tabs.reports") },
            { href: "/company/details", label: t("tabs.details") },
          ]}
        />
      </div>
      <div className="mt-10">{children}</div>
    </div>
  );
}
