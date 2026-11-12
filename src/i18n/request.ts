import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { getMessages } from "@/messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: getMessages(locale),
    // All schedules are shown in Saudi time, regardless of the visitor's device.
    timeZone: "Asia/Riyadh",
  };
});
