"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { safeNext } from "@/lib/validation";
import { getViewer } from "../auth/session";
import { database } from "../db/client";
import { createIndividualOrder } from "../services/orders";
import { limit, run } from "./helpers";

/** Start enrolment in a session: creates a pending order (holding a seat) and goes to checkout. */
export async function startEnrollmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const locale = await getLocale();
    const sessionId = String(formData.get("sessionId") ?? "");
    const back = safeNext(String(formData.get("back") ?? "")) ?? "/courses";
    const viewer = await getViewer();
    if (!viewer) return redirect({ href: { pathname: "/sign-in", query: { next: back } }, locale });
    await limit("enrol", 20, 300, viewer.id);
    const order = await createIndividualOrder(await database(), viewer, sessionId);
    return redirect({ href: `/checkout/${order.id}`, locale });
  });
}
