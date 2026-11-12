import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Clock, Languages, Video } from "lucide-react";
import type { PublicSession } from "@/server/services/catalog";
import { formatDay, formatDuration, formatMonthShort, formatSar, formatTimeRange, formatWeekday } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export function SeatsBadge({ seatsLeft, label }: { seatsLeft: number; label: string }) {
  return <Badge tone={seatsLeft === 0 ? "neutral" : seatsLeft <= 5 ? "warning" : "success"}>{label}</Badge>;
}

/** One bookable session in a list. Uses only PUBLIC session data. */
export async function SessionRow({
  session,
  course,
  showCourse = true,
  action,
  highlight,
}: {
  session: PublicSession;
  course: { slug: string; titleEn: string; titleAr: string; priceHalalas: number; durationMinutes: number };
  showCourse?: boolean;
  action?: React.ReactNode;
  highlight?: boolean;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")]);
  const title = locale === "ar" ? course.titleAr : course.titleEn;
  const full = session.seatsLeft === 0;
  return (
    <li
      aria-current={highlight ? "true" : undefined}
      className={`group flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:shadow-lift sm:flex-row sm:items-center sm:gap-6 sm:p-5 ${highlight ? "border-emerald-600 ring-2 ring-emerald-600/25" : "border-line"}`}
    >
      <div className="flex items-center gap-4 sm:w-52 sm:shrink-0">
        <div className="grid w-16 shrink-0 place-items-center rounded-xl bg-navy-900 py-2 text-white">
          <span className="font-display text-2xl font-semibold leading-none">{formatDay(session.startsAt, locale)}</span>
          <span className="mt-1 text-xs text-navy-300">{formatMonthShort(session.startsAt, locale)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-navy-900">{formatWeekday(session.startsAt, locale)}</p>
          <p className="text-sm text-muted">
            <bdi>{formatTimeRange(session.startsAt, session.endsAt, locale)}</bdi>
          </p>
          <p className="text-xs text-muted">{t("time.zone")}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {showCourse ? <p className="font-display text-lg font-semibold text-navy-900">{title}</p> : null}
        <ul className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
          <li className="inline-flex items-center gap-1.5">
            <Languages aria-hidden className="size-4" />
            <span className="sr-only">{t("teaching.label")}: </span>
            {t(`teaching.${session.language}`)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock aria-hidden className="size-4" />
            {formatDuration(course.durationMinutes, locale)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Video aria-hidden className="size-4" />
            {t(`provider.${session.provider}`)}
          </li>
          <li>
            <SeatsBadge seatsLeft={session.seatsLeft} label={session.seatsLeft <= 5 && session.seatsLeft > 0 ? t("seats.few", { count: session.seatsLeft }) : t("seats.left", { count: session.seatsLeft })} />
          </li>
        </ul>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
        <p className="font-display text-lg font-semibold text-navy-900">{formatSar(course.priceHalalas, locale)}</p>
        {action ??
          (full ? (
            <Badge>{t("seats.full")}</Badge>
          ) : (
            <ButtonLink href={`/courses/${course.slug}?session=${session.id}#sessions`} variant="light" size="sm">
              {t("actions.viewCourse")}
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </ButtonLink>
          ))}
      </div>
    </li>
  );
}
