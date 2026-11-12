import { getTranslations } from "next-intl/server";
import { submitInquiryAction } from "@/server/actions/public";
import { ActionForm, Field, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";

/** Contact / company inquiry form. `kind` decides which fields are shown. */
export async function InquiryForm({ kind }: { kind: "contact" | "company" }) {
  const t = await getTranslations(kind === "company" ? "companies.inquiry" : "contact");
  const tc = await getTranslations("companies.inquiry");
  return (
    <ActionForm action={submitInquiryAction} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />
      {/* Honeypot field, hidden from people and assistive technology */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label={t("name")} autoComplete="name" maxLength={120} />
        <Field name="email" type="email" label={t("email")} autoComplete="email" dir="ltr" inputMode="email" className="text-start" />
        <Field name="phone" type="tel" label={t("phone")} optional autoComplete="tel" dir="ltr" inputMode="tel" placeholder="05X XXX XXXX" className="text-start" />
        {kind === "company" ? (
          <>
            <Field name="company" label={tc("company")} autoComplete="organization" maxLength={160} />
            <SelectField name="headcount" label={tc("headcount")} optional defaultValue="">
              <option value="">{tc("choose")}</option>
              {(["1-10", "11-50", "51-200", "200+"] as const).map((v) => (
                <option key={v} value={v}>
                  {tc(`headcountOptions.${v}`)}
                </option>
              ))}
            </SelectField>
          </>
        ) : null}
      </div>
      <TextareaField name="message" label={t("message")} hint={kind === "company" ? tc("messageHint") : undefined} maxLength={2000} rows={5} />
      <SubmitButton size="lg">{t("submit")}</SubmitButton>
    </ActionForm>
  );
}
