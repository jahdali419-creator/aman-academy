import { Alexandria, Bricolage_Grotesque, Lalezar } from "next/font/google";
import { copy, links } from "../content";
import { getLang } from "../lang";
import { Elapsed, LangSwitch } from "../runtime";
import "./b.css";

const lalezar = Lalezar({ weight: "400", subsets: ["arabic", "latin"], variable: "--b-lalezar", display: "swap" });
const alexandria = Alexandria({ subsets: ["arabic", "latin"], variable: "--b-alex", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--b-bric", display: "swap" });
const fonts = [lalezar, alexandria, bricolage].map((f) => f.variable).join(" ");

export const metadata = { title: "Concept B · Signal" };

type S = React.CSSProperties;

function Plate({ short, rest }: { short: string; rest: string }) {
  return (
    <span className="cb-logo">
      <span className="cb-plate"><span>{short}</span><i aria-hidden="true" /></span>
      <span className="cb-logo-rest">{rest}</span>
    </span>
  );
}

function Arrow() {
  return (
    <svg className="cb-arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M3 12h17M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  );
}

const shapes = [
  <circle key="c" cx="100" cy="100" r="86" />,
  <path key="t" d="M100 16 190 178H10Z" />,
  <rect key="s" x="22" y="22" width="156" height="156" transform="rotate(45 100 100)" />,
];

export default async function ConceptB() {
  const lang = await getLang();
  const t = copy[lang];
  const to = links(lang);
  const rest = lang === "ar" ? "أكاديمية" : "Academy";

  return (
    <div className={`cb ${fonts}`}>
      <a className="pv-skip" href="#main">{t.nav.skip}</a>

      <header className="cb-head">
        <a className="cb-cell cb-cell--logo" href="/preview/concept-b" aria-label={t.brand}><Plate short={t.brandShort} rest={rest} /></a>
        <nav className="cb-nav" id="cb-menu" data-menu-panel aria-label={t.nav.menu}>
          <a href="#courses"><b>01</b>{t.nav.courses}</a>
          <a href="#how"><b>02</b>{t.nav.how}</a>
          <a href="#trust"><b>03</b>{t.nav.trust}</a>
          <a href="#companies"><b>04</b>{t.nav.companies}</a>
        </nav>
        <LangSwitch lang={lang} className="cb-lang" />
        <a className="cb-cell cb-cell--cta" href={to.courses}>{t.nav.cta}<Arrow /></a>
        <button type="button" className="cb-burger" data-menu-btn aria-expanded="false" aria-controls="cb-menu">
          <span className="pv-sr">{t.nav.menu}</span><i /><i /><i />
        </button>
      </header>

      <main id="main">
        <section className="cb-hero">
          <p className="cb-tag cb-in" style={{ "--d": 0 } as S}><i aria-hidden="true" />{t.heroB.eyebrow}</p>
          <h1 className="cb-h1">
            {t.heroB.title.map((line, i) => (
              <span key={i} className="cb-mask"><span className={`cb-in-line${i === 2 ? " is-hot" : ""}`} style={{ "--d": i } as S}>{line}</span></span>
            ))}
          </h1>
          <div className="cb-hero-side">
            <p className="cb-lead cb-in" style={{ "--d": 4 } as S}>{t.heroB.lead}</p>
            <a className="cb-round cb-in" style={{ "--d": 5 } as S} href={to.courses} data-magnetic>
              <span>{t.nav.cta}</span><Arrow />
            </a>
          </div>
          <p className="cb-timer cb-in" style={{ "--d": 6 } as S}>
            <span>{t.heroB.timerBefore}</span>
            <Elapsed className="cb-timer-n" />
            <span>{t.heroB.timerAfter}</span>
          </p>
        </section>

        <div className="cb-ticker" aria-hidden="true">
          <div className="cb-ticker-track">
            {[0, 1, 2, 3].map((k) => (
              <span key={k}>{t.ticker.map((x, i) => <b key={i}>{x}<i /></b>)}</span>
            ))}
          </div>
        </div>
        <p className="pv-sr">{t.ticker.join(" · ")}</p>

        <section className="cb-sec" id="courses">
          <header className="cb-sec-head" data-reveal>
            <p className="cb-tag"><i aria-hidden="true" />{t.courses.eyebrow}</p>
            <h2 className="cb-h2">{t.courses.title}</h2>
            <p className="cb-sec-lead">{t.courses.lead}</p>
          </header>
          <div className="cb-panels">
            {t.courses.items.map((c, i) => (
              <a key={c.slug} className="cb-panel" href={to.course(c.slug)} data-reveal style={{ "--i": i } as S}>
                <svg className="cb-shape" viewBox="0 0 200 200" aria-hidden="true">{shapes[i]}</svg>
                <span className="cb-panel-n">{c.n}</span>
                <span className="cb-panel-title">{c.title}</span>
                <span className="cb-panel-body">{c.body}</span>
                <span className="cb-panel-more">
                  <span className="cb-panel-topics">{c.topics.map((x, k) => <span key={k}>{x}</span>)}</span>
                  <span className="cb-panel-meta">
                    <span>{c.hours} {t.courses.hours}</span>
                    <span>{c.price} {t.courses.sar} <em>{t.courses.sample}</em></span>
                    <Arrow />
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="cb-sec cb-how" id="how">
          <header className="cb-how-head" data-reveal>
            <p className="cb-tag"><i aria-hidden="true" />{t.journey.eyebrow}</p>
            <h2 className="cb-h2">{t.journey.title}</h2>
          </header>
          <ol className="cb-steps">
            {t.journey.steps.map((s, i) => (
              <li key={i} data-reveal>
                <span className="cb-step-n" aria-hidden="true">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="cb-sec cb-trust" id="trust">
          <header className="cb-sec-head" data-reveal>
            <p className="cb-tag"><i aria-hidden="true" />{t.trust.eyebrow}</p>
            <h2 className="cb-h2">{t.trust.title}</h2>
          </header>
          <div className="cb-yn">
            <div className="cb-yn-col" data-reveal>
              <h3><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 25l11 11L41 12" /></svg>{t.trust.yes}</h3>
              <ul>{t.trust.yesList.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="cb-yn-col cb-yn-col--no" data-reveal style={{ "--i": 1 } as S}>
              <h3><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 10l28 28M38 10L10 38" /></svg>{t.trust.no}</h3>
              <ul>{t.trust.noList.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
          <div className="cb-notes">
            <p data-reveal><b>{t.trust.items[2].title}.</b> {t.trust.items[2].body}</p>
            <p data-reveal style={{ "--i": 1 } as S}><b>{t.trust.items[3].title}.</b> {t.trust.items[3].body}</p>
          </div>
        </section>

        <section className="cb-sec cb-co" id="companies">
          <header data-reveal>
            <p className="cb-tag"><i aria-hidden="true" />{t.companies.eyebrow}</p>
            <h2 className="cb-h2">{t.companies.title}</h2>
          </header>
          <div data-reveal style={{ "--i": 1 } as S}>
            <ul className="cb-co-list">{t.companies.items.map((x, i) => <li key={i}><b>{String(i + 1).padStart(2, "0")}</b>{x}</li>)}</ul>
            <a className="cb-btn" href={to.companies}>{t.companies.cta}<Arrow /></a>
          </div>
        </section>

        <section className="cb-final">
          <h2 className="cb-final-title" data-reveal>{t.cta.title}</h2>
          <div className="cb-final-row" data-reveal style={{ "--i": 1 } as S}>
            <p>{t.cta.lead}</p>
            <a className="cb-round cb-round--ink" href={to.courses} data-magnetic><span>{t.cta.primary}</span><Arrow /></a>
          </div>
        </section>
      </main>

      <footer className="cb-foot">
        <div className="cb-foot-cell"><Plate short={t.brandShort} rest={rest} /><p>{t.footer.blurb}</p></div>
        <nav className="cb-foot-cell" aria-label={t.brand}>
          <a href={to.courses}>{t.nav.courses}</a>
          <a href={to.companies}>{t.nav.companies}</a>
          <a href={to.verify}>{t.footer.verify}</a>
          <a href={to.contact}>{t.footer.contact}</a>
        </nav>
        <p className="cb-foot-cell cb-foot-note">{t.footer.note} <a href="/preview">{t.footer.all}</a></p>
      </footer>
    </div>
  );
}
