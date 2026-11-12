import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inbox } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listInquiries } from "@/server/services/admin";
import { setInquiryHandledAction } from "@/server/actions/admin";
import { formatDateTime } from "@/lib/format";
import { ActionButton } from "@/components/ui/form";
import { Badge, Card, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations("admin"), database()]);
  const rows = await listInquiries(db, viewer);
  const openCount = rows.filter((r) => !r.handled).length;

  return (
    <>
      <PageHeader title={t("inquiries.title")} lead={t("inquiries.lead", { count: openCount })} />
      {rows.length === 0 ? (
        <EmptyState icon={<Inbox aria-hidden className="size-5" />} title={t("inquiries.empty.title")}>
          {t("inquiries.empty.body")}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map((q) => (
            <li key={q.id}>
              <Card className={q.handled ? "bg-paper p-6" : "p-6"}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={q.kind === "company" ? "navy" : "neutral"}>{t(`inquiries.kind.${q.kind}`)}</Badge>
                      {q.handled ? <Badge tone="success">{t("inquiries.handled")}</Badge> : <Badge tone="warning">{t("inquiries.open")}</Badge>}
                      <span className="text-xs text-muted">{formatDateTime(q.createdAt, locale)}</span>
                    </div>
                    <p className="mt-3 font-semibold text-navy-900">
                      <bdi>{q.name}</bdi>
                      {q.company ? (
                        <span className="font-normal text-muted">
                          {" · "}
                          <bdi>{q.company}</bdi>
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <Ltr>{q.email}</Ltr>
                      {q.phone ? <Ltr>{q.phone}</Ltr> : null}
                      {q.headcount ? (
                        <span>
                          {t("inquiries.headcount")} <Ltr>{q.headcount}</Ltr>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ActionButton action={setInquiryHandledAction} fields={{ id: q.id, handled: q.handled ? "0" : "1" }} variant={q.handled ? "light" : "secondary"}>
                      {q.handled ? t("inquiries.reopen") : t("inquiries.markHandled")}
                    </ActionButton>
                  </div>
                </div>
                <p dir="auto" className="mt-4 whitespace-pre-wrap rounded-xl bg-paper-2 p-4 text-sm leading-relaxed text-navy-900">
                  {q.message}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
