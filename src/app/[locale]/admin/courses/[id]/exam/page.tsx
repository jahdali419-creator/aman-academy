import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, ListChecks } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { getExamAdmin } from "@/server/services/admin";
import { saveExamConfigAction, setQuestionActiveAction } from "@/server/actions/admin";
import { pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton, ActionForm, CheckboxField, Field, SubmitButton } from "@/components/ui/form";
import { Alert, Badge, Card, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";
import { BackLink } from "@/components/admin/back-link";
import { QuestionForm } from "@/components/admin/question-form";

export const dynamic = "force-dynamic";

export default async function AdminExamPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, tc, db] = await Promise.all([getTranslations("admin"), getTranslations("common"), database()]);
  const data = await getExamAdmin(db, viewer, id);
  if (!data) notFound();
  const { course, exam } = data;
  // Stable order: questions seeded together share a timestamp, so break ties by id.
  const questions = [...data.questions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const activeCount = questions.filter((q) => q.active).length;
  const sampleCount = questions.filter((q) => q.isSample).length;
  const other = locale === "ar" ? "en" : "ar";

  return (
    <>
      <BackLink href="/admin/courses">{t("courses.back")}</BackLink>
      <PageHeader
        eyebrow={<Ltr>{course.code}</Ltr>}
        title={t("exam.title", { course: pick(locale, course.titleEn, course.titleAr) })}
        lead={t("exam.lead")}
        actions={
          <ButtonLink href={`/admin/courses/${course.id}`} variant="light">
            {t("exam.editCourse")}
          </ButtonLink>
        }
      />

      <Alert tone="warning" title={t("exam.reviewTitle")}>
        {t("exam.reviewBody")}
      </Alert>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("exam.config.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("exam.config.lead")}</p>
        <ActionForm action={saveExamConfigAction} className="mt-5 space-y-6">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field name="durationMinutes" label={t("exam.config.duration")} type="number" inputMode="numeric" min={5} dir="ltr" defaultValue={exam.durationMinutes} />
            <Field name="passingScorePercent" label={t("exam.config.passingScore")} type="number" inputMode="numeric" min={1} max={100} dir="ltr" defaultValue={exam.passingScorePercent} />
            <Field name="maxAttempts" label={t("exam.config.maxAttempts")} type="number" inputMode="numeric" min={1} dir="ltr" defaultValue={exam.maxAttempts} />
            <Field
              name="questionsPerAttempt"
              label={t("exam.config.questionsPerAttempt")}
              hint={t("exam.config.questionsPerAttemptHint", { count: activeCount })}
              type="number"
              inputMode="numeric"
              min={1}
              dir="ltr"
              defaultValue={exam.questionsPerAttempt}
            />
            <Field
              name="retakeCooldownHours"
              label={t("exam.config.cooldown")}
              hint={t("exam.config.cooldownHint")}
              type="number"
              inputMode="numeric"
              min={0}
              dir="ltr"
              defaultValue={exam.retakeCooldownHours}
            />
          </div>
          <div className="space-y-3">
            <CheckboxField name="shuffleQuestions" label={t("exam.config.shuffleQuestions")} defaultChecked={exam.shuffleQuestions} />
            <CheckboxField name="shuffleOptions" label={t("exam.config.shuffleOptions")} defaultChecked={exam.shuffleOptions} />
          </div>
          <div className="flex justify-end">
            <SubmitButton>{tc("actions.save")}</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <section aria-labelledby="question-bank" className="space-y-4">
        <div>
          <h2 id="question-bank" className="text-lg font-semibold text-navy-900">
            {t("exam.bank.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("exam.bank.summary", { total: questions.length, active: activeCount, sample: sampleCount })}</p>
        </div>
        {activeCount < exam.questionsPerAttempt ? (
          <Alert tone="danger" role="note">
            {t("exam.bank.tooFew", { active: activeCount, needed: exam.questionsPerAttempt })}
          </Alert>
        ) : null}
        {questions.length === 0 ? (
          <EmptyState icon={<ListChecks aria-hidden className="size-5" />} title={t("exam.bank.empty.title")}>
            {t("exam.bank.empty.body")}
          </EmptyState>
        ) : (
          <ol className="space-y-4">
            {questions.map((q, i) => (
              <li key={q.id}>
                <Card className={q.active ? "p-6" : "bg-paper p-6"}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted">{t("exam.bank.number", { n: i + 1 })}</span>
                        {q.isSample ? <Badge tone="warning">{tc("sample")}</Badge> : null}
                        {q.active ? <Badge tone="success">{t("exam.bank.active")}</Badge> : <Badge>{t("exam.bank.inactive")}</Badge>}
                      </div>
                      <p className="mt-2 font-semibold text-navy-900">{pick(locale, q.textEn, q.textAr)}</p>
                      <p className="mt-1 text-sm text-muted" dir={other === "ar" ? "rtl" : "ltr"} lang={other}>
                        {pick(other, q.textEn, q.textAr)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <ActionButton action={setQuestionActiveAction} fields={{ id: q.id, active: q.active ? "0" : "1" }}>
                        {q.active ? t("exam.bank.deactivate") : t("exam.bank.activate")}
                      </ActionButton>
                    </div>
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {q.options.map((o) => {
                      const correct = o.id === q.correctOptionId;
                      return (
                        <li
                          key={o.id}
                          className={
                            correct
                              ? "flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700"
                              : "flex items-start gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm text-navy-800"
                          }
                        >
                          {correct ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" /> : <span aria-hidden className="size-4 shrink-0" />}
                          <span className="min-w-0">
                            <span className="block font-medium">{pick(locale, o.en, o.ar)}</span>
                            <span className="block text-xs opacity-80" dir={other === "ar" ? "rtl" : "ltr"} lang={other}>
                              {pick(other, o.en, o.ar)}
                            </span>
                            {correct ? <span className="sr-only">{t("exam.bank.correct")}</span> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <details className="mt-5 border-t border-line pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-navy-800 hover:text-navy-900">{t("exam.bank.edit")}</summary>
                    <div className="mt-5">
                      <QuestionForm courseId={course.id} question={q} />
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">{t("exam.question.newTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("exam.question.newLead")}</p>
        <div className="mt-5">
          <QuestionForm courseId={course.id} />
        </div>
      </Card>
    </>
  );
}
