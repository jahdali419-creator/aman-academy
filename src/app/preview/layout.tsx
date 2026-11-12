import type { Metadata, Viewport } from "next";
import { getLang } from "./lang";
import { Runtime } from "./runtime";
import "./preview.css";

/**
 * DESIGN PREVIEWS — isolated from the application.
 * Nothing here is linked from the live site. Delete src/app/preview and the
 * "preview" entry in src/proxy.ts to remove it completely.
 */
export const metadata: Metadata = {
  title: "Aman Academy · design previews",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const boot = `(function(){var d=document.documentElement;d.dataset.motion=matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced":"on"})()`;

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        {children}
        <Runtime />
      </body>
    </html>
  );
}
