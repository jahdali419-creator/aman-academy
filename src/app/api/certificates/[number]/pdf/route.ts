import { config } from "@/server/config";
import { database } from "@/server/db/client";
import { getViewer } from "@/server/auth/session";
import { checkRateLimit } from "@/server/rate-limit";
import { renderCertificatePdf } from "@/server/services/certificate-pdf";
import { getCertificateForViewer } from "@/server/services/certificates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Certificate PDF. Only the holder, an administrator, or a manager of the
 * sponsoring company may download it. Never cached by shared caches.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!checkRateLimit(`pdf:${viewer.id}`, 30, 300)) return Response.json({ error: "rate_limited" }, { status: 429 });
  const row = await getCertificateForViewer(await database(), viewer, number);
  // Not found and not allowed are indistinguishable on purpose.
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });

  const pdf = await renderCertificatePdf({
    number: row.cert.number,
    learnerNameEn: row.cert.learnerNameEn,
    learnerNameAr: row.cert.learnerNameAr,
    courseTitleEn: row.course.titleEn,
    courseTitleAr: row.course.titleAr,
    courseCode: row.course.code,
    completedAt: row.cert.completedAt,
    expiresAt: row.cert.expiresAt,
    instructorEn: row.instructor?.nameEn ?? null,
    instructorAr: row.instructor?.nameAr ?? null,
    status: row.status,
    verifyUrl: `${config.appUrl}/ar/verify?number=${row.cert.number}`,
    sample: config.demoMode,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aman-certificate-${row.cert.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
