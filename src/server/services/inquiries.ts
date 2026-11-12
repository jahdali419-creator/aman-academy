import type { Db } from "../db/client";
import { inquiries } from "../db/schema";

export type InquiryInput = {
  kind: "contact" | "company";
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  headcount?: string | null;
  message: string;
};

export async function createInquiry(db: Db, input: InquiryInput) {
  const [row] = await db
    .insert(inquiries)
    .values({ ...input, phone: input.phone || null, company: input.company || null, headcount: input.headcount || null })
    .returning({ id: inquiries.id });
  return row;
}
