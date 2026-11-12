import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Award, LineChart, LockKeyhole, Ticket, UsersRound } from "lucide-react";
import { getViewer } from "@/server/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, SectionHeading } from "@/components/ui/primitives";
import { InquiryForm } from "@/components/site/inquiry-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "companies" }))("meta") };
}

export default async function CompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, viewer] = await Promise.all([getTranslations("companies"), getViewer()]);
  const steps = t.raw("how.steps") as { title: string; body: string }[];
  const features = t.raw("features.items") as { title: string; body: string }[];
  const icons = [Ticket, UsersRound, LineChart, Award];
  const isManager = viewer?.org?.role === "manager";

  return (
    <>
      <section className="bg-navy-900 bg-weave text-white">
        <div className="container-page py-16 sm:py-24">
          <Eyebrow className="text-emerald-300">{t("hero.eyebrow")}</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{t("hero.title")}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-100">{t("hero.lead")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={isManager ? "/company" : "/register/company"} size="lg">
              {t("hero.primary")}
              <ArrowRight aria-hidden className="size-4.5 rtl:-scale-x-100" />
            </ButtonLink>
            <ButtonLink href="#inquiry" size="lg" variant="outline-light">{t("hero.secondary")}</ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <SectionHeading title={t("how.title")} />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <span className="grid size-10 place-items-center rounded-full bg-navy-900 font-display text-sm font-semibold text-emerald-300">{i + 1}</span>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-paper-2/60 py-20">
        <div className="container-page">
          <SectionHeading title={t("features.title")} />
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {features.map((f, i) => {
              const Icon = icons[i % icons.length];
              return (
                <li key={f.title} className="flex gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-soft"><Icon aria-hidden className="size-6" /></span>
                  <div>
                    <h3 className="text-lg font-semibold text-navy-900">{f.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{f.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-12 flex gap-4 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy-900 text-emerald-300"><LockKeyhole aria-hidden className="size-6" /></span>
            <div>
              <h3 className="text-lg font-semibold text-navy-900">{t("privacy.title")}</h3>
              <p className="mt-1 leading-relaxed text-muted">{t("privacy.body")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="inquiry" className="container-page scroll-mt-24 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading title={t("inquiry.title")} lead={t("inquiry.lead")} />
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
            <InquiryForm kind="company" />
          </div>
        </div>
      </section>
    </>
  );
}
