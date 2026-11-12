"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { getViewer } from "../auth/session";
import { database } from "../db/client";
import { AppError } from "../errors";
import { acceptInvitation } from "../services/company";
import { limit, run } from "./helpers";

export async function acceptInviteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("forbidden", 403);
    await limit("invite-accept", 10, 600, viewer.id);
    await acceptInvitation(await database(), viewer, String(formData.get("token") ?? ""));
    return redirect({ href: "/dashboard", locale: await getLocale() });
  });
}
