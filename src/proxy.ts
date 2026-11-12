import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { defaultLocale, isLocale } from "./messages";

const handle = createMiddleware(routing);
const COOKIE = "aman_locale";

/**
 * Language rules:
 *  - new visitors always start in Arabic (browser language is ignored);
 *  - an explicit choice is remembered in a cookie and honoured on later visits.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  const saved = req.cookies.get(COOKIE)?.value;

  if (!isLocale(first) && isLocale(saved) && saved !== defaultLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${saved}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const res = handle(req);
  if (isLocale(first) && saved !== first) {
    res.cookies.set(COOKIE, first, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|preview|_next|_vercel|icons|.*\\..*).*)"],
};
