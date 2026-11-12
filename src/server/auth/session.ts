import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import { database } from "../db/client";
import { instructors, memberships, organizations } from "../db/schema";
import type { Viewer } from "../viewer";
import { getAuth } from "./auth";

/** The authenticated viewer for this request, or null. Resolved once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const db = await database();
  const s = await getAuth().api.getSession({ headers: await headers() });
  if (!s?.user) return null;
  const u = s.user as typeof s.user & { nameAr?: string | null; phone?: string | null; role?: string; locale?: string; isDemo?: boolean };
  const [m] = await db
    .select({ orgId: memberships.orgId, role: memberships.role, name: organizations.name })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(eq(memberships.userId, u.id))
    .limit(1);
  const [i] = await db.select({ id: instructors.id }).from(instructors).where(eq(instructors.userId, u.id)).limit(1);
  const role = u.role === "admin" || u.role === "instructor" ? u.role : "learner";
  return {
    id: u.id,
    name: u.name,
    nameAr: u.nameAr ?? null,
    email: u.email,
    phone: u.phone ?? null,
    role,
    locale: u.locale ?? "ar",
    isDemo: !!u.isDemo,
    org: m ? { id: m.orgId, name: m.name, role: m.role } : null,
    instructorId: i?.id ?? null,
  };
});

/** Where a signed-in viewer should land by default. */
export function homePathFor(v: Viewer) {
  if (v.role === "admin") return "/admin";
  if (v.role === "instructor") return "/instructor";
  if (v.org?.role === "manager") return "/company";
  return "/dashboard";
}

export async function requireViewer(locale: string, next?: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) return redirect({ href: { pathname: "/sign-in", query: next ? { next } : undefined }, locale });
  return v;
}

type Area = "admin" | "instructor" | "manager";

/** Server-side role guard for a whole area. Unauthorised viewers are sent to their own home. */
export async function requireArea(locale: string, area: Area): Promise<Viewer> {
  const v = await requireViewer(locale);
  const ok =
    area === "admin" ? v.role === "admin" : area === "instructor" ? !!v.instructorId || v.role === "admin" : v.org?.role === "manager";
  if (!ok) return redirect({ href: homePathFor(v), locale });
  return v;
}
