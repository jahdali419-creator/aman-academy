"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { assignSchema, inviteSchema, organizationSchema, seatOrderSchema } from "@/lib/validation";
import { getViewer } from "../auth/session";
import { database } from "../db/client";
import { AppError } from "../errors";
import { assignSeat, inviteEmployee, revokeInvitation, unassignSeat, updateOrganization } from "../services/company";
import { createSeatOrder } from "../services/orders";
import { limit, parseForm, run } from "./helpers";

const idSchema = z.object({ id: z.string().trim().min(1, "required").max(64, "too_long") });

/**
 * The viewer is always re-derived from the session. The organization comes
 * from `viewer.org` inside the services; no org id or role is read from the form.
 */
async function currentViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new AppError("forbidden", 403);
  return viewer;
}

const refresh = () => revalidatePath("/[locale]/company", "layout");

export async function updateOrganizationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(organizationSchema, formData);
    if ("state" in parsed) return parsed.state;
    await updateOrganization(await database(), viewer, parsed.data);
    refresh();
    return { ok: true, success: "saved" };
  });
}

export async function inviteEmployeeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(inviteSchema, formData);
    if ("state" in parsed) return parsed.state;
    await limit("company-invite", 30, 600, viewer.id);
    await inviteEmployee(await database(), viewer, parsed.data, await getLocale());
    refresh();
    return { ok: true, success: "invited" };
  });
}

export async function revokeInvitationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(idSchema, formData);
    if ("state" in parsed) return { ok: false, error: "not_found" };
    await revokeInvitation(await database(), viewer, parsed.data.id);
    refresh();
    return { ok: true };
  });
}

export async function buySeatsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(seatOrderSchema, formData);
    if ("state" in parsed) return parsed.state;
    await limit("company-seat-order", 20, 600, viewer.id);
    const order = await createSeatOrder(await database(), viewer, parsed.data.courseId, parsed.data.quantity);
    return redirect({ href: `/checkout/${order.id}`, locale: await getLocale() });
  });
}

export async function assignSeatAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(assignSchema, formData);
    if ("state" in parsed) return parsed.state;
    await assignSeat(await database(), viewer, parsed.data);
    refresh();
    return { ok: true, success: "assigned" };
  });
}

export async function unassignSeatAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(idSchema, formData);
    if ("state" in parsed) return { ok: false, error: "not_found" };
    await unassignSeat(await database(), viewer, parsed.data.id);
    refresh();
    return { ok: true };
  });
}
