"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { changePasswordSchema, forgotSchema, profileSchema, registerCompanySchema, registerSchema, resetSchema, safeNext, signInSchema } from "@/lib/validation";
import { getAuth } from "../auth/auth";
import { getViewer } from "../auth/session";
import { config, DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoPersona } from "../config";
import { database } from "../db/client";
import { memberships, user } from "../db/schema";
import { AppError } from "../errors";
import { acceptInvitation, createOrganizationForUser } from "../services/company";
import { sendEmail } from "../services/email";
import { limit, parseForm, run } from "./helpers";

/** Strip the locale prefix from a `next` path so the i18n redirect can add the current one. */
const stripLocale = (p: string) => p.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";

/** Better Auth signals expected failures (bad password, duplicate email, bad token) with APIError. */
const isApiError = (e: unknown) => e instanceof Error && e.name === "APIError";

async function landing(email: string, next?: string | null) {
  const locale = await getLocale();
  const target = safeNext(next);
  if (target) return redirect({ href: stripLocale(target), locale });
  // The new session cookie is not readable within this same request, so resolve the landing page from the database.
  const db = await database();
  const [row] = await db
    .select({ role: user.role, orgRole: memberships.role })
    .from(user)
    .leftJoin(memberships, eq(memberships.userId, user.id))
    .where(eq(user.email, email))
    .limit(1);
  const href = row?.role === "admin" ? "/admin" : row?.role === "instructor" ? "/instructor" : row?.orgRole === "manager" ? "/company" : "/dashboard";
  return redirect({ href, locale });
}

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = parseForm(signInSchema, formData);
    if ("state" in parsed) return parsed.state;
    const { email, password, next } = parsed.data;
    await limit("sign-in", 8, 300, email);
    await database();
    try {
      await getAuth().api.signInEmail({ body: { email, password }, headers: await headers() });
    } catch (e) {
      if (isApiError(e)) return { ok: false, error: "invalid_credentials", values: { email, next } };
      throw e;
    }
    await landing(email, next);
  });
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = parseForm(registerSchema, formData);
    if ("state" in parsed) return parsed.state;
    const d = parsed.data;
    await limit("register", 6, 600);
    const db = await database();
    const locale = await getLocale();
    try {
      await getAuth().api.signUpEmail({
        body: { name: d.name, email: d.email, password: d.password, nameAr: d.nameAr || undefined, phone: d.phone, locale },
        headers: await headers(),
      });
    } catch (e) {
      if (isApiError(e)) {
        const { password: _pw, ...values } = Object.fromEntries(formData) as Record<string, string>;
        void _pw;
        return { ok: false, fieldErrors: { email: "email_taken" }, values };
      }
      throw e;
    }
    await sendEmail(db, { to: d.email, locale, template: "welcome", params: { name: d.name, url: `${config.appUrl}/${locale}/courses` } });
    if (d.invite) {
      const viewer = await getViewerByEmail(d.email);
      if (viewer) {
        try {
          await acceptInvitation(db, viewer, d.invite);
        } catch (e) {
          if (!(e instanceof AppError)) throw e; // an invalid invitation must not block account creation
        }
      }
    }
    return redirect({ href: stripLocale(safeNext(d.next) ?? "/dashboard"), locale });
  });
}

/** Minimal viewer built right after sign-up, before the session cookie is readable in this request. */
async function getViewerByEmail(email: string) {
  const db = await database();
  const [u] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!u) return null;
  return { id: u.id, name: u.name, nameAr: u.nameAr, email: u.email, phone: u.phone, role: u.role, locale: u.locale, isDemo: u.isDemo, org: null, instructorId: null };
}

export async function registerCompanyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = parseForm(registerCompanySchema, formData);
    if ("state" in parsed) return parsed.state;
    const d = parsed.data;
    await limit("register", 6, 600);
    const db = await database();
    const locale = await getLocale();
    try {
      await getAuth().api.signUpEmail({ body: { name: d.name, email: d.email, password: d.password, phone: d.phone, locale }, headers: await headers() });
    } catch (e) {
      if (isApiError(e)) {
        const values = Object.fromEntries([...formData].filter(([k]) => k !== "password")) as Record<string, string>;
        return { ok: false, fieldErrors: { email: "email_taken" }, values };
      }
      throw e;
    }
    const created = await getViewerByEmail(d.email);
    if (!created) throw new AppError("unexpected");
    await createOrganizationForUser(db, created.id, {
      name: d.companyName,
      contactName: d.name,
      contactEmail: d.email,
      phone: d.phone,
      crNumber: d.crNumber,
      vatNumber: d.vatNumber,
    });
    await sendEmail(db, { to: d.email, locale, template: "welcome", params: { name: d.name, url: `${config.appUrl}/${locale}/company` } });
    return redirect({ href: "/company", locale });
  });
}

export async function signOutAction() {
  await database();
  await getAuth().api.signOut({ headers: await headers() });
  return redirect({ href: "/", locale: await getLocale() });
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = parseForm(forgotSchema, formData);
    if ("state" in parsed) return parsed.state;
    await limit("forgot", 4, 600, parsed.data.email);
    await database();
    try {
      await getAuth().api.requestPasswordReset({ body: { email: parsed.data.email }, headers: await headers() });
    } catch (e) {
      if (!isApiError(e)) throw e;
    }
    // Same answer whether or not the account exists.
    return { ok: true, success: "resetSent" };
  });
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = parseForm(resetSchema, formData);
    if ("state" in parsed) return parsed.state;
    await limit("reset", 6, 600);
    await database();
    try {
      await getAuth().api.resetPassword({ body: { newPassword: parsed.data.password, token: parsed.data.token } });
    } catch (e) {
      if (isApiError(e)) return { ok: false, error: "reset_invalid" };
      throw e;
    }
    return redirect({ href: { pathname: "/sign-in", query: { reset: "1" } }, locale: await getLocale() });
  });
}

/**
 * One-click demo sign-in. Enabled ONLY when DEMO_MODE=true, and only for the
 * seeded fictional accounts — it is not a role switch and grants nothing in
 * a production deployment, where this action refuses to run.
 */
export async function demoSignInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    if (!config.demoMode) throw new AppError("demo_disabled", 403);
    const persona = String(formData.get("persona")) as DemoPersona;
    if (!(persona in DEMO_ACCOUNTS)) throw new AppError("demo_disabled", 403);
    await limit("demo", 30, 300);
    await database();
    await getAuth().api.signInEmail({ body: { email: DEMO_ACCOUNTS[persona], password: DEMO_PASSWORD }, headers: await headers() });
    await landing(DEMO_ACCOUNTS[persona], String(formData.get("next") ?? ""));
  });
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("forbidden", 403);
    const parsed = parseForm(profileSchema, formData);
    if ("state" in parsed) return parsed.state;
    const db = await database();
    const d = parsed.data;
    await db.update(user).set({ name: d.name, nameAr: d.nameAr || null, phone: d.phone, locale: d.locale, updatedAt: new Date() }).where(eq(user.id, viewer.id));
    return { ok: true, success: "saved" };
  });
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("forbidden", 403);
    const parsed = parseForm(changePasswordSchema, formData);
    if ("state" in parsed) return parsed.state;
    await limit("change-password", 6, 600, viewer.id);
    try {
      await getAuth().api.changePassword({
        body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.password, revokeOtherSessions: true },
        headers: await headers(),
      });
    } catch (e) {
      if (isApiError(e)) return { ok: false, fieldErrors: { currentPassword: "invalid_credentials" } };
      throw e;
    }
    return { ok: true, success: "passwordChanged" };
  });
}
