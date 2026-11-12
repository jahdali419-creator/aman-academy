import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, CalendarDays, Clock, Video } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDuration, formatSar, formatTime } from "@/lib/format";
import type { PublicSession } from "@/server/services/catalog";
import { CourseIcon } from "./course-icon";
import { Ltr } from "@/components/ui/primitives";

type CourseLite = { slug: string; code: string; icon: string; titleEn: string; titleAr: string; summaryEn: string; summaryAr: string; durationMinutes: number; priceHalalas: number };

export async function CourseCard({ course, next }: { course: CourseLite; next?: PublicSession | null }) {
  const [locale, t, tc] = await Promise.all([getLocale(), getTranslations("home.courses"), getTranslations("common")]);
  const ar = locale === "ar";
  return (
    <article className="group relative flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <CourseIcon name={course.icon} size="lg" />
        <Ltr className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-muted">{course.code}</Ltr>
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-navy-900">
        <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 after:rounded-3xl">
          {ar ? course.titleAr : course.titleEn}
        </Link>
      </h3>
      <p className="mt-3 flex-1 leading-relaxed text-muted">{ar ? course.summaryAr : course.summaryEn}</p>
      <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
        <div className="flex items-center gap-2.5 text-navy-800">
          <Video aria-hidden className="size-4 text-emerald-600" />
          <dt className="sr-only">{tc("format.live")}</dt>
          <dd>{tc("format.live")}</dd>
          <span aria-hidden className="text-line-strong">·</span>
          <Clock aria-hidden className="size-4 text-emerald-600" />
          <dd>{formatDuration(course.durationMinutes, locale)}</dd>
        </div>
        <div className="flex items-start gap-2.5 text-navy-800">
          <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <dt className="shrink-0 text-muted">{t("next")}:</dt>
          <dd className="font-medium">
            {next ? (
              <>
                {formatDate(next.startsAt, locale)} · <bdi>{formatTime(next.startsAt, locale)}</bdi>
              </>
            ) : (
              t("none")
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted">{t("from")}</p>
          <p className="font-display text-2xl font-semibold text-navy-900">{formatSar(course.priceHalalas, locale)}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
          {tc("actions.viewCourse")}
          <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
        </span>
      </div>
    </article>
  );
}
