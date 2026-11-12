import { cookies } from "next/headers";

export type Lang = "ar" | "en";
export const LANG_COOKIE = "aman_preview_lang";

/** Arabic unless the visitor has explicitly chosen English. */
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  return saved === "en" ? "en" : "ar";
}
