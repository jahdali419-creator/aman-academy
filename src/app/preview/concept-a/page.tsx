import { Aref_Ruqaa, EB_Garamond, El_Messiri, Fraunces, Gulzar, Marcellus } from "next/font/google";
import { copy, links } from "../content";
import { getLang } from "../lang";
import { Medallion } from "../medallion";
import { LangSwitch } from "../runtime";
import "./a.css";

const gulzar = Gulzar({ weight: "400", subsets: ["arabic", "latin"], variable: "--a-gulzar", display: "swap" });
const messiri = El_Messiri({ subsets: ["arabic", "latin"], variable: "--a-messiri", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--a-fraunces", display: "swap" });
const garamond = EB_Garamond({ subsets: ["latin"], style: ["normal", "italic"], variable: "--a-garamond", display: "swap" });
const ruqaa = Aref_Ruqaa({ weight: ["400", "700"], subsets: ["arabic", "latin"], variable: "--md-ar", display: "swap" });
const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--md-en", display: "swap" });
const fonts = [gulzar, messiri, fraunces, garamond, ruqaa, marcellus].map((f) => f.variable).join(" ");

export const metadata = { title: "Concept A · The Seal" };

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

export default async function ConceptA() {
  const lang = await getLang();
  const t = copy[lang];
  const to = links(lang);

  return (
    <div className={`ca ${fonts}`}>
      <a className="pv-skip" href="#main">{t.nav.skip}</a>

      <header className="ca-head">
        <a className="ca-logo" href="/preview/concept-a" aria-label={t.brand}>
          <Medallion id="a-h" className="ca-logo-mark" />
          <span className="ca-logo-word">{t.brand}</span>
        </a>
        <nav className="ca-nav" id="ca-menu" data-menu-panel aria-label={t.nav.menu}>
          <a href="#courses">{t.nav.courses}</a>
          <a href="#how">{t.nav.how}</a>
          <a href="#trust">{t.nav.trust}</a>
          <a href="#companies">{t.nav.companies}</a>
          <a className="ca-nav-cta" href={to.courses}>{t.nav.cta}</a>
        </nav>
        <div className="ca-tools">
          <LangSwitch lang={lang} className="ca-lang" />
          <a className="ca-btn ca-btn--line ca-head-cta" href={to.courses}>{t.nav.cta}</a>
          <button type="button" className="ca-burger" data-menu-btn aria-expanded="false" aria-controls="ca-menu">
            <span className="pv-sr">{t.nav.menu}</span>
            <i /><i />
          </button>
        </div>
      </header>

      <main id="main">
        <section className="ca-hero">
          <div className="ca-dial" aria-hidden="true">
            <svg viewBox="0 0 600 600" className="ca-dial-rings">
              <g className="ca-dial-outer"><Ticks count={180} r1={278} r2={290} className="ca-tk" /></g>
              <circle cx="300" cy="300" r="262" className="ca-ring" pathLength={1} />
              <g className="ca-dial-inner"><Ticks count={96} r1={222} r2={236} className="ca-tk ca-tk--soft" /></g>
              <circle cx="300" cy="300" r="204" className="ca-ring ca-ring--thin" pathLength={1} />
            </svg>
            <Medallion id="a-hero" className="ca-dial-mark" spin />
          </div>

          <div className="ca-hero-text">
            <p className="ca-eyebrow ca-load" style={{ "--d": 0 } as React.CSSProperties}>{t.heroA.eyebrow}</p>
            <h1 className="ca-h1">
              {t.heroA.title.map((line, i) => (
                <span key={i} className={`ca-load ca-h1-line${i === 1 ? " is-gold" : ""}`} style={{ "--d": i + 1 } as React.CSSProperties}>{line}</span>
              ))}
            </h1>
            <span className="ca-rule ca-load-rule" aria-hidden="true" />
            <p className="ca-lead ca-load" style={{ "--d": 3 } as React.CSSProperties}>{t.heroA.lead}</p>
            <div className="ca-actions ca-load" style={{ "--d": 4 } as React.CSSProperties}>
              <a className="ca-btn ca-btn--gold" href={to.courses} data-magnetic><span>{t.cta.primary}</span><Arrow /></a>
              <a className="ca-link" href="#how">{t.nav.how}</a>
            </div>
          </div>

          <dl className="ca-facts">
            {t.facts.map((f, i) => (
              <div key={i} className="ca-load" style={{ "--d": 5 + i } as React.CSSProperties}>
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
              {t.courses.items.map((c, i) => (
                <li key={c.slug} data-reveal style={{ "--i": i } as React.CSSProperties}>
                  <a href={to.course(c.slug)}>
                    <span className="ca-ledger-n">{c.n}</span>
                    <span className="ca-ledger-main">
                      <span className="ca-ledger-title">{c.title}</span>
                      <span className="ca-ledger-body">{c.body}</span>
                    </span>
                    <span className="ca-ledger-topics">{c.topics.join(" · ")}</span>
                    <span className="ca-ledger-meta">
                      <b>{c.hours} {t.courses.hours}</b>
                      <span>{c.price} {t.courses.sar} <em>{t.courses.sample}</em></span>
                    </span>
                    <Arrow />
                  </a>
                </li>
              ))}
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
                <Medallion id="a-how" className="ca-gauge-mark" />
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
                <li key={i} data-reveal style={{ "--i": i % 2 } as React.CSSProperties}>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </li>
              ))}
            </ul>
            <figure className="ca-record" data-reveal>
              <figcaption>{t.trust.record.label}</figcaption>
              <div className="ca-record-body">
                <Medallion id="a-rec" className="ca-record-mark" />
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
            <div data-reveal style={{ "--i": 1 } as React.CSSProperties}>
              <ul className="ca-co-list">
                {t.companies.items.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
              <a className="ca-btn ca-btn--line" href={to.companies}><span>{t.companies.cta}</span><Arrow /></a>
            </div>
          </div>
        </section>

        <section className="ca-sec ca-sec--cream ca-final">
          <div className="ca-wrap ca-final-grid" data-reveal>
            <Medallion id="a-fin" className="ca-final-mark" onLight />
            <div>
              <h2 className="ca-h2 ca-h2--xl">{t.cta.title}</h2>
              <p className="ca-sec-lead">{t.cta.lead}</p>
              <div className="ca-actions">
                <a className="ca-btn ca-btn--navy" href={to.courses} data-magnetic><span>{t.cta.primary}</span><Arrow /></a>
                <a className="ca-link" href={to.companies}>{t.cta.secondary}</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="ca-foot">
        <div className="ca-wrap ca-foot-grid">
          <div className="ca-foot-brand">
            <Medallion id="a-f" className="ca-foot-mark" />
            <p className="ca-logo-word">{t.brand}</p>
            <p>{t.footer.blurb}</p>
          </div>
          <nav aria-label={t.brand}>
            <a href={to.courses}>{t.nav.courses}</a>
            <a href={to.companies}>{t.nav.companies}</a>
            <a href={to.verify}>{t.footer.verify}</a>
            <a href={to.contact}>{t.footer.contact}</a>
          </nav>
          <p className="ca-foot-note">{t.footer.note} <a href="/preview">{t.footer.all}</a></p>
        </div>
      </footer>
    </div>
  );
}
