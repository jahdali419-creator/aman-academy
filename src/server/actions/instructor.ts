"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { attendanceSchema, joinDetailsSchema } from "@/lib/validation";
import { getViewer } from "../auth/session";
import { database } from "../db/client";
import { AppError } from "../errors";
import { markAttendance } from "../services/attendance";
import { updateJoinDetails } from "../services/instructor";
import { parseForm, run } from "./helpers";

/** The viewer is re-derived from the session; the services check that the session is assigned to them. */
async function currentViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new AppError("forbidden", 403);
  return viewer;
}

const refresh = () => revalidatePath("/[locale]/instructor", "layout");

export async function updateJoinDetailsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(joinDetailsSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { sessionId, ...input } = parsed.data;
    if (input.joinUrl && !/^https:\/\//i.test(input.joinUrl)) {
      return { ok: false, fieldErrors: { joinUrl: "invalid_url" }, values: { ...input } };
    }
    await updateJoinDetails(await database(), viewer, sessionId, input);
    refresh();
    return { ok: true, success: "saved" };
  });
}

export async function markAttendanceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await currentViewer();
    const parsed = parseForm(attendanceSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { enrollmentId, ...input } = parsed.data;
    await markAttendance(await database(), viewer, enrollmentId, input);
    refresh();
    return { ok: true, success: "recorded" };
  });
}
