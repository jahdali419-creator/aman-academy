import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireArea } from "@/server/auth/session";
import { Eyebrow } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "instructor" });
  return { title: t("meta.title"), robots: { index: false } };
}

export default async function InstructorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "instructor");
  const t = await getTranslations("instructor.layout");

  return (
    <div className="container-page py-10">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <p className="mt-1 font-display text-xl font-semibold text-navy-900">{viewer.name}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
