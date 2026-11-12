import type { MetadataRoute } from "next";

/**
 * Web app manifest: lets the site be added to a phone's home screen.
 * No service worker is registered, so nothing (and in particular no
 * authenticated page, exam, joining link or certificate) is cached offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "أكاديمية أمان | Aman Academy",
    short_name: "Aman Academy",
    description: "Live safety training in Saudi Arabia",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "ar",
    dir: "rtl",
    background_color: "#fbf8f3",
    theme_color: "#0a1c36",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
