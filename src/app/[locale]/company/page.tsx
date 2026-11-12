import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Armchair, ClipboardCheck, MailQuestion, ShoppingBag, UserPlus } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { getSeatSummary, listEmployees, listInvitations } from "@/server/services/company";
import { pick } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, EmptyState, Ltr, PageHeader, Stat } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CompanyOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "manager");
  const [t, db] = await Promise.all([getTranslations("companyArea.overview"), database()]);
  const [seats, employees, invitations] = await Promise.all([getSeatSummary(db, viewer), listEmployees(db, viewer), listInvitations(db, viewer)]);

  const purchased = seats.reduce((n, s) => n + s.purchased, 0);
  const assigned = seats.reduce((n, s) => n + s.assigned, 0);
  const remaining = seats.reduce((n, s) => n + s.remaining, 0);
  const certificates = employees.reduce((n, e) => n + e.enrollments.filter((p) => p.certificate?.status === "valid").length, 0);
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;
  const hasEmployees = employees.some((e) => e.role === "employee");

  // The single most useful thing to do next.
  const assign = { icon: Armchair, title: t("next.assignTitle"), body: t("next.assignBody", { count: remaining }), cta: t("next.assignCta"), href: "/company/seats#assign" };
  const next =
    purchased === 0
      ? { icon: ShoppingBag, title: t("next.buyTitle"), body: t("next.buyBody"), cta: t("next.buyCta"), href: "/company/seats#buy" }
      : remaining > 0 && assigned === 0
        ? !hasEmployees && pendingInvites === 0
          ? { icon: UserPlus, title: t("next.inviteTitle"), body: t("next.inviteBody"), cta: t("next.inviteCta"), href: "/company/employees" }
          : assign
        : pendingInvites > 0
          ? { icon: MailQuestion, title: t("next.remindTitle"), body: t("next.remindBody", { count: pendingInvites }), cta: t("next.remindCta"), href: "/company/employees#invitations" }
          : remaining > 0
            ? assign
            : { icon: ClipboardCheck, title: t("next.doneTitle"), body: t("next.doneBody"), cta: t("next.doneCta"), href: "/company/reports" };
  const NextIcon = next.icon;

  return (
    <div className="space-y-10">
      <PageHeader title={t("title")} lead={t("lead")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("stats.employees")} value={employees.length} hint={t("stats.employeesHint")} />
        <Stat label={t("stats.purchased")} value={purchased} />
        <Stat label={t("stats.assigned")} value={assigned} />
        <Stat label={t("stats.remaining")} value={remaining} hint={t("stats.remainingHint")} />
        <Stat label={t("stats.certificates")} value={certificates} />
      </div>

      <section aria-labelledby="next-h">
        <div className="flex flex-col gap-6 rounded-2xl bg-navy-900 p-6 text-white shadow-soft sm:flex-row sm:items-center sm:p-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-300">
            <NextIcon aria-hidden className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p id="next-h" className="text-sm font-semibold text-emerald-300">
              {t("next.title")}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{next.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-100">{next.body}</p>
          </div>
          <ButtonLink href={next.href} className="shrink-0">
            {next.cta}
            <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="seats-h" className="space-y-4">
        <h2 id="seats-h" className="text-xl font-semibold text-navy-900">
          {t("seats.title")}
        </h2>
        {seats.length === 0 ? (
          <EmptyState
            icon={<Armchair aria-hidden className="size-6" />}
            title={t("seats.emptyTitle")}
            action={<ButtonLink href="/company/seats#buy">{t("seats.buy")}</ButtonLink>}
          >
            {t("seats.emptyBody")}
          </EmptyState>
        ) : (
          <DataTable caption={t("seats.caption")} head={[t("seats.course"), t("seats.purchased"), t("seats.assigned"), t("seats.remaining"), t("seats.actions")]}>
            {seats.map((s) => (
              <tr key={s.courseId}>
                <td>
                  <p className="font-semibold text-navy-900">{pick(locale, s.titleEn, s.titleAr)}</p>
                  <Ltr className="text-xs text-muted">{s.code}</Ltr>
                </td>
                <td>{s.purchased}</td>
                <td>{s.assigned}</td>
                <td className="font-semibold text-navy-900">{s.remaining}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {s.remaining > 0 ? (
                      <ButtonLink href="/company/seats#assign" size="sm" variant="secondary">
                        {t("seats.assign")}
                      </ButtonLink>
                    ) : null}
                    <ButtonLink href={`/company/seats?course=${s.courseId}#buy`} size="sm" variant="light">
                      {t("seats.buy")}
                    </ButtonLink>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
