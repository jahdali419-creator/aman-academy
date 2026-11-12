import { getTranslations, setRequestLocale } from "next-intl/server";
import { Armchair } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { assignSeatAction, buySeatsAction, unassignSeatAction } from "@/server/actions/company";
import { listPublishedCourses, listUpcomingSessions } from "@/server/services/catalog";
import { getSeatSummary, listEmployees } from "@/server/services/company";
import { formatDate, formatSar, formatTimeRange, pick } from "@/lib/format";
import { ActionButton, ActionForm, Field, SelectField, SubmitButton } from "@/components/ui/form";
import { Alert, Badge, Card, DataTable, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CompanySeatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "manager");
  const [t, tc, db] = await Promise.all([getTranslations("companyArea.seats"), getTranslations("common"), database()]);
  const [seats, employees, courses, upcoming] = await Promise.all([
    getSeatSummary(db, viewer),
    listEmployees(db, viewer),
    listPublishedCourses(db),
    listUpcomingSessions(db),
  ]);

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const preselected = typeof query.course === "string" && courseById.has(query.course) ? query.course : undefined;
  const withSeats = new Set(seats.filter((s) => s.remaining > 0).map((s) => s.courseId));
  const hasSeats = withSeats.size > 0;
  const sessions = upcoming.filter((s) => withSeats.has(s.courseId) && s.seatsLeft > 0);

  const now = new Date();
  const assignments = employees
    .flatMap((e) => e.enrollments.map((p) => ({ employee: e, p })))
    .filter(({ p }) => p.enrollment.status === "active" && !!p.enrollment.seatPurchaseId && p.session.startsAt > now)
    .sort((a, b) => a.p.session.startsAt.getTime() - b.p.session.startsAt.getTime());

  return (
    <div className="space-y-12">
      <PageHeader title={t("title")} lead={t("lead")} />

      {seats.length > 0 ? (
        <section aria-labelledby="summary-h">
          <h2 id="summary-h" className="sr-only">
            {t("summary.title")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seats.map((s) => (
              <li key={s.courseId}>
                <Card className="flex h-full items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">{pick(locale, s.titleEn, s.titleAr)}</p>
                    <Ltr className="text-xs text-muted">{s.code}</Ltr>
                  </div>
                  <Badge tone={s.remaining > 0 ? "success" : "neutral"} className="shrink-0">
                    {t("summary.line", { remaining: s.remaining, purchased: s.purchased })}
                  </Badge>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="buy">
          <Card className="h-full p-6">
            <h2 id="buy" className="scroll-mt-24 text-lg font-semibold text-navy-900">
              {t("buy.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("buy.body")}</p>
            {courses.length === 0 ? (
              <Alert tone="info" className="mt-6">
                {t("buy.noCourses")}
              </Alert>
            ) : (
              <ActionForm action={buySeatsAction} className="mt-6">
                <div className="grid gap-5">
                  <SelectField name="courseId" label={t("buy.course")} defaultValue={preselected ?? courses[0].id}>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t("buy.courseOption", { title: pick(locale, c.titleEn, c.titleAr), price: formatSar(c.priceHalalas, locale) })}
                      </option>
                    ))}
                  </SelectField>
                  <Field
                    name="quantity"
                    label={t("buy.quantity")}
                    hint={t("buy.quantityHint")}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={200}
                    step={1}
                    defaultValue={5}
                    dir="ltr"
                    className="max-w-40"
                  />
                </div>
                <p className="mt-5 text-sm text-muted">{t("buy.vatNote")}</p>
                <div className="mt-6">
                  <SubmitButton>{t("buy.submit")}</SubmitButton>
                </div>
              </ActionForm>
            )}
          </Card>
        </section>

        <section aria-labelledby="assign">
          <Card className="h-full p-6">
            <h2 id="assign" className="scroll-mt-24 text-lg font-semibold text-navy-900">
              {t("assign.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("assign.body")}</p>
            {!hasSeats ? (
              <Alert tone="info" title={t("assign.noSeatsTitle")} className="mt-6">
                {t("assign.noSeatsBody")}
              </Alert>
            ) : sessions.length === 0 ? (
              <Alert tone="info" title={t("assign.noSessionsTitle")} className="mt-6">
                {t("assign.noSessionsBody")}
              </Alert>
            ) : (
              <ActionForm action={assignSeatAction} className="mt-6">
                <div className="grid gap-5">
                  <SelectField name="userId" label={t("assign.employee")}>
                    {employees.map((e) => (
                      <option key={e.userId} value={e.userId}>
                        {pick(locale, e.name, e.nameAr)} ({e.email})
                      </option>
                    ))}
                  </SelectField>
                  <SelectField name="sessionId" label={t("assign.session")} hint={t("assign.zoneNote", { zone: tc("time.zone") })}>
                    {sessions.map((s) => {
                      const c = courseById.get(s.courseId);
                      return (
                        <option key={s.id} value={s.id}>
                          {t("assign.sessionOption", {
                            course: pick(locale, c?.titleEn, c?.titleAr),
                            date: formatDate(s.startsAt, locale),
                            time: formatTimeRange(s.startsAt, s.endsAt, locale),
                            language: tc(`teaching.${s.language}`),
                            seats: tc("seats.left", { count: s.seatsLeft }),
                          })}
                        </option>
                      );
                    })}
                  </SelectField>
                </div>
                <div className="mt-6">
                  <SubmitButton>{t("assign.submit")}</SubmitButton>
                </div>
              </ActionForm>
            )}
          </Card>
        </section>
      </div>

      <section aria-labelledby="current-h" className="space-y-4">
        <div>
          <h2 id="current-h" className="text-xl font-semibold text-navy-900">
            {t("current.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("current.body")}</p>
        </div>
        {assignments.length === 0 ? (
          <EmptyState icon={<Armchair aria-hidden className="size-6" />} title={t("current.emptyTitle")}>
            {t("current.emptyBody")}
          </EmptyState>
        ) : (
          <DataTable caption={t("current.caption")} head={[t("current.employee"), t("current.course"), t("current.session"), t("current.actions")]}>
            {assignments.map(({ employee, p }) => (
              <tr key={p.enrollment.id}>
                <td>
                  <p className="font-semibold text-navy-900">{pick(locale, employee.name, employee.nameAr)}</p>
                  <Ltr className="mt-0.5 break-all text-xs text-muted">{employee.email}</Ltr>
                </td>
                <td>{pick(locale, p.course.titleEn, p.course.titleAr)}</td>
                <td>
                  <p>{formatDate(p.session.startsAt, locale)}</p>
                  <p className="text-xs text-muted">
                    {formatTimeRange(p.session.startsAt, p.session.endsAt, locale)} · {tc("time.zoneShort")} · {tc(`teaching.${p.session.language}`)}
                  </p>
                </td>
                <td>
                  <ActionButton action={unassignSeatAction} fields={{ id: p.enrollment.id }} confirm={t("current.releaseConfirm")}>
                    {t("current.release")}
                  </ActionButton>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
