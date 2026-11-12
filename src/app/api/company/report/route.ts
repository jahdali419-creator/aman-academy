import { getTranslations } from "next-intl/server";
import { formatDate, formatTime, pick } from "@/lib/format";
import { defaultLocale, isLocale } from "@/messages";
import { getViewer } from "@/server/auth/session";
import { database } from "@/server/db/client";
import { getReportRows } from "@/server/services/company";

export const dynamic = "force-dynamic";

/** Quote every cell, and neutralise values a spreadsheet would run as a formula. */
function cell(value: string | number | null | undefined) {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("locale");
  const locale = isLocale(requested) ? requested : defaultLocale;
  const t = await getTranslations({ locale, namespace: "companyArea.reports" });

  const viewer = await getViewer();
  if (!viewer) return json({ error: "unauthenticated", message: t("unauthenticated") }, 401);
  if (viewer.org?.role !== "manager") return json({ error: "forbidden", message: t("forbidden") }, 403);

  // The organization is derived from the viewer inside the service; nothing from the request selects it.
  const rows = await getReportRows(await database(), viewer);
  const [ts, tc] = await Promise.all([getTranslations({ locale, namespace: "status" }), getTranslations({ locale, namespace: "common" })]);

  const header = [
    t("columns.employee"),
    t("columns.employeeAr"),
    t("columns.email"),
    t("columns.courseCode"),
    t("columns.course"),
    t("columns.session"),
    t("columns.sessionTime"),
    t("columns.language"),
    t("columns.attendance"),
    t("columns.attendancePercent"),
    t("columns.attempts"),
    t("columns.bestScore"),
    t("columns.status"),
    t("columns.certificate"),
  ];
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        cell(r.employee),
        cell(r.employeeAr),
        cell(r.email),
        cell(r.courseCode),
        cell(pick(locale, r.courseEn, r.courseAr)),
        cell(formatDate(r.sessionStart, locale)),
        cell(formatTime(r.sessionStart, locale)),
        cell(tc(`teaching.${r.language}`)),
        cell(ts(`attendance.${r.attendanceStatus || "pending"}`)),
        cell(r.attendancePercent),
        cell(r.attempts),
        cell(r.bestScore),
        cell(ts(`progress.${r.status}`)),
        cell(r.certificateNumber),
      ].join(","),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  // The BOM makes Excel read the file as UTF-8, so Arabic text displays correctly.
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aman-academy-progress-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
