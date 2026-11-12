"use server";

import { randomUUID } from "node:crypto";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { billingSchema } from "@/lib/validation";
import { getViewer } from "../auth/session";
import { config } from "../config";
import { database } from "../db/client";
import { AppError } from "../errors";
import { notifyEnrollmentConfirmed } from "../services/notifications";
import { getOrderForViewer, handlePaymentEvent, updateBilling } from "../services/orders";
import { limit, parseForm, run } from "./helpers";

/**
 * DEMO CHECKOUT. Saves billing details, then asks the demo "provider" for an
 * outcome. The order is only ever marked paid inside `handlePaymentEvent`,
 * the same function the real provider webhook calls — never from a redirect.
 * No card data is collected or stored.
 */
export async function demoPayAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("forbidden", 403);
    if (config.paymentProvider !== "demo") throw new AppError("payment_not_configured");
    const parsed = parseForm(billingSchema, formData);
    if ("state" in parsed) return parsed.state;
    const d = parsed.data;
    await limit("pay", 12, 300, viewer.id);
    const db = await database();
    const order = await getOrderForViewer(db, viewer, d.orderId);
    if (!order || order.userId !== viewer.id) throw new AppError("not_found", 404);
    const locale = await getLocale();
    if (order.status === "pending") {
      await updateBilling(db, viewer, order.id, { name: d.billingName, email: d.billingEmail, phone: d.billingPhone, company: d.billingCompany, vatNumber: d.billingVatNumber });
      const outcome = await handlePaymentEvent(db, {
        provider: "demo",
        eventId: `demo_${randomUUID()}`,
        orderId: order.id,
        type: formData.get("outcome") === "fail" ? "payment.failed" : "payment.succeeded",
        amountHalalas: order.totalHalalas,
        currency: order.currency,
      });
      if (outcome === "paid") await notifyEnrollmentConfirmed(db, order.id);
    }
    return redirect({ href: `/checkout/${order.id}/result`, locale });
  });
}
