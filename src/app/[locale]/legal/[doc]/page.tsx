import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, Badge } from "@/components/ui/primitives";

const docs = ["privacy", "terms", "refunds"] as const;
type Doc = (typeof docs)[number];
type Props = { params: Promise<{ locale: string; doc: string }> };
const isDoc = (d: string): d is Doc => (docs as readonly string[]).includes(d);

// Rendered per request so the shared header always reflects the signed-in state.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isDoc(doc)) return {};
  return { title: (await getTranslations({ locale, namespace: "legal" }))(`docs.${doc}.title`), robots: { index: false } };
}

export default async function LegalPage({ params }: Props) {
  const { locale, doc } = await params;
  if (!isDoc(doc)) notFound();
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations("legal"), getTranslations("common")]);
  const sections = t.raw(`docs.${doc}.sections`) as { h: string; p: string[] }[];
  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Badge tone="warning">{tc("draft")}</Badge>
        <h1 className="mt-4 text-4xl font-semibold text-navy-900">{t(`docs.${doc}.title`)}</h1>
        <p className="mt-3 text-lg text-muted">{t(`docs.${doc}.lead`)}</p>
        <Alert tone="warning" title={t("draftTitle")} className="mt-8">{t("draftBody")}</Alert>
        <nav aria-label={t("onThisPage")} className="mt-10 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-navy-900">{t("onThisPage")}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 ps-5 text-sm marker:text-muted">
            {sections.map((s, i) => (
              <li key={s.h}><a href={`#s${i + 1}`} className="text-emerald-700 underline-offset-4 hover:underline">{s.h}</a></li>
            ))}
          </ol>
        </nav>
        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.h} id={`s${i + 1}`} className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-navy-900">{i + 1}. {s.h}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-navy-800">
                {s.p.map((p) => (
                  <p key={p} className={p.startsWith("[") ? "rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700" : undefined}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
