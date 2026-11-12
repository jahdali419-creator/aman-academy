/**
 * Locale-aware formatting used on both server and client.
 * - Schedules are always shown in Saudi time (Asia/Riyadh).
 * - Latin digits and the Gregorian calendar are used in both languages so
 *   prices, dates and codes stay unambiguous in mixed Arabic/English text.
 */
export const TIME_ZONE = "Asia/Riyadh";
const tag = (locale: string) => (locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB-u-ca-gregory");

export function formatSar(halalas: number, locale: string, opts: { decimals?: boolean } = {}) {
  const whole = halalas % 100 === 0 && !opts.decimals;
  const n = new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(halalas / 100);
  return locale === "ar" ? `${n} ر.س` : `SAR ${n}`;
}

const fmt = (locale: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, ...o });

export const formatDate = (d: Date | string, locale: string) =>
  fmt(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export const formatDateLong = (d: Date | string, locale: string) =>
  fmt(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

export const formatTime = (d: Date | string, locale: string) =>
  fmt(locale, { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));

export const formatTimeRange = (a: Date | string, b: Date | string, locale: string) => `${formatTime(a, locale)} – ${formatTime(b, locale)}`;

export const formatDateTime = (d: Date | string, locale: string) => `${formatDate(d, locale)} · ${formatTime(d, locale)}`;

export const formatDay = (d: Date | string, locale: string) => fmt(locale, { day: "numeric" }).format(new Date(d));
export const formatMonthShort = (d: Date | string, locale: string) => fmt(locale, { month: "short" }).format(new Date(d));
export const formatWeekday = (d: Date | string, locale: string) => fmt(locale, { weekday: "long" }).format(new Date(d));

/** YYYY-MM-DD in Riyadh, for date filters. */
export const riyadhDateKey = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

/** Value for <input type="datetime-local"> expressed in Riyadh time. */
export function toRiyadhInput(d: Date | string) {
  const t = new Date(new Date(d).getTime() + 3 * 3_600_000);
  return t.toISOString().slice(0, 16);
}
/** Parse a datetime-local value entered as Riyadh time (UTC+3, no DST). */
export const fromRiyadhInput = (v: string) => new Date(`${v}:00+03:00`);

export function formatDuration(minutes: number, locale: string) {
  const h = minutes / 60;
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1);
  if (locale === "ar") return h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : h >= 3 && h <= 10 ? `${n} ساعات` : `${n} ساعة`;
  return h === 1 ? "1 hour" : `${n} hours`;
}

/** Pick the right language from a bilingual pair of columns. */
export const pick = (locale: string, en: string | null | undefined, ar: string | null | undefined) =>
  (locale === "ar" ? ar || en : en || ar) ?? "";

/** Saudi mobile numbers: accepts 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX. Returns E.164 or null. */
export function normalizeSaudiMobile(input: string): string | null {
  const digits = input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\d+]/g, "");
  const m = digits.match(/^(?:\+966|00966|966|0)?(5\d{8})$/);
  return m ? `+966${m[1]}` : null;
}

export function formatSaudiMobile(e164: string | null | undefined) {
  if (!e164) return "";
  const m = e164.match(/^\+966(5\d)(\d{3})(\d{4})$/);
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
