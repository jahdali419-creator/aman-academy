import { getTranslations } from "next-intl/server";
import type { courses } from "@/server/db/schema";
import { saveCourseAction } from "@/server/actions/admin";
import { courseIconNames } from "@/components/site/course-icon";
import { ActionForm, CheckboxField, Field, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";

type Course = typeof courses.$inferSelect;

const joinLines = (items: string[] | undefined) => (items ?? []).join("\n");

/** Create/edit form for a course. Bilingual fields sit side by side (English LTR, Arabic RTL). */
export async function CourseForm({ course }: { course?: Course }) {
  const [t, tc] = await Promise.all([getTranslations("admin.courseForm"), getTranslations("common")]);
  const en = (label: string) => t("enLabel", { label });
  const ar = (label: string) => t("arLabel", { label });

  return (
    <ActionForm action={saveCourseAction} className="space-y-6">
      {course ? <input type="hidden" name="id" value={course.id} /> : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("sections.identity")}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field name="code" label={t("code")} hint={t("codeHint")} defaultValue={course?.code} dir="ltr" maxLength={20} />
          <Field name="slug" label={t("slug")} hint={t("slugHint")} defaultValue={course?.slug} dir="ltr" maxLength={80} />
          <Field name="titleEn" label={en(t("titleField"))} defaultValue={course?.titleEn} dir="ltr" lang="en" maxLength={160} />
          <Field name="titleAr" label={ar(t("titleField"))} defaultValue={course?.titleAr} dir="rtl" lang="ar" maxLength={160} />
          <SelectField name="icon" label={t("icon")} defaultValue={course?.icon ?? "shield"}>
            {courseIconNames.map((name) => (
              <option key={name} value={name}>
                {t.has(`icons.${name}`) ? t(`icons.${name}`) : name}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("sections.content")}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextareaField name="summaryEn" label={en(t("summary"))} defaultValue={course?.summaryEn} dir="ltr" lang="en" rows={3} optional />
          <TextareaField name="summaryAr" label={ar(t("summary"))} defaultValue={course?.summaryAr} dir="rtl" lang="ar" rows={3} optional />
          <TextareaField name="overviewEn" label={en(t("overview"))} defaultValue={course?.overviewEn} dir="ltr" lang="en" rows={6} optional />
          <TextareaField name="overviewAr" label={ar(t("overview"))} defaultValue={course?.overviewAr} dir="rtl" lang="ar" rows={6} optional />
        </div>
        <p className="mt-8 text-sm text-muted">{t("listHint")}</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextareaField name="outcomesEn" label={en(t("outcomes"))} defaultValue={joinLines(course?.outcomes.en)} dir="ltr" lang="en" rows={5} optional />
          <TextareaField name="outcomesAr" label={ar(t("outcomes"))} defaultValue={joinLines(course?.outcomes.ar)} dir="rtl" lang="ar" rows={5} optional />
          <TextareaField name="audienceEn" label={en(t("audience"))} defaultValue={joinLines(course?.audience.en)} dir="ltr" lang="en" rows={4} optional />
          <TextareaField name="audienceAr" label={ar(t("audience"))} defaultValue={joinLines(course?.audience.ar)} dir="rtl" lang="ar" rows={4} optional />
          <TextareaField name="prerequisitesEn" label={en(t("prerequisites"))} defaultValue={joinLines(course?.prerequisites.en)} dir="ltr" lang="en" rows={3} optional />
          <TextareaField name="prerequisitesAr" label={ar(t("prerequisites"))} defaultValue={joinLines(course?.prerequisites.ar)} dir="rtl" lang="ar" rows={3} optional />
          <TextareaField name="practicalNoteEn" label={en(t("practicalNote"))} hint={t("practicalNoteHint")} defaultValue={course?.practicalNoteEn} dir="ltr" lang="en" rows={3} optional />
          <TextareaField name="practicalNoteAr" label={ar(t("practicalNote"))} hint={t("practicalNoteHint")} defaultValue={course?.practicalNoteAr} dir="rtl" lang="ar" rows={3} optional />
        </div>
        <Alert tone="info" className="mt-6">
          {course ? t("syllabusNote", { count: course.syllabus.length }) : t("syllabusNoteNew")}
        </Alert>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("sections.delivery")}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field name="durationMinutes" label={t("duration")} hint={t("durationHint")} type="number" inputMode="numeric" min={15} step={5} dir="ltr" defaultValue={course?.durationMinutes ?? 180} />
          <Field
            name="priceSar"
            label={t("price")}
            hint={t("priceHint")}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            dir="ltr"
            defaultValue={course ? course.priceHalalas / 100 : undefined}
          />
          <Field
            name="minAttendancePercent"
            label={t("minAttendance")}
            hint={t("minAttendanceHint")}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            dir="ltr"
            defaultValue={course?.minAttendancePercent ?? 80}
          />
          <Field
            name="certificateValidityMonths"
            label={t("validity")}
            hint={t("validityHint")}
            type="number"
            inputMode="numeric"
            min={1}
            dir="ltr"
            optional
            defaultValue={course?.certificateValidityMonths ?? undefined}
          />
        </div>
        <div className="mt-6">
          <CheckboxField name="published" label={t("published")} defaultChecked={course ? course.published : false} />
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>{course ? tc("actions.save") : t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
