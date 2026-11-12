import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { markAttendanceAction, updateJoinDetailsAction } from "@/server/actions/instructor";
import { getSessionForDelivery } from "@/server/services/instructor";
import { formatDate, formatTimeRange, pick } from "@/lib/format";
import { attendanceTone, progressTone } from "@/components/company/tones";
import { ActionForm, Field, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { Alert, Badge, Card, DataTable, DefinitionRow, EmptyState, Ltr, PageHeader, type Tone } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const sessionTone: Record<string, Tone> = { scheduled: "info", completed: "success", cancelled: "danger" };

export default async function InstructorSessionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "instructor");
  const [t, ts, tc, db] = await Promise.all([getTranslations("instructor.session"), getTranslations("status"), getTranslations("common"), database()]);

  // Returns null for sessions that are not assigned to this instructor.
  const data = /^[\w-]{1,64}$/.test(id) ? await getSessionForDelivery(db, viewer, id).catch(() => null) : null;
  if (!data) notFound();
  const { session, course, roster } = data;
  const started = session.startsAt <= new Date();

  return (
    <div className="space-y-10">
      <div>
        <Link href="/instructor" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900">
          <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
        <div className="mt-4">
          <PageHeader
            title={pick(locale, course.titleEn, course.titleAr)}
            lead={`${formatDate(session.startsAt, locale)} · ${formatTimeRange(session.startsAt, session.endsAt, locale)} · ${tc("time.zone")}`}
            actions={<Badge tone={sessionTone[session.status]}>{ts(`session.${session.status}`)}</Badge>}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="facts-h">
          <Card className="h-full p-6">
            <h2 id="facts-h" className="text-lg font-semibold text-navy-900">
              {t("facts.title")}
            </h2>
            <dl className="mt-3 divide-y divide-line">
              <DefinitionRow label={t("facts.course")}>{pick(locale, course.titleEn, course.titleAr)}</DefinitionRow>
              <DefinitionRow label={t("facts.code")}>
                <Ltr>{course.code}</Ltr>
              </DefinitionRow>
              <DefinitionRow label={t("facts.date")}>{formatDate(session.startsAt, locale)}</DefinitionRow>
              <DefinitionRow label={t("facts.time")}>
                {formatTimeRange(session.startsAt, session.endsAt, locale)}
                <span className="ms-2 text-sm font-normal text-muted">{tc("time.zone")}</span>
              </DefinitionRow>
              <DefinitionRow label={t("facts.language")}>{tc(`teaching.${session.language}`)}</DefinitionRow>
              <DefinitionRow label={t("facts.provider")}>{tc(`provider.${session.provider}`)}</DefinitionRow>
              <DefinitionRow label={t("facts.enrolled")}>{t("facts.enrolledValue", { enrolled: roster.length, max: session.maxSeats })}</DefinitionRow>
              <DefinitionRow label={t("facts.status")}>{ts(`session.${session.status}`)}</DefinitionRow>
            </dl>
          </Card>
        </section>

        <section aria-labelledby="join-h">
          <Card className="h-full p-6">
            <h2 id="join-h" className="text-lg font-semibold text-navy-900">
              {t("join.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("join.body")}</p>
            {!session.joinUrl ? (
              <Alert tone="warning" className="mt-5">
                {t("join.missing")}
              </Alert>
            ) : null}
            <ActionForm action={updateJoinDetailsAction} className="mt-6">
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="grid gap-5">
                <Field
                  name="joinUrl"
                  label={t("join.url")}
                  hint={t("join.urlHint")}
                  type="url"
                  dir="ltr"
                  inputMode="url"
                  optional
                  placeholder="https://"
                  maxLength={600}
                  autoComplete="off"
                  defaultValue={session.joinUrl ?? ""}
                />
                <TextareaField
                  name="joinInstructionsEn"
                  label={t("join.instructionsEn")}
                  hint={t("join.instructionsHint")}
                  optional
                  dir="ltr"
                  lang="en"
                  maxLength={1000}
                  defaultValue={session.joinInstructionsEn ?? ""}
                />
                <TextareaField
                  name="joinInstructionsAr"
                  label={t("join.instructionsAr")}
                  optional
                  dir="rtl"
                  lang="ar"
                  maxLength={1000}
                  defaultValue={session.joinInstructionsAr ?? ""}
                />
              </div>
              <div className="mt-6">
                <SubmitButton>{t("join.submit")}</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        </section>
      </div>

      <section aria-labelledby="attendance-h" className="space-y-5">
        <h2 id="attendance-h" className="text-xl font-semibold text-navy-900">
          {t("attendance.title")}
        </h2>
        <Alert tone="info" title={t("attendance.noticeTitle")}>
          {t("attendance.notice", { min: course.minAttendancePercent })}
        </Alert>
        {!started ? (
          <Alert tone="warning" title={t("attendance.notStartedTitle")}>
            {t("attendance.notStarted")}
          </Alert>
        ) : null}

        {roster.length === 0 ? (
          <EmptyState icon={<Users aria-hidden className="size-6" />} title={t("attendance.emptyTitle")}>
            {t("attendance.emptyBody")}
          </EmptyState>
        ) : (
          <DataTable caption={t("attendance.caption")} head={[t("attendance.learner"), t("attendance.progress"), t("attendance.recorded"), t("attendance.record")]}>
            {roster.map((r) => {
              const name = pick(locale, r.name, r.nameAr);
              const who = <span className="sr-only"> {t("attendance.forLearner", { name })}</span>;
              return (
                <tr key={r.enrollmentId}>
                  <td className="font-semibold text-navy-900">{name}</td>
                  <td>
                    <Badge tone={progressTone(r.status)}>{ts(`progress.${r.status}`)}</Badge>
                    {r.reason ? <p className="mt-1.5 max-w-52 text-xs text-red-700">{ts(`reason.${r.reason}`)}</p> : null}
                  </td>
                  <td>
                    <Badge tone={attendanceTone(r.attendance?.status)}>
                      {r.attendance
                        ? t("attendance.recordedValue", { status: ts(`attendance.${r.attendance.status}`), percent: r.attendance.percent })
                        : ts("attendance.pending")}
                    </Badge>
                  </td>
                  <td>
                    <ActionForm action={markAttendanceAction}>
                      <input type="hidden" name="enrollmentId" value={r.enrollmentId} />
                      <div className="grid min-w-[26rem] grid-cols-[9rem_6.5rem_1fr] items-start gap-3">
                        <SelectField
                          name="status"
                          label={
                            <>
                              {t("attendance.status")}
                              {who}
                            </>
                          }
                          defaultValue={r.attendance?.status ?? "present"}
                          disabled={!started}
                        >
                          <option value="present">{ts("attendance.present")}</option>
                          <option value="partial">{ts("attendance.partial")}</option>
                          <option value="absent">{ts("attendance.absent")}</option>
                        </SelectField>
                        <Field
                          name="percent"
                          label={
                            <>
                              {t("attendance.percent")}
                              {who}
                            </>
                          }
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          step={1}
                          dir="ltr"
                          defaultValue={r.attendance?.percent ?? 100}
                          disabled={!started}
                        />
                        <Field
                          name="note"
                          label={
                            <>
                              {t("attendance.note")}
                              {who}
                            </>
                          }
                          optional
                          maxLength={300}
                          autoComplete="off"
                          disabled={!started}
                        />
                      </div>
                      <div className="mt-3">
                        <SubmitButton size="sm" variant="secondary" disabled={!started}>
                          {t("attendance.submit")}
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </section>
    </div>
  );
}
