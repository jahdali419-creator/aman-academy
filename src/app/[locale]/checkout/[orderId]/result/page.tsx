import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { database } from "@/server/db/client";
import { config } from "@/server/config";
import { requireViewer } from "@/server/auth/session";
import { getCourseById } from "@/server/services/catalog";
import { getOrderForViewer } from "@/server/services/orders";
import { ButtonLink } from "@/components/ui/button";
import { Ltr } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "checkout" }))("meta"), robots: { index: false } };
}

export default async function ResultPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale);
  const db = await database();
  // The page only REPORTS the order's state as recorded by the payment event handler.
  const order = await getOrderForViewer(db, viewer, orderId);
  if (!order || order.userId !== viewer.id) notFound();
  const [t, course] = await Promise.all([getTranslations("checkout.result"), getCourseById(db, order.courseId)]);
  const seats = order.kind === "company_seats";

  const view =
    order.status === "paid"
      ? { tone: "bg-emerald-50 text-emerald-600", Icon: CheckCircle2, title: seats ? t("paidSeatsTitle") : t("paidTitle"), body: seats ? t("paidSeatsBody", { count: order.quantity }) : t("paidBody"), href: seats ? "/company/seats" : "/dashboard", cta: seats ? t("goSeats") : t("goDashboard") }
      : order.status === "pending"
        ? { tone: "bg-amber-50 text-amber-700", Icon: Clock3, title: t("pendingTitle"), body: t("pendingBody"), href: `/checkout/${order.id}`, cta: t("resume") }
        : order.status === "refunded"
          ? { tone: "bg-red-50 text-red-700", Icon: XCircle, title: t("refundTitle"), body: t("refundBody"), href: course ? `/courses/${course.slug}` : "/courses", cta: t("retry") }
          : { tone: "bg-red-50 text-red-700", Icon: XCircle, title: t("failedTitle"), body: t("failedBody"), href: seats ? "/company/seats" : course ? `/courses/${course.slug}#sessions` : "/courses", cta: t("retry") };

  return (
    <div className="container-page py-16 sm:py-24">
      <div role="status" className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8 text-center shadow-lift sm:p-12">
        <span className={`mx-auto grid size-16 place-items-center rounded-full ${view.tone}`}><view.Icon aria-hidden className="size-8" /></span>
        <h1 className="mt-6 text-3xl font-semibold text-navy-900">{view.title}</h1>
        <p className="mt-3 text-lg text-muted">{view.body}</p>
        {order.status === "paid" && config.demoMode ? <p className="mt-3 text-sm font-semibold text-amber-700">{t("demoPaid")}</p> : null}
        <p className="mt-6 text-sm text-muted">{t("reference")}: <Ltr className="font-mono text-navy-900">{order.number}</Ltr></p>
        <ButtonLink href={view.href} size="lg" className="mt-8">{view.cta}</ButtonLink>
      </div>
    </div>
  );
}
