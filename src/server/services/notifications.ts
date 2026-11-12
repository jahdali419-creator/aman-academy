import { and, eq, gt } from "drizzle-orm";
import type { Db } from "../db/client";
import { certificates, courses, courseSessions, examAttempts, orders, user } from "../db/schema";
import { config } from "../config";
import { formatDateTime, pick } from "@/lib/format";
import { sendEmail } from "./email";

/** Confirmation email after an individual order has been paid and the learner enrolled. */
export async function notifyEnrollmentConfirmed(db: Db, orderId: string) {
  const [row] = await db
    .select({ order: orders, course: courses, session: courseSessions, learner: user })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(user, eq(user.id, orders.userId))
    .leftJoin(courseSessions, eq(courseSessions.id, orders.sessionId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row?.session || row.order.kind !== "individual") return;
  const locale = row.learner.locale;
  await sendEmail(db, {
    to: row.learner.email,
    locale,
    template: "enrollmentConfirmed",
    params: {
      name: pick(locale, row.learner.name, row.learner.nameAr),
      course: pick(locale, row.course.titleEn, row.course.titleAr),
      date: formatDateTime(row.session.startsAt, locale),
      url: `${config.appUrl}/${locale}/dashboard`,
    },
  });
}

/** Email the learner when a certificate has just been issued for the attempt they submitted. */
export async function notifyCertificateIssued(db: Db, attemptId: string) {
  const [row] = await db
    .select({ cert: certificates, course: courses, learner: user })
    .from(examAttempts)
    .innerJoin(certificates, and(eq(certificates.enrollmentId, examAttempts.enrollmentId), eq(certificates.status, "valid"), gt(certificates.issuedAt, new Date(Date.now() - 120_000))))
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .innerJoin(user, eq(user.id, certificates.userId))
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!row) return;
  const locale = row.learner.locale;
  await sendEmail(db, {
    to: row.learner.email,
    locale,
    template: "certificateIssued",
    params: {
      name: pick(locale, row.learner.name, row.learner.nameAr),
      course: pick(locale, row.course.titleEn, row.course.titleAr),
      number: row.cert.number,
      url: `${config.appUrl}/${locale}/certificates/${row.cert.number}`,
    },
  });
}
