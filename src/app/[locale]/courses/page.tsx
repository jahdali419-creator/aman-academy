import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarX2, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { listPublishedCourses, listUpcomingSessions } from "@/server/services/catalog";
import { riyadhDateKey } from "@/lib/format";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/primitives";
import { CourseCard } from "@/components/site/course-card";
import { SessionRow } from "@/components/site/session-row";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "courses" }))("catalog.meta") };
}

const fieldClass =
  "block w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[0.95rem] text-navy-900 placeholder:text-muted/70 hover:border-navy-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; course?: string; lang?: string; from?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [t, tc, db] = await Promise.all([getTranslations("courses.catalog"), getTranslations("common"), database()]);
  const [courses, sessions] = await Promise.all([listPublishedCourses(db), listUpcomingSessions(db)]);

  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const lang = sp.lang === "ar" || sp.lang === "en" ? sp.lang : "";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : "";
  const courseSlug = courses.some((c) => c.slug === sp.course) ? sp.course! : "";
  const filtered = !!(q || lang || from || courseSlug);

  const matchesText = (c: (typeof courses)[number]) =>
    !q || [c.titleEn, c.titleAr, c.summaryEn, c.summaryAr, c.code, c.overviewEn, c.overviewAr].some((v) => v.toLowerCase().includes(q));
  const sessionOk = (s: (typeof sessions)[number]) => (!lang || s.language === lang) && (!from || riyadhDateKey(s.startsAt) >= from);

  const visibleSessions = sessions.filter(sessionOk);
  const visibleCourses = courses.filter(
    (c) => matchesText(c) && (!courseSlug || c.slug === courseSlug) && (!(lang || from) || visibleSessions.some((s) => s.courseId === c.id)),
  );
  const ids = new Set(visibleCourses.map((c) => c.id));
  const listed = visibleSessions.filter((s) => ids.has(s.courseId));
  const byId = new Map(courses.map((c) => [c.id, c]));

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading eyebrow={t("eyebrow")} title={<span>{t("title")}</span>} lead={t("lead")} />

      <form method="get" role="search" className="mt-10 rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <fieldset>
          <legend className="sr-only">{t("filters.legend")}</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <label htmlFor="f-q" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("filters.search")}</label>
              <input id="f-q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder={t("filters.searchPlaceholder")} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="f-course" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("filters.course")}</label>
              <select id="f-course" name="course" defaultValue={courseSlug} className={fieldClass}>
                <option value="">{t("filters.allCourses")}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.slug}>{locale === "ar" ? c.titleAr : c.titleEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-lang" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("filters.language")}</label>
              <select id="f-lang" name="lang" defaultValue={lang} className={fieldClass}>
                <option value="">{t("filters.anyLanguage")}</option>
                <option value="ar">{tc("teaching.ar")}</option>
                <option value="en">{tc("teaching.en")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-from" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("filters.from")}</label>
              <input id="f-from" name="from" type="date" defaultValue={from} min={riyadhDateKey(new Date())} className={fieldClass} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" className={buttonClass("secondary")}>{t("filters.apply")}</button>
            {filtered ? <Link href="/courses" className={buttonClass("ghost")}>{t("filters.clear")}</Link> : null}
            <p role="status" className="ms-auto text-sm text-muted">{t("results", { count: visibleCourses.length })}</p>
          </div>
        </fieldset>
      </form>

      {visibleCourses.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={<SearchX aria-hidden className="size-6" />} title={t("empty.title")} action={<ButtonLink href="/courses" variant="light">{t("filters.clear")}</ButtonLink>}>
            {t("empty.body")}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((c) => (
              <CourseCard key={c.id} course={c} next={listed.find((s) => s.courseId === c.id && s.seatsLeft > 0) ?? listed.find((s) => s.courseId === c.id) ?? null} />
            ))}
          </div>

          <section className="mt-20" aria-labelledby="sessions-h">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="sessions-h" className="text-2xl font-semibold text-navy-900 sm:text-3xl">{t("sessionsTitle")}</h2>
              <p className="text-sm text-muted">{t("sessionsCount", { count: listed.length })} · {tc("time.zone")}</p>
            </div>
            {listed.length === 0 ? (
              <div className="mt-8">
                <EmptyState icon={<CalendarX2 aria-hidden className="size-6" />} title={t("noSessions.title")} action={filtered ? <ButtonLink href="/courses" variant="light">{t("filters.clear")}</ButtonLink> : <ButtonLink href="/contact" variant="light">{tc("nav.contact")}</ButtonLink>}>
                  {t("noSessions.body")}
                </EmptyState>
              </div>
            ) : (
              <ul className="mt-8 space-y-3">
                {listed.map((s) => (
                  <SessionRow key={s.id} session={s} course={byId.get(s.courseId)!} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
