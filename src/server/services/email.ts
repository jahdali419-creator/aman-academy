import { createTranslator } from "use-intl/core";
import type { Db } from "../db/client";
import { emailOutbox } from "../db/schema";
import { getMessages, isLocale, defaultLocale } from "@/messages";

export type EmailTemplate = "welcome" | "passwordReset" | "invitation" | "enrollmentConfirmed" | "certificateIssued";

/**
 * Send a translated transactional email.
 * DEMO: messages are stored in the `email_outbox` table (visible to admins).
 * PRODUCTION: deliver through a real provider here and keep the outbox as a log
 * (without storing secrets such as reset links in plain text if not required).
 */
export async function sendEmail(
  db: Db,
  args: { to: string; locale: string; template: EmailTemplate; params: Record<string, string> },
) {
  const locale = isLocale(args.locale) ? args.locale : defaultLocale;
  const t = createTranslator({ locale, messages: getMessages(locale), namespace: "emails" }) as unknown as (
    key: string,
    params?: Record<string, string>,
  ) => string;
  const subject = t(`${args.template}.subject`, args.params);
  const body = [t("greeting", { name: args.params.name ?? "" }), t(`${args.template}.body`, args.params), t("signature")].join("\n\n");
  await db.insert(emailOutbox).values({ toEmail: args.to, locale, template: args.template, subject, body });
}
