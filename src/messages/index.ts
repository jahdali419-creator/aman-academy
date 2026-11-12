/**
 * Single source of truth for translations. Each namespace is a JSON file per
 * locale in `src/messages/<locale>/<namespace>.json`. Add a namespace here.
 */
import ar_common from "./ar/common.json";
import ar_status from "./ar/status.json";
import ar_errors from "./ar/errors.json";
import ar_home from "./ar/home.json";
import ar_courses from "./ar/courses.json";
import ar_companies from "./ar/companies.json";
import ar_about from "./ar/about.json";
import ar_contact from "./ar/contact.json";
import ar_legal from "./ar/legal.json";
import ar_auth from "./ar/auth.json";
import ar_checkout from "./ar/checkout.json";
import ar_dashboard from "./ar/dashboard.json";
import ar_exam from "./ar/exam.json";
import ar_certificate from "./ar/certificate.json";
import ar_companyArea from "./ar/companyArea.json";
import ar_instructor from "./ar/instructor.json";
import ar_admin from "./ar/admin.json";
import ar_emails from "./ar/emails.json";
import en_common from "./en/common.json";
import en_status from "./en/status.json";
import en_errors from "./en/errors.json";
import en_home from "./en/home.json";
import en_courses from "./en/courses.json";
import en_companies from "./en/companies.json";
import en_about from "./en/about.json";
import en_contact from "./en/contact.json";
import en_legal from "./en/legal.json";
import en_auth from "./en/auth.json";
import en_checkout from "./en/checkout.json";
import en_dashboard from "./en/dashboard.json";
import en_exam from "./en/exam.json";
import en_certificate from "./en/certificate.json";
import en_companyArea from "./en/companyArea.json";
import en_instructor from "./en/instructor.json";
import en_admin from "./en/admin.json";
import en_emails from "./en/emails.json";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (locales as readonly string[]).includes(v);
export const dirOf = (locale: string) => (locale === "ar" ? "rtl" : "ltr");

type Messages = Record<string, Record<string, unknown>>;

const ar: Messages = { common: ar_common, status: ar_status, errors: ar_errors, home: ar_home, courses: ar_courses, companies: ar_companies, about: ar_about, contact: ar_contact, legal: ar_legal, auth: ar_auth, checkout: ar_checkout, dashboard: ar_dashboard, exam: ar_exam, certificate: ar_certificate, companyArea: ar_companyArea, instructor: ar_instructor, admin: ar_admin, emails: ar_emails };
const en: Messages = { common: en_common, status: en_status, errors: en_errors, home: en_home, courses: en_courses, companies: en_companies, about: en_about, contact: en_contact, legal: en_legal, auth: en_auth, checkout: en_checkout, dashboard: en_dashboard, exam: en_exam, certificate: en_certificate, companyArea: en_companyArea, instructor: en_instructor, admin: en_admin, emails: en_emails };

const all: Record<Locale, Messages> = { ar, en };
export function getMessages(locale: Locale): Messages {
  return all[locale];
}
