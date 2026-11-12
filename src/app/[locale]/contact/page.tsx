import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading, Alert } from "@/components/ui/primitives";
import { InquiryForm } from "@/components/site/inquiry-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "contact" }))("meta") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const aside = t.raw("aside") as { title: string; body: string }[];
  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading eyebrow={t("eyebrow")} title={<span>{t("title")}</span>} lead={t("lead")} />
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
          <InquiryForm kind="contact" />
        </div>
        <aside className="space-y-6">
          <div className="rounded-3xl bg-navy-900 bg-weave p-7 text-white shadow-lift">
            <h2 className="text-xl font-semibold">{t("asideTitle")}</h2>
            <ul className="mt-5 space-y-5">
              {aside.map((a) => (
                <li key={a.title}>
                  <h3 className="font-semibold text-emerald-300">{a.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-100">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <Alert tone="warning">{t("detailsNote")}</Alert>
        </aside>
      </div>
    </div>
  );
}
