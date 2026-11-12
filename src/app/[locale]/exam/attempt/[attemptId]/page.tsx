import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import { database } from "@/server/db/client";
import { courses, enrollments } from "@/server/db/schema";
import { requireViewer } from "@/server/auth/session";
import { getAttemptForTaking } from "@/server/services/exams";
import { pick } from "@/lib/format";
import { ExamRunner } from "@/components/exam/exam-runner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "exam" }))("meta"), robots: { index: false } };
}

export default async function AttemptPage({ params }: { params: Promise<{ locale: string; attemptId: string }> }) {
  const { locale, attemptId } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/exam/attempt/${attemptId}`);
  const db = await database();
  const attempt = await getAttemptForTaking(db, viewer, attemptId);
  if (!attempt) notFound();
  if (attempt.status !== "in_progress") return redirect({ href: `/exam/attempt/${attemptId}/result`, locale });
  const [course] = await db
    .select({ titleEn: courses.titleEn, titleAr: courses.titleAr })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.id, attempt.enrollmentId))
    .limit(1);

  return (
    <div className="container-page py-6 sm:py-10">
      <h1 className="sr-only">{(await getTranslations("exam.taking"))("title", { course: pick(locale, course?.titleEn, course?.titleAr) })}</h1>
      <ExamRunner
        attemptId={attempt.attemptId}
        attemptNumber={attempt.attemptNumber}
        courseTitle={pick(locale, course?.titleEn, course?.titleAr)}
        questions={attempt.questions}
        initialAnswers={attempt.answers}
        expiresAt={attempt.expiresAt.toISOString()}
        serverNow={attempt.serverNow.toISOString()}
      />
    </div>
  );
}
