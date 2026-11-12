import "server-only";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";

const SECRET_FIELDS = new Set(["password", "newPassword", "currentPassword", "token"]);

/** Validate form data with a Zod schema whose messages are error codes. */
export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): { data: z.infer<S> } | { state: NonNullable<ActionState> } {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") raw[k] = v;
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const values = Object.fromEntries(Object.entries(raw).filter(([k]) => !SECRET_FIELDS.has(k)));
  return { state: { ok: false, fieldErrors, values } };
}

/** Run an action body, mapping business errors to translated states. Never leaks internals. */
export async function run(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    unstable_rethrow(e); // let redirects / notFound through
    if (e instanceof AppError) return { ok: false, error: e.code };
    console.error("[action] unexpected error:", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: "unexpected" };
  }
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Rate-limit a sensitive action by client address (and an optional extra key such as an email). */
export async function limit(name: string, max: number, windowSeconds: number, extra = "") {
  enforceRateLimit(`${name}:${await clientIp()}:${extra}`, max, windowSeconds);
}
