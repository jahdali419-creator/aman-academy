import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "../db/client";
import { account, session, user, verification } from "../db/schema";
import { config } from "../config";
import { sendEmail } from "../services/email";

function create() {
  return betterAuth({
    baseURL: config.appUrl,
    secret: config.authSecret,
    database: drizzleAdapter(getDb(), { provider: "pg", schema: { user, session, account, verification } }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: u, token }) => {
        const locale = (u as { locale?: string }).locale ?? "ar";
        await sendEmail(getDb(), {
          to: u.email,
          locale,
          template: "passwordReset",
          params: { name: u.name, url: `${config.appUrl}/${locale}/reset-password?token=${token}` },
        });
      },
    },
    user: {
      additionalFields: {
        nameAr: { type: "string", required: false },
        phone: { type: "string", required: false },
        locale: { type: "string", required: false, defaultValue: "ar" },
        // Privileged fields can never be set from client input.
        role: { type: "string", required: false, defaultValue: "learner", input: false },
        isDemo: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 20 },
    advanced: { cookiePrefix: "aman" },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof create>;
const g = globalThis as unknown as { __amanAuth?: Auth };

/** Lazily constructed so that importing this module never opens the database. */
export function getAuth(): Auth {
  return (g.__amanAuth ??= create());
}
