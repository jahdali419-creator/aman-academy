import { getTranslations } from "next-intl/server";
import type { questions } from "@/server/db/schema";
import { saveQuestionAction } from "@/server/actions/admin";
import { ActionForm, CheckboxField, SubmitButton, TextareaField } from "@/components/ui/form";

type Question = typeof questions.$inferSelect;

/** Add/edit form for one exam question with exactly four bilingual options. Admin only: it shows the correct answer. */
export async function QuestionForm({ courseId, question }: { courseId: string; question?: Question }) {
  const [t, tc] = await Promise.all([getTranslations("admin.exam.question"), getTranslations("common")]);
  const group = `correct-${question?.id ?? "new"}`;

  return (
    <ActionForm action={saveQuestionAction} className="space-y-6">
      <input type="hidden" name="courseId" value={courseId} />
      {question ? <input type="hidden" name="questionId" value={question.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextareaField name="textEn" label={t("textEn")} defaultValue={question?.textEn} dir="ltr" lang="en" rows={3} />
        <TextareaField name="textAr" label={t("textAr")} defaultValue={question?.textAr} dir="rtl" lang="ar" rows={3} />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-navy-900">{t("options")}</legend>
        <p className="text-xs text-muted">{t("optionsHint")}</p>
        {[0, 1, 2, 3].map((i) => {
          const o = question?.options[i];
          const radioId = `${group}-${i}`;
          return (
            <div key={i} className="rounded-xl border border-line bg-paper p-4">
              <div className="flex items-center gap-2.5">
                <input
                  id={radioId}
                  type="radio"
                  name="correct"
                  value={i}
                  required
                  defaultChecked={!!o && o.id === question?.correctOptionId}
                  className="size-4.5 shrink-0 accent-emerald-600"
                />
                <label htmlFor={radioId} className="text-sm font-medium text-navy-900">
                  {t("markCorrect", { n: i + 1 })}
                </label>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <TextareaField name={`o${i}En`} label={t("optionEn", { n: i + 1 })} defaultValue={o?.en} dir="ltr" lang="en" rows={2} />
                <TextareaField name={`o${i}Ar`} label={t("optionAr", { n: i + 1 })} defaultValue={o?.ar} dir="rtl" lang="ar" rows={2} />
              </div>
            </div>
          );
        })}
      </fieldset>

      <CheckboxField name="isSample" label={t("isSample")} defaultChecked={question ? question.isSample : false} />

      <div className="flex justify-end">
        <SubmitButton>{question ? tc("actions.save") : t("add")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
