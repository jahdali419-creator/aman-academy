import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail } from "lucide-react";
import { requireArea } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { listOutbox } from "@/server/services/admin";
import { formatDateTime } from "@/lib/format";
import { Alert, Badge, Card, EmptyState, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminOutboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations("admin"), database()]);
  const rows = await listOutbox(db, viewer);

  return (
    <>
      <PageHeader title={t("outbox.title")} lead={t("outbox.lead")} />
      <Alert tone="info" title={t("outbox.demoTitle")}>
        {t("outbox.demoBody")}
      </Alert>
      {rows.length === 0 ? (
        <EmptyState icon={<Mail aria-hidden className="size-5" />} title={t("outbox.empty.title")}>
          {t("outbox.empty.body")}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => {
            const rtl = m.locale === "ar";
            return (
              <li key={m.id}>
                <Card className="p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge>
                      <Ltr className="font-mono">{m.template}</Ltr>
                    </Badge>
                    <Badge tone="info">{t(`outbox.locale.${rtl ? "ar" : "en"}`)}</Badge>
                    <span>{formatDateTime(m.createdAt, locale)}</span>
                  </div>
                  <p dir={rtl ? "rtl" : "ltr"} lang={m.locale} className="mt-3 font-semibold text-navy-900">
                    {m.subject}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("outbox.to")} <Ltr className="font-medium text-navy-800">{m.toEmail}</Ltr>
                  </p>
                  <details className="mt-4 border-t border-line pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-navy-800 hover:text-navy-900">{t("outbox.showBody")}</summary>
                    <div dir={rtl ? "rtl" : "ltr"} lang={m.locale} className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-paper-2 p-4 text-sm leading-relaxed text-navy-900">
                      {m.body}
                    </div>
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
