import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Eyebrow } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "about" }))("meta") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations("about"), getTranslations("common")]);
  const principles = t.raw("principles") as { title: string; body: string }[];
  return (
    <>
      <section className="bg-navy-900 bg-weave text-white">
        <div className="container-page py-16 sm:py-24">
          <Eyebrow className="text-emerald-300">{t("eyebrow")}</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-100">{t("lead")}</p>
        </div>
      </section>
      <div className="container-page grid gap-16 py-20 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <h2 className="text-2xl font-semibold text-navy-900 sm:text-3xl">{t("missionTitle")}</h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-navy-800">
            {(t.raw("mission") as string[]).map((p) => <p key={p}>{p}</p>)}
          </div>
          <p className="mt-10 border-s-4 border-emerald-600 ps-5 font-display text-2xl font-semibold text-navy-900">{tc("tagline")}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold text-navy-900 sm:text-3xl">{t("principlesTitle")}</h2>
          <ul className="mt-6 space-y-4">
            {principles.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check aria-hidden className="size-4" /></span>
                <div>
                  <h3 className="font-semibold text-navy-900">{p.title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="container-page">
        <Alert tone="info" title={t("statusTitle")}>{t("status")}</Alert>
        <ButtonLink href="/courses" size="lg" className="mt-10">{t("cta")}</ButtonLink>
      </div>
    </>
  );
}
