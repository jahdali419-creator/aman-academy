import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { LogOut, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getViewer, homePathFor } from "@/server/auth/session";
import { signOutAction } from "@/server/actions/auth";
import { Medallion } from "@/components/seal/medallion";
import { LangPill, SealNavLink } from "@/components/seal/client";

/** Site header in The Seal design. Solid navy on inner pages; floats over the hero on the home page. */
export async function Header() {
  const [t, viewer, locale] = await Promise.all([getTranslations("common"), getViewer(), getLocale()]);
  const links = [
    { href: "/courses", label: t("nav.courses") },
    { href: "/companies", label: t("nav.companies") },
    { href: "/about", label: t("nav.about") },
    { href: "/verify", label: t("nav.verify") },
    { href: "/contact", label: t("nav.contact") },
  ];
  const home = viewer ? homePathFor(viewer) : null;
  const homeLabel = viewer
    ? viewer.role === "admin"
      ? t("nav.admin")
      : viewer.role === "instructor"
        ? t("nav.instructor")
        : viewer.org?.role === "manager"
          ? t("nav.company")
          : t("nav.dashboard")
    : "";
  const displayName = viewer ? (locale === "ar" ? viewer.nameAr || viewer.name : viewer.name) : "";

  return (
    <div className="ca ca-bar ca-head-slot no-print">
      <header className="ca-head">
        <Link href="/" className="ca-logo" aria-label={t("brand")}>
          <Medallion id="site-h" className="ca-logo-mark" />
          <span className="ca-logo-word">{t("brand")}</span>
        </Link>

        <nav className="ca-nav" id="site-menu" data-menu-panel aria-label={t("nav.main")}>
          {links.map((l) => (
            <SealNavLink key={l.href} href={l.href}>
              {l.label}
            </SealNavLink>
          ))}
          {viewer && home ? (
            <>
              <Link className="ca-nav-cta" href={home}>{homeLabel}</Link>
              <Link className="ca-nav-cta" href="/settings">{t("nav.settings")}</Link>
              <form className="ca-nav-out" action={signOutAction}>
                <button type="submit">{t("nav.signOut")}</button>
              </form>
            </>
          ) : (
            <>
              <Link className="ca-nav-cta" href="/register">{t("nav.register")}</Link>
              <Link className="ca-nav-cta" href="/sign-in">{t("nav.signIn")}</Link>
            </>
          )}
        </nav>

        <div className="ca-tools">
          <Suspense>
            <LangPill label={t("language.switchAria")} />
          </Suspense>
          {viewer && home ? (
            <>
              <Link className="ca-btn ca-btn--line ca-head-cta" href={home}>{homeLabel}</Link>
              <Link className="ca-icon" href="/settings" aria-label={t("nav.settings")} title={displayName}>
                <UserRound aria-hidden className="size-4.5" />
              </Link>
              <form action={signOutAction} className="contents">
                <button type="submit" className="ca-icon" aria-label={t("nav.signOut")} title={t("nav.signOut")}>
                  <LogOut aria-hidden className="size-4.5 rtl:-scale-x-100" />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="ca-head-link" href="/sign-in">{t("nav.signIn")}</Link>
              <Link className="ca-btn ca-btn--line ca-head-cta" href="/register">{t("nav.register")}</Link>
            </>
          )}
          <button type="button" className="ca-burger" data-menu-btn aria-expanded="false" aria-controls="site-menu">
            <span className="sr-only">{t("nav.openMenu")}</span>
            <i /><i />
          </button>
        </div>
      </header>
    </div>
  );
}
