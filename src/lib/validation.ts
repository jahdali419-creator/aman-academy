import { z } from "zod";
import { normalizeSaudiMobile } from "./format";

/** Zod schemas for all user input. Messages are error codes from the `errors` namespace. */
const text = (max = 200) => z.string().trim().min(1, "required").max(max, "too_long");
const optionalText = (max = 200) => z.string().trim().max(max, "too_long").optional().default("");

export const email = z.string().trim().toLowerCase().min(1, "required").max(254, "too_long").pipe(z.email("invalid_email"));
export const password = z.string().min(1, "required").min(10, "password_short").max(128, "too_long");

export const saudiMobile = z
  .string()
  .trim()
  .min(1, "required")
  .transform((v, ctx) => {
    const n = normalizeSaudiMobile(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return z.NEVER;
    }
    return n;
  });

const nameEn = text(120).regex(/^[A-Za-z][A-Za-z .'-]*$/, "name_latin");
const nameAr = z.string().trim().max(120, "too_long").regex(/^[؀-ۿ\s.'-]*$/, "name_arabic").optional().default("");

const digitsOptional = (len: number, code: string) =>
  z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || new RegExp(`^\\d{${len}}$`).test(v), code);

export const signInSchema = z.object({ email, password: z.string().min(1, "required"), next: optionalText(300) });

export const registerSchema = z.object({
  name: nameEn,
  nameAr,
  email,
  phone: saudiMobile,
  password,
  next: optionalText(300),
  invite: optionalText(100),
});

export const registerCompanySchema = z.object({
  companyName: text(160),
  name: nameEn,
  email,
  phone: saudiMobile,
  password,
  crNumber: digitsOptional(10, "invalid_cr"),
  vatNumber: digitsOptional(15, "invalid_vat"),
});

export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ token: text(300), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password_mismatch" });

export const profileSchema = z.object({ name: nameEn, nameAr, phone: saudiMobile, locale: z.enum(["ar", "en"]) });
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "required"), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password_mismatch" });

export const billingSchema = z.object({
  orderId: text(64),
  billingName: text(160),
  billingEmail: email,
  billingPhone: saudiMobile,
  billingCompany: optionalText(160),
  billingVatNumber: digitsOptional(15, "invalid_vat"),
});

export const inquirySchema = z.object({
  kind: z.enum(["contact", "company"]),
  name: text(120),
  email,
  phone: z.string().trim().max(30, "too_long").optional().default(""),
  company: optionalText(160),
  headcount: optionalText(20),
  message: text(2000),
  // Honeypot: real people leave this empty.
  website: z.string().max(0).optional().default(""),
});

export const organizationSchema = z.object({
  name: text(160),
  contactName: text(120),
  contactEmail: email,
  phone: saudiMobile,
  crNumber: digitsOptional(10, "invalid_cr"),
  vatNumber: digitsOptional(15, "invalid_vat"),
});

export const inviteSchema = z.object({ name: text(120), email });
export const seatOrderSchema = z.object({ courseId: text(64), quantity: z.coerce.number("invalid_number").int("invalid_number").min(1, "invalid_quantity").max(200, "invalid_quantity") });
export const assignSchema = z.object({ userId: text(64), sessionId: text(64) });

export const attendanceSchema = z.object({
  enrollmentId: text(64),
  status: z.enum(["present", "partial", "absent"]),
  percent: z.coerce.number("invalid_number").int("invalid_percent").min(0, "invalid_percent").max(100, "invalid_percent"),
  note: optionalText(300),
});

export const joinDetailsSchema = z.object({
  sessionId: text(64),
  joinUrl: z.string().trim().max(600, "too_long").optional().default(""),
  joinInstructionsEn: optionalText(1000),
  joinInstructionsAr: optionalText(1000),
});

/** Only same-site relative paths are allowed as post-login destinations. */
export const safeNext = (v: string | undefined | null) => (v && /^\/(?!\/)[\w\-./?=&%]*$/.test(v) ? v : null);
