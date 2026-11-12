import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export type Bilingual = { en: string; ar: string };
export type BilingualList = { en: string[]; ar: string[] };
export type SyllabusModule = { title: Bilingual; topics: BilingualList };
export type Credential = { title: Bilingual; issuer: string; verified: boolean };
export type QuestionOption = { id: string; en: string; ar: string };
export type AttemptQuestionOrder = { questionId: string; optionOrder: string[] }[];

/* ------------------------------------------------------------------ */
/* Authentication (tables managed by Better Auth)                      */
/* ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", ["learner", "instructor", "admin"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // English / Latin-script full name
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Application fields
  nameAr: text("name_ar"),
  phone: text("phone"),
  role: userRole("role").notNull().default("learner"),
  locale: text("locale").notNull().default("ar"),
  isDemo: boolean("is_demo").notNull().default(false),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  phone: text("phone"),
  crNumber: text("cr_number"),
  vatNumber: text("vat_number"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const membershipRole = pgEnum("membership_role", ["manager", "employee"]);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("employee"),
    createdAt: createdAt(),
  },
  (t) => [
    // A user belongs to at most one organization in this release.
    uniqueIndex("memberships_user_uq").on(t.userId),
    index("memberships_org_idx").on(t.orgId),
  ],
);

export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked"]);

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: invitationStatus("status").notNull().default("pending"),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    acceptedUserId: text("accepted_user_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("invitations_org_idx").on(t.orgId),
    uniqueIndex("invitations_pending_uq")
      .on(t.orgId, t.email)
      .where(sql`${t.status} = 'pending'`),
  ],
);

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const instructors = pgTable("instructors", {
  id: id(),
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  titleEn: text("title_en").notNull().default(""),
  titleAr: text("title_ar").notNull().default(""),
  bioEn: text("bio_en").notNull().default(""),
  bioAr: text("bio_ar").notNull().default(""),
  credentials: jsonb("credentials").$type<Credential[]>().notNull().default([]),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: createdAt(),
});

export const courses = pgTable(
  "courses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    code: text("code").notNull().unique(),
    icon: text("icon").notNull().default("shield"),
    titleEn: text("title_en").notNull(),
    titleAr: text("title_ar").notNull(),
    summaryEn: text("summary_en").notNull().default(""),
    summaryAr: text("summary_ar").notNull().default(""),
    overviewEn: text("overview_en").notNull().default(""),
    overviewAr: text("overview_ar").notNull().default(""),
    outcomes: jsonb("outcomes").$type<BilingualList>().notNull().default({ en: [], ar: [] }),
    audience: jsonb("audience").$type<BilingualList>().notNull().default({ en: [], ar: [] }),
    prerequisites: jsonb("prerequisites").$type<BilingualList>().notNull().default({ en: [], ar: [] }),
    syllabus: jsonb("syllabus").$type<SyllabusModule[]>().notNull().default([]),
    practicalNoteEn: text("practical_note_en").notNull().default(""),
    practicalNoteAr: text("practical_note_ar").notNull().default(""),
    durationMinutes: integer("duration_minutes").notNull(),
    priceHalalas: integer("price_halalas").notNull(),
    minAttendancePercent: integer("min_attendance_percent").notNull().default(80),
    // null = certificates for this course do not expire
    certificateValidityMonths: integer("certificate_validity_months"),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check("courses_price_nonneg", sql`${t.priceHalalas} >= 0`),
    check("courses_attendance_range", sql`${t.minAttendancePercent} between 0 and 100`),
  ],
);

export const teachingLanguage = pgEnum("teaching_language", ["ar", "en"]);
export const meetingProvider = pgEnum("meeting_provider", ["teams", "zoom"]);
export const sessionStatus = pgEnum("session_status", ["scheduled", "completed", "cancelled"]);

export const courseSessions = pgTable(
  "course_sessions",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    instructorId: text("instructor_id").references(() => instructors.id, { onDelete: "set null" }),
    language: teachingLanguage("language").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    maxSeats: integer("max_seats").notNull(),
    provider: meetingProvider("provider").notNull(),
    // PROTECTED: never select these two columns in public queries.
    joinUrl: text("join_url"),
    joinInstructionsEn: text("join_instructions_en").notNull().default(""),
    joinInstructionsAr: text("join_instructions_ar").notNull().default(""),
    status: sessionStatus("status").notNull().default("scheduled"),
    createdAt: createdAt(),
  },
  (t) => [
    index("course_sessions_course_idx").on(t.courseId, t.startsAt),
    check("course_sessions_seats_pos", sql`${t.maxSeats} > 0`),
    check("course_sessions_time_order", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/* ------------------------------------------------------------------ */
/* Orders and payments                                                 */
/* ------------------------------------------------------------------ */

export const orderKind = pgEnum("order_kind", ["individual", "company_seats"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "failed", "cancelled", "refunded"]);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "restrict" }),
    kind: orderKind("kind").notNull(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    sessionId: text("session_id").references(() => courseSessions.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitPriceHalalas: integer("unit_price_halalas").notNull(),
    subtotalHalalas: integer("subtotal_halalas").notNull(),
    vatRateBps: integer("vat_rate_bps").notNull().default(0),
    vatHalalas: integer("vat_halalas").notNull().default(0),
    totalHalalas: integer("total_halalas").notNull(),
    currency: text("currency").notNull().default("SAR"),
    status: orderStatus("status").notNull().default("pending"),
    billingName: text("billing_name"),
    billingEmail: text("billing_email"),
    billingPhone: text("billing_phone"),
    billingCompany: text("billing_company"),
    billingVatNumber: text("billing_vat_number"),
    // Individual orders hold a seat while pending, until this time.
    holdExpiresAt: ts("hold_expires_at"),
    paidAt: ts("paid_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_session_idx").on(t.sessionId),
    check("orders_quantity_pos", sql`${t.quantity} > 0`),
    check("orders_total_nonneg", sql`${t.totalHalalas} >= 0`),
  ],
);

export const paymentStatus = pgEnum("payment_status", ["succeeded", "failed"]);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    // Provider event id: unique so a replayed event can never be applied twice.
    providerEventId: text("provider_event_id").notNull(),
    status: paymentStatus("status").notNull(),
    amountHalalas: integer("amount_halalas").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payments_event_uq").on(t.provider, t.providerEventId)],
);

export const seatPurchases = pgTable(
  "seat_purchases",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    orderId: text("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "restrict" }),
    seatsTotal: integer("seats_total").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("seat_purchases_org_idx").on(t.orgId, t.courseId), check("seat_purchases_pos", sql`${t.seatsTotal} > 0`)],
);

/* ------------------------------------------------------------------ */
/* Enrollment and attendance                                           */
/* ------------------------------------------------------------------ */

export const enrollmentStatus = pgEnum("enrollment_status", ["active", "cancelled"]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => courseSessions.id, { onDelete: "restrict" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    // Set when the seat was provided by a company.
    orgId: text("org_id").references(() => organizations.id, { onDelete: "restrict" }),
    seatPurchaseId: text("seat_purchase_id").references(() => seatPurchases.id, { onDelete: "restrict" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "restrict" }),
    status: enrollmentStatus("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("enrollments_user_session_active_uq")
      .on(t.userId, t.sessionId)
      .where(sql`${t.status} = 'active'`),
    index("enrollments_session_idx").on(t.sessionId),
    index("enrollments_org_idx").on(t.orgId),
  ],
);

export const attendanceStatus = pgEnum("attendance_status", ["present", "partial", "absent"]);

export const attendance = pgTable(
  "attendance",
  {
    id: id(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .unique()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    percent: integer("percent").notNull(),
    note: text("note"),
    markedBy: text("marked_by").references(() => user.id, { onDelete: "set null" }),
    markedAt: ts("marked_at").notNull().defaultNow(),
  },
  (t) => [check("attendance_percent_range", sql`${t.percent} between 0 and 100`)],
);

/* ------------------------------------------------------------------ */
/* Exams                                                               */
/* ------------------------------------------------------------------ */

export const exams = pgTable(
  "exams",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .unique()
      .references(() => courses.id, { onDelete: "cascade" }),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    passingScorePercent: integer("passing_score_percent").notNull().default(70),
    maxAttempts: integer("max_attempts").notNull().default(2),
    questionsPerAttempt: integer("questions_per_attempt").notNull().default(10),
    retakeCooldownHours: integer("retake_cooldown_hours").notNull().default(0),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(true),
    shuffleOptions: boolean("shuffle_options").notNull().default(true),
  },
  (t) => [
    check("exams_pass_range", sql`${t.passingScorePercent} between 1 and 100`),
    check("exams_attempts_pos", sql`${t.maxAttempts} > 0`),
    check("exams_duration_pos", sql`${t.durationMinutes} > 0`),
    check("exams_questions_pos", sql`${t.questionsPerAttempt} > 0`),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    textEn: text("text_en").notNull(),
    textAr: text("text_ar").notNull(),
    options: jsonb("options").$type<QuestionOption[]>().notNull(),
    // SECRET until an attempt is submitted: never send to the browser.
    correctOptionId: text("correct_option_id").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("questions_exam_idx").on(t.examId)],
);

export const attemptStatus = pgEnum("attempt_status", ["in_progress", "submitted", "expired"]);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: id(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    status: attemptStatus("status").notNull().default("in_progress"),
    questionOrder: jsonb("question_order").$type<AttemptQuestionOrder>().notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    startedAt: ts("started_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    submittedAt: ts("submitted_at"),
    correctCount: integer("correct_count"),
    scorePercent: integer("score_percent"),
    passed: boolean("passed"),
  },
  (t) => [
    uniqueIndex("exam_attempts_number_uq").on(t.enrollmentId, t.attemptNumber),
    // At most one attempt in progress per enrollment.
    uniqueIndex("exam_attempts_in_progress_uq")
      .on(t.enrollmentId)
      .where(sql`${t.status} = 'in_progress'`),
  ],
);

/* ------------------------------------------------------------------ */
/* Certificates                                                        */
/* ------------------------------------------------------------------ */

export const certificateStatus = pgEnum("certificate_status", ["valid", "revoked"]);

export const certificates = pgTable(
  "certificates",
  {
    id: id(),
    number: text("number").notNull().unique(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    instructorId: text("instructor_id").references(() => instructors.id, { onDelete: "set null" }),
    // Snapshot of the name as printed on the certificate.
    learnerNameEn: text("learner_name_en").notNull(),
    learnerNameAr: text("learner_name_ar"),
    completedAt: ts("completed_at").notNull(),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    expiresAt: ts("expires_at"),
    status: certificateStatus("status").notNull().default("valid"),
    revokedAt: ts("revoked_at"),
    revokeReason: text("revoke_reason"),
    replacesId: text("replaces_id"),
  },
  (t) => [
    // Only one valid certificate may exist per enrollment.
    uniqueIndex("certificates_enrollment_valid_uq")
      .on(t.enrollmentId)
      .where(sql`${t.status} = 'valid'`),
    index("certificates_user_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    // Never store secrets, passwords or exam answers here.
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

export const inquiryKind = pgEnum("inquiry_kind", ["contact", "company"]);

export const inquiries = pgTable("inquiries", {
  id: id(),
  kind: inquiryKind("kind").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  headcount: text("headcount"),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

export const emailOutbox = pgTable("email_outbox", {
  id: id(),
  toEmail: text("to_email").notNull(),
  locale: text("locale").notNull(),
  template: text("template").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});
