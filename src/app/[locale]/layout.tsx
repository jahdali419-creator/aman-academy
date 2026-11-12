import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Aref_Ruqaa, EB_Garamond, El_Messiri, Fraunces, Gulzar, IBM_Plex_Sans_Arabic, Marcellus, Readex_Pro } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { dirOf } from "@/messages";
import { config } from "@/server/config";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { SealRuntime } from "@/components/seal/client";
import "../globals.css";
import "@/components/seal/seal.css";

const body = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const heading = Readex_Pro({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-heading", display: "swap" });
// The Seal design (home page, header, footer): brand display and text faces, plus the two Medallion faces.
const gulzar = Gulzar({ weight: "400", subsets: ["arabic", "latin"], variable: "--a-gulzar", display: "swap" });
const messiri = El_Messiri({ subsets: ["arabic", "latin"], variable: "--a-messiri", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--a-fraunces", display: "swap" });
const garamond = EB_Garamond({ subsets: ["latin"], style: ["normal", "italic"], variable: "--a-garamond", display: "swap" });
const ruqaa = Aref_Ruqaa({ weight: ["400", "700"], subsets: ["arabic", "latin"], variable: "--md-ar", display: "swap" });
const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--md-en", display: "swap" });
const seal = [gulzar, messiri, fraunces, garamond, ruqaa, marcellus].map((f) => f.variable).join(" ");
const motionBoot = `(function(){var d=document.documentElement;d.dataset.motion=matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced":"on"})()`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    metadataBase: new URL(config.appUrl),
    title: { default: `${t("brand")} | ${t("brandOther")}`, template: `%s · ${t("brand")}` },
    description: t("footer.blurb"),
    applicationName: t("brand"),
    alternates: { languages: { ar: "/ar", en: "/en" } },
    icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = { themeColor: "#0b1b33", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${body.variable} ${heading.variable} ${seal}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBoot }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-navy-900 focus:px-5 focus:py-3 focus:text-white">
            {t("skipToContent")}
          </a>
          {config.demoMode ? (
            <div role="note" className="no-print bg-navy-950 px-4 py-2 text-center text-xs font-medium text-emerald-300">
              {t("demoBanner")}
            </div>
          ) : null}
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <SealRuntime />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
