import { z } from "zod";
import { database } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { notifyEnrollmentConfirmed } from "@/server/services/notifications";
import { handlePaymentEvent, verifyWebhookSignature } from "@/server/services/orders";

/**
 * Payment provider webhook (integration point for production).
 *
 * The request body must be signed with HMAC-SHA256 using PAYMENT_WEBHOOK_SECRET
 * and sent in the `x-aman-signature` header. Adapt the payload mapping below to
 * the chosen provider's event format; keep signature verification and the
 * single `handlePaymentEvent` entry point.
 */
const eventSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(["payment.succeeded", "payment.failed"]),
  provider: z.string().min(1).max(40),
  data: z.object({ orderId: z.string().min(1).max(64), amountHalalas: z.number().int().nonnegative(), currency: z.string().length(3) }),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-aman-signature"))) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const e = parsed.data;
  // The built-in demo provider can only be driven from the server-side demo checkout.
  if (e.provider === "demo") return Response.json({ error: "invalid_provider" }, { status: 400 });
  try {
    const db = await database();
    const outcome = await handlePaymentEvent(db, { provider: e.provider, eventId: e.id, orderId: e.data.orderId, type: e.type, amountHalalas: e.data.amountHalalas, currency: e.data.currency });
    if (outcome === "paid") await notifyEnrollmentConfirmed(db, e.data.orderId);
    return Response.json({ received: true, outcome });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.code }, { status: err.status });
    console.error("[webhook] unexpected error");
    return Response.json({ error: "unexpected" }, { status: 500 });
  }
}
