import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { config } from "@/server/config";
import { listPublishedCourses } from "@/server/services/catalog";
import { formatDuration, pick } from "@/lib/format";
import { copy } from "@/components/seal/copy";
import { Medallion } from "@/components/seal/medallion";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: { absolute: `${t("meta.title")} · ${(await getTranslations({ locale, namespace: "common" }))("brand")}` } };
}

const v = (vars: Record<string, number>) => vars as CSSProperties;

function Ticks({ count, r1, r2, className }: { count: number; r1: number; r2: number; className?: string }) {
  const d = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const outer = i % 5 === 0 ? r2 + 6 : r2;
    return `M${(300 + Math.cos(a) * r1).toFixed(1)} ${(300 + Math.sin(a) * r1).toFixed(1)}L${(300 + Math.cos(a) * outer).toFixed(1)} ${(300 + Math.sin(a) * outer).toFixed(1)}`;
  }).join("");
  return <path className={className} d={d} fill="none" />;
}

function Arrow() {
  return (
    <svg className="ca-arrow" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Home page in The Seal design. Courses, prices and durations come from the catalogue. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";
  const t = copy[ar ? "ar" : "en"];
  const courses = (await listPublishedCourses(await database())).slice(0, 3);
  const topicsBySlug = new Map(t.courses.items.map((c) => [c.slug, c.topics]));
  // The design sets Arabic numerals in Arabic; the rest of the site keeps Latin digits.
  const digits = (s: string) => (ar ? s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : s);
  const price = (halalas: number) => digits(new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(halalas / 100));

  return (
    <div className="ca ca-home">
      <section className="ca-hero">
        <div className="ca-dial" aria-hidden="true">
          <svg viewBox="0 0 600 600" className="ca-dial-rings">
            <g className="ca-dial-outer"><Ticks count={180} r1={278} r2={290} className="ca-tk" /></g>
            <circle cx="300" cy="300" r="262" className="ca-ring" pathLength={1} />
            <g className="ca-dial-inner"><Ticks count={96} r1={222} r2={236} className="ca-tk ca-tk--soft" /></g>
            <circle cx="300" cy="300" r="204" className="ca-ring ca-ring--thin" pathLength={1} />
          </svg>
          <Medallion id="home-hero" className="ca-dial-mark" spin />
        </div>

        <div className="ca-hero-text">
          <p className="ca-eyebrow ca-load" style={v({ "--d": 0 })}>{t.hero.eyebrow}</p>
          <h1 className="ca-h1">
            {t.hero.title.map((line, i) => (
              <span key={i} className={`ca-load ca-h1-line${i === 1 ? " is-gold" : ""}`} style={v({ "--d": i + 1 })}>{line}</span>
            ))}
          </h1>
          <span className="ca-rule ca-load-rule" aria-hidden="true" />
          <p className="ca-lead ca-load" style={v({ "--d": 3 })}>{t.hero.lead}</p>
          <div className="ca-actions ca-load" style={v({ "--d": 4 })}>
            <Link className="ca-btn ca-btn--gold" href="/courses" data-magnetic><span>{t.cta.primary}</span><Arrow /></Link>
            <a className="ca-link" href="#how">{t.nav.how}</a>
          </div>
        </div>

        <dl className="ca-facts">
          {t.facts.map((f, i) => (
            <div key={i} className="ca-load" style={v({ "--d": 5 + i })}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ca-sec ca-sec--cream" id="courses">
        <div className="ca-wrap">
          <header className="ca-sec-head" data-reveal>
            <p className="ca-eyebrow">{t.courses.eyebrow}</p>
            <h2 className="ca-h2">{t.courses.title}</h2>
            <p className="ca-sec-lead">{t.courses.lead}</p>
          </header>
          <ol className="ca-ledger">
            {courses.map((c, i) => {
              const topics = topicsBySlug.get(c.slug);
              return (
                <li key={c.id} data-reveal style={v({ "--i": i })}>
                  <Link href={`/courses/${c.slug}`}>
                    <span className="ca-ledger-n">{digits(String(i + 1).padStart(2, "0"))}</span>
                    <span className="ca-ledger-main">
                      <span className="ca-ledger-title">{pick(locale, c.titleEn, c.titleAr)}</span>
                      <span className="ca-ledger-body">{pick(locale, c.summaryEn, c.summaryAr)}</span>
                    </span>
                    <span className="ca-ledger-topics">{topics ? topics.join(" · ") : ""}</span>
                    <span className="ca-ledger-meta">
                      <b>{digits(formatDuration(c.durationMinutes, locale))}</b>
                      <span>
                        {price(c.priceHalalas)} {t.courses.sar}
                        {config.demoMode ? <> <em>{t.courses.sample}</em></> : null}
                      </span>
                    </span>
                    <Arrow />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="ca-sec ca-sec--navy ca-how" id="how" data-progress>
        <div className="ca-wrap ca-how-grid">
          <div className="ca-how-side">
            <header data-reveal>
              <p className="ca-eyebrow">{t.journey.eyebrow}</p>
              <h2 className="ca-h2">{t.journey.title}</h2>
            </header>
            <div className="ca-gauge" aria-hidden="true">
              <svg viewBox="0 0 600 600">
                <g className="ca-gauge-turn"><Ticks count={120} r1={262} r2={280} className="ca-tk" /></g>
                <circle cx="300" cy="300" r="236" className="ca-ring ca-ring--thin ca-ring--static" />
                <circle cx="300" cy="300" r="236" className="ca-gauge-fill" pathLength={1} transform="rotate(-90 300 300)" />
              </svg>
              <Medallion id="home-how" className="ca-gauge-mark" />
            </div>
          </div>
          <ol className="ca-steps">
            {t.journey.steps.map((s, i) => (
              <li key={i} data-reveal>
                <span className="ca-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ca-sec ca-sec--ivory" id="trust">
        <div className="ca-wrap ca-trust">
          <header className="ca-sec-head" data-reveal>
            <p className="ca-eyebrow">{t.trust.eyebrow}</p>
            <h2 className="ca-h2">{t.trust.title}</h2>
            <p className="ca-sec-lead">{t.trust.lead}</p>
          </header>
          <ul className="ca-clauses">
            {t.trust.items.map((c, i) => (
              <li key={i} data-reveal style={v({ "--i": i % 2 })}>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
          <figure className="ca-record" data-reveal>
            <figcaption>{t.trust.record.label}</figcaption>
            <div className="ca-record-body">
              <Medallion id="home-rec" className="ca-record-mark" />
              <dl>
                <div><dt>{t.trust.record.holder}</dt><dd className="ca-ph" /></div>
                <div><dt>{t.trust.record.course}</dt><dd className="ca-ph ca-ph--s" /></div>
                <div><dt>{t.trust.record.date}</dt><dd className="ca-ph ca-ph--xs" /></div>
              </dl>
              <div className="ca-record-id">
                <span dir="ltr">{t.trust.record.number}</span>
                <b>{t.trust.record.status}</b>
              </div>
            </div>
          </figure>
        </div>
      </section>

      <section className="ca-sec ca-sec--navy" id="companies">
        <div className="ca-wrap ca-co">
          <header data-reveal>
            <p className="ca-eyebrow">{t.companies.eyebrow}</p>
            <h2 className="ca-h2">{t.companies.title}</h2>
          </header>
          <div data-reveal style={v({ "--i": 1 })}>
            <ul className="ca-co-list">
              {t.companies.items.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <Link className="ca-btn ca-btn--line" href="/companies"><span>{t.companies.cta}</span><Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="ca-sec ca-sec--cream ca-final">
        <div className="ca-wrap ca-final-grid" data-reveal>
          <Medallion id="home-fin" className="ca-final-mark" onLight />
          <div>
            <h2 className="ca-h2 ca-h2--xl">{t.cta.title}</h2>
            <p className="ca-sec-lead">{t.cta.lead}</p>
            <div className="ca-actions">
              <Link className="ca-btn ca-btn--navy" href="/courses" data-magnetic><span>{t.cta.primary}</span><Arrow /></Link>
              <Link className="ca-link" href="/companies">{t.cta.secondary}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
