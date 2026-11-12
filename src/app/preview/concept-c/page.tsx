import { Instrument_Sans, Instrument_Serif, Markazi_Text, Zain } from "next/font/google";
import { copy, links } from "../content";
import { getLang } from "../lang";
import { LangSwitch } from "../runtime";
import "./c.css";

const markazi = Markazi_Text({ subsets: ["arabic", "latin"], variable: "--c-markazi", display: "swap" });
const zain = Zain({ weight: ["300", "400", "700", "800"], subsets: ["arabic", "latin"], variable: "--c-zain", display: "swap" });
const iserif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--c-iserif", display: "swap" });
const isans = Instrument_Sans({ subsets: ["latin"], variable: "--c-isans", display: "swap" });
const fonts = [markazi, zain, iserif, isans].map((f) => f.variable).join(" ");

export const metadata = { title: "Concept C · Stillness" };

type S = React.CSSProperties;

function ArchMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 44" aria-hidden="true">
      <path d="M5 42V20a15 15 0 0 1 30 0v22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle className="cc-mark-dot" cx="20" cy="29" r="5.2" />
    </svg>
  );
}

function Logo({ short, rest }: { short: string; rest: string }) {
  return (
    <span className="cc-logo">
      <ArchMark className="cc-logo-mark" />
      <span className="cc-logo-word">{short}</span>
      <span className="cc-logo-rest">{rest}</span>
    </span>
  );
}

function Arrow() {
  return (
    <svg className="cc-arrow" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function ConceptC() {
  const lang = await getLang();
  const t = copy[lang];
  const to = links(lang);
  const rest = lang === "ar" ? "أكاديمية" : "Academy";

  return (
    <div className={`cc ${fonts}`}>
      <a className="pv-skip" href="#main">{t.nav.skip}</a>

      <header className="cc-head">
        <a href="/preview/concept-c" aria-label={t.brand}><Logo short={t.brandShort} rest={rest} /></a>
        <nav className="cc-nav" id="cc-menu" data-menu-panel aria-label={t.nav.menu}>
          <a href="#evening">{t.nav.how}</a>
          <a href="#courses">{t.nav.courses}</a>
          <a href="#trust">{t.nav.trust}</a>
          <a href="#companies">{t.nav.companies}</a>
          <a className="cc-nav-cta" href={to.courses}>{t.nav.cta}</a>
        </nav>
        <div className="cc-tools">
          <LangSwitch lang={lang} className="cc-lang" />
          <a className="cc-btn cc-btn--sm" href={to.courses}>{t.nav.cta}</a>
          <button type="button" className="cc-burger" data-menu-btn aria-expanded="false" aria-controls="cc-menu">
            <span className="pv-sr">{t.nav.menu}</span><i /><i />
          </button>
        </div>
      </header>

      <main id="main">
        <section className="cc-hero">
          <div className="cc-hero-text">
            <p className="cc-eyebrow cc-in" style={{ "--d": 0 } as S}>{t.heroC.eyebrow}</p>
            <h1 className="cc-h1">
              {t.heroC.title.map((line, i) => (
                <span key={i} className={`cc-in${i === 1 ? " is-soft" : ""}`} style={{ "--d": i + 1 } as S}>{line}</span>
              ))}
            </h1>
            <p className="cc-lead cc-in" style={{ "--d": 3 } as S}>{t.heroC.lead}</p>
            <div className="cc-actions cc-in" style={{ "--d": 4 } as S}>
              <a className="cc-btn" href={to.courses} data-magnetic><span>{t.cta.primary}</span><Arrow /></a>
              <a className="cc-link" href="#evening">{t.evening.title}</a>
            </div>
          </div>
          <div className="cc-arch" aria-hidden="true">
            <div className="cc-arch-in">
              <i className="cc-moon" />
              <i className="cc-ringa" /><i className="cc-ringa cc-ringa--2" /><i className="cc-ringa cc-ringa--3" />
              <i className="cc-hill" /><i className="cc-hill cc-hill--2" />
              <i className="cc-home"><b /></i>
            </div>
          </div>
          <ul className="cc-facts cc-in" style={{ "--d": 6 } as S}>
            {t.facts.map((f, i) => <li key={i}><b>{f.k}</b><span>{f.v}</span></li>)}
          </ul>
        </section>

        <section className="cc-sec cc-evening" id="evening">
          <header className="cc-sec-head" data-reveal>
            <p className="cc-eyebrow">{t.evening.eyebrow}</p>
            <h2 className="cc-h2">{t.evening.title}</h2>
          </header>
          <ol className="cc-line" data-progress>
            {t.evening.items.map((e, i) => (
              <li key={i} data-reveal>
                <time>{e.t}</time>
                <div><h3>{e.title}</h3><p>{e.body}</p></div>
              </li>
            ))}
          </ol>
          <p className="cc-fine" data-reveal>{t.evening.note}</p>
        </section>

        <section className="cc-sec cc-courses" id="courses">
          <header className="cc-sec-head" data-reveal>
            <p className="cc-eyebrow">{t.courses.eyebrow}</p>
            <h2 className="cc-h2">{t.courses.title}</h2>
            <p className="cc-sec-lead">{t.courses.lead}</p>
          </header>
          <div className="cc-arches">
            {t.courses.items.map((c, i) => (
              <a key={c.slug} className={`cc-card cc-card--${i + 1}`} href={to.course(c.slug)} data-reveal style={{ "--i": i } as S}>
                <span className="cc-card-orb" aria-hidden="true" />
                <span className="cc-card-n">{c.n}</span>
                <span className="cc-card-title">{c.title}</span>
                <span className="cc-card-body">{c.body}</span>
                <span className="cc-card-topics">{c.topics.map((x, k) => <span key={k}>{x}</span>)}</span>
                <span className="cc-card-meta">
                  <span>{c.hours} {t.courses.hours}</span>
                  <span>{c.price} {t.courses.sar} <em>{t.courses.sample}</em></span>
                  <Arrow />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="cc-sec cc-trust" id="trust">
          <div className="cc-letter" data-reveal>
            <p className="cc-eyebrow">{t.trust.eyebrow}</p>
            <h2 className="cc-quote">{t.trust.lead}</h2>
            <p className="cc-sign"><ArchMark className="cc-sign-mark" />{t.brand}</p>
          </div>
          <ul className="cc-terms">
            {t.trust.items.map((x, i) => (
              <li key={i} data-reveal style={{ "--i": i % 2 } as S}>
                <ArchMark className="cc-term-mark" />
                <h3>{x.title}</h3>
                <p>{x.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="cc-co" id="companies">
          <div className="cc-co-in">
            <header data-reveal>
              <p className="cc-eyebrow">{t.companies.eyebrow}</p>
              <h2 className="cc-h2">{t.companies.title}</h2>
            </header>
            <div data-reveal style={{ "--i": 1 } as S}>
              <ul className="cc-co-list">{t.companies.items.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <a className="cc-btn cc-btn--light" href={to.companies}><span>{t.companies.cta}</span><Arrow /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="cc-foot">
        <div className="cc-foot-cta" data-reveal>
          <h2 className="cc-h2 cc-h2--xl">{t.cta.title}</h2>
          <p>{t.cta.lead}</p>
          <div className="cc-actions">
            <a className="cc-btn cc-btn--light" href={to.courses} data-magnetic><span>{t.cta.primary}</span><Arrow /></a>
            <a className="cc-link" href={to.companies}>{t.cta.secondary}</a>
          </div>
        </div>
        <div className="cc-foot-row">
          <div><Logo short={t.brandShort} rest={rest} /><p>{t.footer.blurb}</p></div>
          <nav aria-label={t.brand}>
            <a href={to.courses}>{t.nav.courses}</a>
            <a href={to.companies}>{t.nav.companies}</a>
            <a href={to.verify}>{t.footer.verify}</a>
            <a href={to.contact}>{t.footer.contact}</a>
          </nav>
        </div>
        <p className="cc-foot-note">{t.footer.note} <a href="/preview">{t.footer.all}</a></p>
      </footer>
    </div>
  );
}
