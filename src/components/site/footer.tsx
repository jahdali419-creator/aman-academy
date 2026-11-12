import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Medallion } from "@/components/seal/medallion";

/** Site footer in The Seal design. */
export async function Footer() {
  const t = await getTranslations("common");
  const col = (title: string, links: [string, string][]) => (
    <nav aria-label={title}>
      <h2>{title}</h2>
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
  return (
    <footer className="ca ca-foot no-print">
      <div className="ca-wrap ca-foot-grid ca-foot-grid--site">
        <div className="ca-foot-brand">
          <Medallion id="site-f" className="ca-foot-mark" />
          <p className="ca-logo-word">{t("brand")}</p>
          <p className="ca-foot-tag">{t("tagline")}</p>
          <p className="ca-foot-blurb">{t("footer.blurb")}</p>
        </div>
        {col(t("footer.learn"), [
          ["/courses", t("nav.courses")],
          ["/companies", t("nav.companies")],
          ["/verify", t("nav.verify")],
        ])}
        {col(t("footer.organisation"), [
          ["/about", t("nav.about")],
          ["/contact", t("nav.contact")],
          ["/sign-in", t("nav.signIn")],
        ])}
        {col(t("footer.legal"), [
          ["/legal/privacy", t("footer.privacy")],
          ["/legal/terms", t("footer.terms")],
          ["/legal/refunds", t("footer.refunds")],
        ])}
        <div className="ca-foot-note">
          <p>{t("footer.rights", { year: String(new Date().getFullYear()) })}</p>
          <p>{t("footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
