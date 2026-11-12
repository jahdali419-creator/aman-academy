/** Central, typed access to environment configuration. Never log these values. */
const bool = (v: string | undefined, fallback: boolean) => (v === undefined || v === "" ? fallback : v === "true");
const int = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  get appUrl() {
    return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  /** Demo mode seeds fictional data and enables one-click demo sign-in. */
  get demoMode() {
    return bool(process.env.DEMO_MODE, false);
  },
  get databaseUrl() {
    return process.env.DATABASE_URL || "";
  },
  get authSecret() {
    const s = process.env.BETTER_AUTH_SECRET;
    if (s) return s;
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("BETTER_AUTH_SECRET is required in production");
    }
    return "dev-only-insecure-secret-change-me-0000000000";
  },
  get paymentProvider() {
    return process.env.PAYMENT_PROVIDER || "demo";
  },
  get paymentWebhookSecret() {
    return process.env.PAYMENT_WEBHOOK_SECRET || "";
  },
  get vatEnabled() {
    return bool(process.env.VAT_ENABLED, true);
  },
  get vatRateBps() {
    return this.vatEnabled ? int(process.env.VAT_RATE_BPS, 1500) : 0;
  },
  get sellerVatNumber() {
    return process.env.SELLER_VAT_NUMBER || "";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM || "Aman Academy <no-reply@example.com>";
  },
  /** Minutes an unpaid individual order holds its seat. */
  seatHoldMinutes: 15,
  /** Seconds of tolerance after an exam deadline for in-flight requests. */
  examGraceSeconds: 20,
  invitationDays: 14,
};

/** Password used only by seeded demo accounts when DEMO_MODE=true. */
export const DEMO_PASSWORD = "AmanDemo-2026!";
export const DEMO_ACCOUNTS = {
  learner: "learner@demo.aman.example",
  manager: "manager@demo.aman.example",
  instructor: "instructor@demo.aman.example",
  admin: "admin@demo.aman.example",
} as const;
export type DemoPersona = keyof typeof DEMO_ACCOUNTS;
