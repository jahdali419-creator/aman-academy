"use server";

import type { ActionState } from "@/lib/action-state";
import { inquirySchema } from "@/lib/validation";
import { database } from "../db/client";
import { createInquiry } from "../services/inquiries";
import { limit, parseForm, run } from "./helpers";

export async function submitInquiryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = parseForm(inquirySchema, formData);
    if ("state" in parsed) {
      // A filled honeypot is treated as success without storing anything.
      if (parsed.state.fieldErrors?.website) return { ok: true, success: "sent" };
      return parsed.state;
    }
    await limit("inquiry", 5, 600);
    const { website: _hp, ...d } = parsed.data;
    void _hp;
    await createInquiry(await database(), d);
    return { ok: true, success: "sent" };
  });
}
