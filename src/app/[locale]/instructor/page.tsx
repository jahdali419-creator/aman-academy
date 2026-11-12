import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, CalendarDays, UserRoundX } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listAssignedSessions } from "@/server/services/instructor";
import { formatDate, formatTimeRange, pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge, DataTable, EmptyState, Ltr, PageHeader, type Tone } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const sessionTone: Record<string, Tone> = { scheduled: "info", completed: "success", cancelled: "danger" };

export default async function InstructorHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "instructor");
  const [t, ts, tc] = await Promise.all([getTranslations("instructor"), getTranslations("status"), getTranslations("common")]);

  // Administrators may enter this area but have no instructor profile of their own.
  if (!viewer.instructorId) {
    return (
      <EmptyState icon={<UserRoundX aria-hidden className="size-6" />} title={t("noProfile.title")}>
        {t("noProfile.body")}
      </EmptyState>
    );
  }

  const sessions = await listAssignedSessions(await database(), viewer);
  const now = new Date();
  const upcoming = sessions.filter((s) => s.status === "scheduled" && s.endsAt > now);
  const past = sessions.filter((s) => !(s.status === "scheduled" && s.endsAt > now)).reverse();

  const table = (rows: typeof sessions, caption: string, warnMissingLink: boolean) => (
    <DataTable
      caption={caption}
      head={[t("list.course"), t("list.when"), t("list.language"), t("list.provider"), t("list.enrolled"), t("list.status"), <span key="open" className="sr-only">{t("list.open")}</span>]}
    >
      {rows.map((s) => (
        <tr key={s.id}>
          <td>
            <p className="font-semibold text-navy-900">{pick(locale, s.titleEn, s.titleAr)}</p>
            <Ltr className="text-xs text-muted">{s.code}</Ltr>
          </td>
          <td>
            <p className="whitespace-nowrap">{formatDate(s.startsAt, locale)}</p>
            <p className="whitespace-nowrap text-xs text-muted">
              {formatTimeRange(s.startsAt, s.endsAt, locale)} · {tc("time.zone")}
            </p>
          </td>
          <td>{tc(`teaching.${s.language}`)}</td>
          <td>{tc(`provider.${s.provider}`)}</td>
          <td className="whitespace-nowrap">{t("list.enrolledValue", { enrolled: s.enrolled, max: s.maxSeats })}</td>
          <td>
            <div className="flex flex-col items-start gap-1.5">
              <Badge tone={sessionTone[s.status]}>{ts(`session.${s.status}`)}</Badge>
              {warnMissingLink && !s.hasJoinUrl ? <Badge tone="warning">{t("list.noJoinLink")}</Badge> : null}
            </div>
          </td>
          <td>
            <ButtonLink href={`/instructor/sessions/${s.id}`} size="sm" variant="light">
              {t("list.open")}
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </ButtonLink>
          </td>
        </tr>
      ))}
    </DataTable>
  );

  return (
    <div className="space-y-10">
      <PageHeader title={t("layout.title")} lead={t("layout.lead")} />
      {sessions.length === 0 ? (
        <EmptyState icon={<CalendarDays aria-hidden className="size-6" />} title={t("list.emptyTitle")}>
          {t("list.emptyBody")}
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="upcoming-h" className="space-y-4">
            <h2 id="upcoming-h" className="text-xl font-semibold text-navy-900">
              {t("list.upcoming")}
            </h2>
            {upcoming.length === 0 ? <p className="text-sm text-muted">{t("list.noUpcoming")}</p> : table(upcoming, t("list.captionUpcoming"), true)}
          </section>
          <section aria-labelledby="past-h" className="space-y-4">
            <h2 id="past-h" className="text-xl font-semibold text-navy-900">
              {t("list.past")}
            </h2>
            {past.length === 0 ? <p className="text-sm text-muted">{t("list.noPast")}</p> : table(past, t("list.captionPast"), false)}
          </section>
        </>
      )}
    </div>
  );
}
