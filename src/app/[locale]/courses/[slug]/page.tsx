import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, BadgeCheck, CalendarX2, Check, ChevronLeft, CircleDashed, ClipboardCheck, Clock, Languages, UsersRound, Video } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { getViewer } from "@/server/auth/session";
import { enrolledSessionIds, getCourseBySlug, getExamRules, getInstructorsByIds, listUpcomingSessions } from "@/server/services/catalog";
import { startEnrollmentAction } from "@/server/actions/enrollment";
import { formatDuration, formatSar, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/form";
import { Alert, Badge, EmptyState, Eyebrow, Ltr } from "@/components/ui/primitives";
import { CourseIcon } from "@/components/site/course-icon";
import { SessionRow } from "@/components/site/session-row";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ session?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const course = await getCourseBySlug(await database(), slug);
  if (!course) return {};
  return { title: pick(locale, course.titleEn, course.titleAr), description: pick(locale, course.summaryEn, course.summaryAr) };
}

function Block({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line pt-10">
      <h2 className="text-2xl font-semibold text-navy-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((i) => (
        <li key={i} className="flex gap-3 text-navy-800">
          <Check aria-hidden className="mt-1 size-4.5 shrink-0 text-emerald-600" />
          {i}
        </li>
      ))}
    </ul>
  );
}

export default async function CoursePage({ params, searchParams }: Props) {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const db = await database();
  const course = await getCourseBySlug(db, slug);
  if (!course) notFound();
  const [t, tc, sessions, rules, viewer] = await Promise.all([
    getTranslations("courses.detail"),
    getTranslations("common"),
    listUpcomingSessions(db, { courseId: course.id }),
    getExamRules(db, course.id),
    getViewer(),
  ]);
  const [instructors, mine] = await Promise.all([
    getInstructorsByIds(db, [...new Set(sessions.map((s) => s.instructorId).filter((x): x is string => !!x))]),
    viewer ? enrolledSessionIds(db, viewer.id, course.id) : Promise.resolve(new Set<string>()),
  ]);
  const ar = locale === "ar";
  const list = (v: { en: string[]; ar: string[] }) => (ar ? v.ar : v.en);
  const languages = [...new Set(sessions.map((s) => s.language))];
  const selectedId = sessions.some((s) => s.id === sp.session) ? sp.session : undefined;

  const facts: [React.ReactNode, string, string][] = [
    [<Video key="v" aria-hidden className="size-5" />, t("format"), tc("format.live")],
    [<Clock key="c" aria-hidden className="size-5" />, t("duration"), formatDuration(course.durationMinutes, locale)],
    [<Languages key="l" aria-hidden className="size-5" />, t("language"), languages.length ? languages.map((l) => tc(`teaching.${l}`)).join(ar ? "، " : ", ") : "—"],
    [<Award key="a" aria-hidden className="size-5" />, t("certificate"), course.certificateValidityMonths ? t("certValid", { months: course.certificateValidityMonths }) : t("certNoExpiry")],
  ];

  return (
    <>
      <section className="bg-navy-900 bg-weave text-white">
        <div className="container-page py-12 sm:py-16">
          <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-navy-100 hover:text-white">
            <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {tc("nav.courses")}
          </Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            <CourseIcon name={course.icon} size="lg" className="bg-white/10 ring-1 ring-white/15" />
            <div className="min-w-0">
              <Ltr className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-semibold text-navy-100">{course.code}</Ltr>
              <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{pick(locale, course.titleEn, course.titleAr)}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-100">{pick(locale, course.summaryEn, course.summaryAr)}</p>
            </div>
          </div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(([icon, label, value]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-300">{icon}</span>
                <div className="min-w-0">
                  <dt className="text-xs text-navy-300">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <Eyebrow>{t("overview")}</Eyebrow>
            <p className="mt-3 text-lg leading-relaxed text-navy-800">{pick(locale, course.overviewEn, course.overviewAr)}</p>
          </section>

          {course.practicalNoteEn || course.practicalNoteAr ? (
            <Alert tone="warning" title={t("practicalTitle")}>
              <p>{pick(locale, course.practicalNoteEn, course.practicalNoteAr)}</p>
              <p className="mt-2 font-medium">{t("regulatedNote")}</p>
            </Alert>
          ) : null}

          <Block title={t("outcomes")}><Ticks items={list(course.outcomes)} /></Block>

          <div className="grid gap-10 border-t border-line pt-10 sm:grid-cols-2">
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-900">
                <UsersRound aria-hidden className="size-5 text-emerald-600" />
                {t("audience")}
              </h2>
              <ul className="mt-4 list-disc space-y-2 ps-5 text-navy-800 marker:text-emerald-600">
                {list(course.audience).map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-900">
                <ClipboardCheck aria-hidden className="size-5 text-emerald-600" />
                {t("prerequisites")}
              </h2>
              <ul className="mt-4 list-disc space-y-2 ps-5 text-navy-800 marker:text-emerald-600">
                {list(course.prerequisites).map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
          </div>

          {course.syllabus.length > 0 ? (
            <Block title={t("syllabus")}>
              <ol className="space-y-3">
                {course.syllabus.map((m, i) => (
                  <li key={i} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold text-emerald-600">{t("module", { n: i + 1 })}</p>
                    <h3 className="mt-1 text-lg font-semibold text-navy-900">{ar ? m.title.ar : m.title.en}</h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {list(m.topics).map((topic) => (
                        <li key={topic} className="rounded-full bg-paper-2 px-3 py-1 text-sm text-navy-800">{topic}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </Block>
          ) : null}

          <Block title={instructors.length > 1 ? t("instructors") : t("instructor")}>
            {instructors.length === 0 ? (
              <p className="text-muted">{t("noInstructor")}</p>
            ) : (
              <ul className="space-y-4">
                {instructors.map((i) => (
                  <li key={i.id} className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-4">
                      <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-xl font-semibold text-emerald-300">
                        {pick(locale, i.nameEn, i.nameAr).trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-navy-900">{pick(locale, i.nameEn, i.nameAr)}</h3>
                        <p className="text-sm text-muted">{pick(locale, i.titleEn, i.titleAr)}</p>
                      </div>
                      {i.isSample ? <Badge tone="warning" className="ms-auto shrink-0">{tc("sample")}</Badge> : null}
                    </div>
                    <p className="mt-4 leading-relaxed text-navy-800">{pick(locale, i.bioEn, i.bioAr)}</p>
                    <h4 className="mt-5 text-sm font-semibold text-navy-900">{t("credentials")}</h4>
                    <ul className="mt-2 space-y-2">
                      {i.credentials.map((c, k) => (
                        <li key={k} className="flex items-start gap-2.5 text-sm">
                          {c.verified ? <BadgeCheck aria-hidden className="mt-0.5 size-4.5 shrink-0 text-emerald-600" /> : <CircleDashed aria-hidden className="mt-0.5 size-4.5 shrink-0 text-amber-700" />}
                          <span className="text-navy-800">
                            {ar ? c.title.ar : c.title.en}
                            {c.issuer && c.issuer !== "—" ? <span className="text-muted"> · {t("issuer")}: {c.issuer}</span> : null}
                            <span className="ms-2 text-xs font-semibold text-muted">({c.verified ? t("credentialVerified") : t("credentialPending")})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {i.isSample ? <p className="mt-4 text-xs text-muted">{t("sampleInstructor")}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block id="sessions" title={t("sessions")}>
            <p className="-mt-2 text-muted">{t("sessionsLead")} {tc("time.zoneNote")}</p>
            {sessions.length === 0 ? (
              <div className="mt-6">
                <EmptyState icon={<CalendarX2 aria-hidden className="size-6" />} title={t("noSessions.title")} action={<ButtonLink href="/contact" variant="light">{tc("nav.contact")}</ButtonLink>}>
                  {t("noSessions.body")}
                </EmptyState>
              </div>
            ) : (
              <>
                <ul className="mt-6 space-y-3">
                  {sessions.map((s) => (
                      <SessionRow
                        key={s.id}
                        highlight={s.id === selectedId}
                        session={s}
                        course={course}
                        showCourse={false}
                        action={
                          mine.has(s.id) ? (
                            <ButtonLink href="/dashboard" variant="light" size="sm">{t("alreadyEnrolled")}</ButtonLink>
                          ) : s.seatsLeft === 0 ? (
                            <Badge>{tc("seats.full")}</Badge>
                          ) : (
                            <ActionButton action={startEnrollmentAction} fields={{ sessionId: s.id, back: `/courses/${course.slug}?session=${s.id}` }} variant={s.id === selectedId || !selectedId ? "primary" : "light"}>
                              {t("enroll")}
                            </ActionButton>
                          )
                        }
                      />
                  ))}
                </ul>
                {!viewer ? <p className="mt-4 text-sm text-muted">{t("signInToEnroll")}</p> : null}
              </>
            )}
          </Block>

          <Block title={t("requirements")}>
            <ol className="space-y-4">
              {[
                [t("attendanceTitle"), t("attendanceBody", { percent: course.minAttendancePercent })],
                [
                  t("examTitle"),
                  rules
                    ? t("examBody", { questions: rules.questionsPerAttempt, minutes: rules.durationMinutes, pass: rules.passingScorePercent, attempts: rules.maxAttempts }) +
                      (rules.retakeCooldownHours > 0 ? ` ${t("examRetake", { hours: rules.retakeCooldownHours })}` : "")
                    : "—",
                ],
                [t("certTitle"), t("certBody")],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-sm font-semibold text-emerald-300">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-navy-900">{title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Block>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-lift">
            <p className="text-sm text-muted">{t("price")}</p>
            <p className="mt-1 font-display text-4xl font-semibold text-navy-900">{formatSar(course.priceHalalas, locale)}</p>
            <p className="mt-1 text-xs text-muted">{t("priceNote")}</p>
            <ButtonLink href="#sessions" size="lg" className="mt-6 w-full">{t("chooseSession")}</ButtonLink>
            <ul className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-navy-800">
              <li className="flex gap-2.5"><Video aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />{tc("format.live")}</li>
              <li className="flex gap-2.5"><Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />{formatDuration(course.durationMinutes, locale)}</li>
              <li className="flex gap-2.5"><Award aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />{t("certBody").split(/[.。]/)[0]}.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
