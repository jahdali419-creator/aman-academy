import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireViewer } from "@/server/auth/session";
import { AreaTabs } from "@/components/site/nav-link";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireViewer(locale, "/dashboard");
  const t = await getTranslations("dashboard.tabs");
  return (
    <div className="container-page py-8 sm:py-10">
      <AreaTabs
        label={t("label")}
        items={[
          { href: "/dashboard", label: t("overview"), exact: true },
          { href: "/dashboard/certificates", label: t("certificates") },
          { href: "/settings", label: t("settings") },
        ]}
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}
