import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { Eyebrow } from "@/components/ui/primitives";
import { AreaTabs } from "@/components/site/nav-link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations("admin");

  return (
    <div className="container-page py-10">
      <div className="mb-8 space-y-5">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <p className="mt-1 font-display text-xl font-semibold text-navy-900">{t("title")}</p>
        </div>
        <AreaTabs
          label={t("tabsLabel")}
          items={[
            { href: "/admin", label: t("tabs.overview"), exact: true },
            { href: "/admin/courses", label: t("tabs.courses") },
            { href: "/admin/sessions", label: t("tabs.sessions") },
            { href: "/admin/enrollments", label: t("tabs.enrollments") },
            { href: "/admin/certificates", label: t("tabs.certificates") },
            { href: "/admin/companies", label: t("tabs.companies") },
            { href: "/admin/inquiries", label: t("tabs.inquiries") },
            { href: "/admin/audit", label: t("tabs.audit") },
            { href: "/admin/outbox", label: t("tabs.outbox") },
          ]}
        />
      </div>
      <div className="space-y-8">{children}</div>
    </div>
  );
}
