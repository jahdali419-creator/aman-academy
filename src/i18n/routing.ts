import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@/messages";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  // New visitors always start in Arabic. The remembered choice is handled in src/proxy.ts.
  localeDetection: false,
  localeCookie: false,
});
