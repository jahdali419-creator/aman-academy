import { getLocale, getTranslations } from "next-intl/server";
import type { courses, courseSessions, instructors } from "@/server/db/schema";
import { saveSessionAction } from "@/server/actions/admin";
import { pick, toRiyadhInput } from "@/lib/format";
import { ActionForm, Field, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";

type Session = typeof courseSessions.$inferSelect;
type Course = Pick<typeof courses.$inferSelect, "id" | "code" | "titleEn" | "titleAr">;
type Instructor = Pick<typeof instructors.$inferSelect, "id" | "nameEn" | "nameAr">;

/** Create/edit form for a live session. Times are entered and stored as Saudi time (Asia/Riyadh). */
export async function SessionForm({ session, courses, instructors }: { session?: Session; courses: Course[]; instructors: Instructor[] }) {
  const [t, tc, ts, locale] = await Promise.all([getTranslations("admin.sessionForm"), getTranslations("common"), getTranslations("status.session"), getLocale()]);

  return (
    <ActionForm action={saveSessionAction} className="space-y-6">
      {session ? <input type="hidden" name="id" value={session.id} /> : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("sections.schedule")}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <SelectField name="courseId" label={t("course")} defaultValue={session?.courseId ?? ""}>
            <option value="" disabled>
              {t("chooseCourse")}
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {pick(locale, c.titleEn, c.titleAr)}
              </option>
            ))}
          </SelectField>
          <SelectField name="instructorId" label={t("instructor")} hint={t("instructorHint")} defaultValue={session?.instructorId ?? ""} optional>
            <option value="">{t("noInstructor")}</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {pick(locale, i.nameEn, i.nameAr)}
              </option>
            ))}
          </SelectField>
          <Field
            name="startsAt"
            label={t("startsAt")}
            hint={tc("time.zone")}
            type="datetime-local"
            dir="ltr"
            defaultValue={session ? toRiyadhInput(session.startsAt) : undefined}
          />
          <Field name="endsAt" label={t("endsAt")} hint={tc("time.zone")} type="datetime-local" dir="ltr" defaultValue={session ? toRiyadhInput(session.endsAt) : undefined} />
          <SelectField name="language" label={tc("teaching.label")} defaultValue={session?.language ?? "ar"}>
            <option value="ar">{tc("teaching.ar")}</option>
            <option value="en">{tc("teaching.en")}</option>
          </SelectField>
          <Field name="maxSeats" label={t("maxSeats")} hint={t("maxSeatsHint")} type="number" inputMode="numeric" min={1} dir="ltr" defaultValue={session?.maxSeats ?? 20} />
          <SelectField name="status" label={t("status")} hint={t("statusHint")} defaultValue={session?.status ?? "scheduled"}>
            <option value="scheduled">{ts("scheduled")}</option>
            <option value="completed">{ts("completed")}</option>
            <option value="cancelled">{ts("cancelled")}</option>
          </SelectField>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("sections.joining")}</h2>
        <p className="mt-1 text-sm text-muted">{t("joiningLead")}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <SelectField name="provider" label={t("provider")} defaultValue={session?.provider ?? "teams"}>
            <option value="teams">{tc("provider.teams")}</option>
            <option value="zoom">{tc("provider.zoom")}</option>
          </SelectField>
          <Field
            name="joinUrl"
            label={t("joinUrl")}
            hint={t("joinUrlHint")}
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            maxLength={600}
            autoComplete="off"
            optional
            defaultValue={session?.joinUrl ?? undefined}
          />
          <TextareaField name="joinInstructionsEn" label={t("joinInstructionsEn")} dir="ltr" lang="en" rows={3} optional defaultValue={session?.joinInstructionsEn} />
          <TextareaField name="joinInstructionsAr" label={t("joinInstructionsAr")} dir="rtl" lang="ar" rows={3} optional defaultValue={session?.joinInstructionsAr} />
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>{session ? tc("actions.save") : t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
