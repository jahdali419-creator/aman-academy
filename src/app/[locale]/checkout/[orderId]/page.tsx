import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LockKeyhole } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { config } from "@/server/config";
import { requireViewer } from "@/server/auth/session";
import { demoPayAction } from "@/server/actions/checkout";
import { getCourseById, getPublicSession } from "@/server/services/catalog";
import { getOrderForViewer } from "@/server/services/orders";
import { formatDate, formatSar, formatSaudiMobile, formatTime, formatTimeRange, pick } from "@/lib/format";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Alert, Card, Ltr, PageHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "checkout" }))("meta"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/checkout/${orderId}`);
  const db = await database();
  const order = await getOrderForViewer(db, viewer, orderId);
  if (!order || order.userId !== viewer.id) notFound();
  if (order.status !== "pending") redirect({ href: `/checkout/${order.id}/result`, locale });
  const [t, tc, course, session] = await Promise.all([
    getTranslations("checkout"),
    getTranslations("common"),
    getCourseById(db, order.courseId),
    order.sessionId ? getPublicSession(db, order.sessionId) : null,
  ]);
  if (!course) notFound();
  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? "border-t border-line pt-4 text-lg font-semibold text-navy-900" : "text-sm"}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-2xl" : "font-medium text-navy-900"}>{value}</dd>
    </div>
  );
  const demo = config.paymentProvider === "demo";

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader title={t("title")} lead={<><span>{t("order")} </span><Ltr className="font-mono text-sm">{order.number}</Ltr></>} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <Card className="order-2 p-6 sm:p-8 lg:order-1">
          <ActionForm action={demoPayAction} className="space-y-8">
            <input type="hidden" name="orderId" value={order.id} />
            <section>
              <h2 className="text-xl font-semibold text-navy-900">{t("billing")}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field name="billingName" label={t("billingName")} defaultValue={order.billingName ?? viewer.name} autoComplete="name" />
                <Field name="billingEmail" type="email" label={t("billingEmail")} defaultValue={order.billingEmail ?? viewer.email} autoComplete="email" dir="ltr" className="text-start" />
                <Field name="billingPhone" type="tel" label={t("billingPhone")} defaultValue={formatSaudiMobile(order.billingPhone ?? viewer.phone)} autoComplete="tel" dir="ltr" inputMode="tel" placeholder="05X XXX XXXX" className="text-start" />
                <Field name="billingCompany" label={t("billingCompany")} defaultValue={order.billingCompany ?? ""} optional autoComplete="organization" />
                <Field name="billingVatNumber" label={t("billingVat")} hint={t("billingVatHint")} defaultValue={order.billingVatNumber ?? ""} optional dir="ltr" inputMode="numeric" className="text-start" maxLength={15} />
              </div>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-navy-900">{t("payment")}</h2>
              {demo ? (
                <>
                  <Alert tone="warning" title={t("demoTitle")} className="mt-4">{t("demoBody")}</Alert>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <SubmitButton size="lg" name="outcome" value="success">
                      <LockKeyhole aria-hidden className="size-4.5" />
                      {t("paySuccess")}
                    </SubmitButton>
                    <SubmitButton size="lg" variant="light" name="outcome" value="fail">{t("payFail")}</SubmitButton>
                  </div>
                  <p className="mt-4 text-xs text-muted">{t("methodsNote")}</p>
                </>
              ) : (
                <Alert tone="warning" className="mt-4">{t("notConfigured")}</Alert>
              )}
            </section>
          </ActionForm>
        </Card>

        <Card className="order-1 p-6 lg:order-2 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold text-navy-900">{t("summary")}</h2>
          <div className="mt-4 rounded-xl bg-paper p-4">
            <p className="font-display text-lg font-semibold text-navy-900">{pick(locale, course.titleEn, course.titleAr)}</p>
            {session ? (
              <p className="mt-1 text-sm text-muted">
                {formatDate(session.startsAt, locale)}<br />
                <bdi>{formatTimeRange(session.startsAt, session.endsAt, locale)}</bdi> · {tc("time.zone")}<br />
                {tc("teaching.label")}: {tc(`teaching.${session.language}`)} · {tc(`provider.${session.provider}`)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">{t("seats", { count: order.quantity })} · {t("seatsNote")}</p>
            )}
          </div>
          <dl className="mt-4">
            {row(t("unit"), formatSar(order.unitPriceHalalas, locale, { decimals: true }))}
            {order.quantity > 1 ? row(t("seats", { count: order.quantity }), `× ${order.quantity}`) : null}
            {row(t("subtotal"), formatSar(order.subtotalHalalas, locale, { decimals: true }))}
            {order.vatRateBps > 0 ? row(t("vat", { rate: String(order.vatRateBps / 100) }), formatSar(order.vatHalalas, locale, { decimals: true })) : null}
            {row(t("total"), formatSar(order.totalHalalas, locale, { decimals: true }), true)}
          </dl>
          {order.vatRateBps === 0 ? <p className="mt-2 text-xs text-muted">{t("vatOff")}</p> : null}
          {order.holdExpiresAt ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{t("hold", { time: formatTime(order.holdExpiresAt, locale), zone: tc("time.zoneShort") })}</p> : null}
          <p className="mt-3 text-xs text-muted">{t("invoiceNote")}</p>
        </Card>
      </div>
    </div>
  );
}
