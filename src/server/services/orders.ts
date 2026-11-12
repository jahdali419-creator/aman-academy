import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { courses, courseSessions, enrollments, orders, payments, seatPurchases } from "../db/schema";
import { config } from "../config";
import { AppError, forbidden, notFound } from "../errors";
import type { Viewer } from "../viewer";
import { logAudit } from "./audit";
import { seatsTakenBySession } from "./catalog";

export type Billing = {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  vatNumber?: string | null;
};

export function computeTotals(unitPriceHalalas: number, quantity: number, vatRateBps = config.vatRateBps) {
  const subtotalHalalas = unitPriceHalalas * quantity;
  const vatHalalas = Math.round((subtotalHalalas * vatRateBps) / 10_000);
  return { subtotalHalalas, vatRateBps, vatHalalas, totalHalalas: subtotalHalalas + vatHalalas };
}

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `AO-${ymd}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

/** Lock a session row so concurrent seat checks are serialized. */
export async function lockSession(tx: Db, sessionId: string) {
  const [s] = await tx.select().from(courseSessions).where(eq(courseSessions.id, sessionId)).for("update").limit(1);
  return s ?? null;
}

/** Create a pending order for one person in one session, holding a seat briefly. */
export async function createIndividualOrder(db: Db, viewer: Viewer, sessionId: string) {
  return db.transaction(async (tx) => {
    const s = await lockSession(tx, sessionId);
    if (!s || s.status !== "scheduled") throw notFound();
    if (s.startsAt <= new Date()) throw new AppError("session_started");
    const [course] = await tx.select().from(courses).where(eq(courses.id, s.courseId)).limit(1);
    if (!course?.published) throw notFound();

    const [already] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, viewer.id), eq(enrollments.sessionId, sessionId), eq(enrollments.status, "active")))
      .limit(1);
    if (already) throw new AppError("already_enrolled");

    // Reuse the viewer's own unexpired pending order for this session.
    const [existing] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, viewer.id),
          eq(orders.sessionId, sessionId),
          eq(orders.status, "pending"),
          eq(orders.kind, "individual"),
          sql`${orders.holdExpiresAt} > now()`,
        ),
      )
      .limit(1);
    if (existing) return existing;

    const taken = (await seatsTakenBySession(tx, [sessionId])).get(sessionId) ?? 0;
    if (taken >= s.maxSeats) throw new AppError("session_full");

    const totals = computeTotals(course.priceHalalas, 1);
    const [order] = await tx
      .insert(orders)
      .values({
        number: orderNumber(),
        userId: viewer.id,
        kind: "individual",
        courseId: course.id,
        sessionId,
        quantity: 1,
        unitPriceHalalas: course.priceHalalas,
        ...totals,
        billingName: viewer.name,
        billingEmail: viewer.email,
        billingPhone: viewer.phone,
        holdExpiresAt: new Date(Date.now() + config.seatHoldMinutes * 60_000),
      })
      .returning();
    return order;
  });
}

/** Create a pending order for company seats on a course (usable for any session of it). */
export async function createSeatOrder(db: Db, viewer: Viewer, courseId: string, quantity: number) {
  if (viewer.org?.role !== "manager") throw forbidden();
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) throw new AppError("invalid_quantity");
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course?.published) throw notFound();
  const totals = computeTotals(course.priceHalalas, quantity);
  const [order] = await db
    .insert(orders)
    .values({
      number: orderNumber(),
      userId: viewer.id,
      orgId: viewer.org.id,
      kind: "company_seats",
      courseId,
      quantity,
      unitPriceHalalas: course.priceHalalas,
      ...totals,
      billingName: viewer.name,
      billingEmail: viewer.email,
      billingPhone: viewer.phone,
      billingCompany: viewer.org.name,
    })
    .returning();
  return order;
}

/** An order is visible to the person who placed it and to administrators only. */
export async function getOrderForViewer(db: Db, viewer: Viewer, orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  if (order.userId !== viewer.id && viewer.role !== "admin") return null;
  return order;
}

export async function updateBilling(db: Db, viewer: Viewer, orderId: string, billing: Billing) {
  const order = await getOrderForViewer(db, viewer, orderId);
  if (!order || order.userId !== viewer.id) throw notFound();
  if (order.status !== "pending") throw new AppError("order_not_pending");
  await db
    .update(orders)
    .set({
      billingName: billing.name,
      billingEmail: billing.email,
      billingPhone: billing.phone || null,
      billingCompany: billing.company || null,
      billingVatNumber: billing.vatNumber || null,
    })
    .where(eq(orders.id, orderId));
}

/* ------------------------------------------------------------------ */
/* Payment events                                                      */
/* ------------------------------------------------------------------ */

export type PaymentEvent = {
  provider: string;
  eventId: string;
  orderId: string;
  type: "payment.succeeded" | "payment.failed";
  amountHalalas: number;
  currency: string;
};

export function signPayload(rawBody: string, secret = config.paymentWebhookSecret) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/** Constant-time verification of a webhook signature. Fails closed when no secret is configured. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = config.paymentWebhookSecret) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signPayload(rawBody, secret), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type PaymentOutcome = "paid" | "failed" | "duplicate" | "refund_required";

/**
 * The ONLY code path that may mark an order paid. It must be called with an
 * event that came from a trusted server-side source (a verified provider
 * webhook, or the demo simulator) — never from a browser redirect.
 * Idempotent: replaying the same provider event has no further effect.
 */
export async function handlePaymentEvent(db: Db, event: PaymentEvent): Promise<PaymentOutcome> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, event.orderId)).for("update").limit(1);
    if (!order) throw notFound();

    const inserted = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        provider: event.provider,
        providerEventId: event.eventId,
        status: event.type === "payment.succeeded" ? "succeeded" : "failed",
        amountHalalas: event.amountHalalas,
      })
      .onConflictDoNothing()
      .returning({ id: payments.id });
    if (inserted.length === 0) return "duplicate";

    if (order.status !== "pending") return "duplicate";

    if (event.type === "payment.failed") {
      await tx.update(orders).set({ status: "failed", holdExpiresAt: null }).where(eq(orders.id, order.id));
      await logAudit(tx, null, "order.payment_failed", "order", order.id, { provider: event.provider });
      return "failed";
    }

    if (event.amountHalalas !== order.totalHalalas || event.currency !== order.currency) {
      // Never fulfil an order whose paid amount does not match.
      await tx.update(orders).set({ status: "failed", holdExpiresAt: null }).where(eq(orders.id, order.id));
      await logAudit(tx, null, "order.amount_mismatch", "order", order.id, {
        expected: order.totalHalalas,
        received: event.amountHalalas,
      });
      return "failed";
    }

    if (order.kind === "company_seats") {
      if (!order.orgId) throw new AppError("order_invalid");
      await tx.insert(seatPurchases).values({
        orgId: order.orgId,
        courseId: order.courseId,
        orderId: order.id,
        seatsTotal: order.quantity,
      });
    } else {
      if (!order.sessionId) throw new AppError("order_invalid");
      const s = await lockSession(tx, order.sessionId);
      const taken = (await seatsTakenBySession(tx, [order.sessionId], { excludeOrderId: order.id })).get(order.sessionId) ?? 0;
      const [dup] = await tx
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(eq(enrollments.userId, order.userId), eq(enrollments.sessionId, order.sessionId), eq(enrollments.status, "active")),
        )
        .limit(1);
      if (!s || s.status !== "scheduled" || taken >= s.maxSeats || dup) {
        // Paid but cannot be fulfilled (hold expired and the session filled).
        // PRODUCTION: trigger the provider refund here.
        await tx.update(orders).set({ status: "refunded", paidAt: new Date(), holdExpiresAt: null }).where(eq(orders.id, order.id));
        await logAudit(tx, null, "order.refund_required", "order", order.id, { reason: "seat_unavailable" });
        return "refund_required";
      }
      await tx.insert(enrollments).values({
        userId: order.userId,
        sessionId: order.sessionId,
        courseId: order.courseId,
        orderId: order.id,
      });
    }

    await tx.update(orders).set({ status: "paid", paidAt: new Date(), holdExpiresAt: null }).where(eq(orders.id, order.id));
    await logAudit(tx, null, "order.paid", "order", order.id, { provider: event.provider, kind: order.kind });
    return "paid";
  });
}
