import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE_NAME,
  isSiteAccessEnabled,
  siteAccessCookieMatches,
} from "@/lib/access/site-access";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?|ttf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/access" ||
    pathname.startsWith("/api/access") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  if (!isSiteAccessEnabled()) {
    return NextResponse.next();
  }

  const cookieVal = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value;
  if (siteAccessCookieMatches(cookieVal)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

/** Root `/` must be listed explicitly; some Next versions skip a single negative-lookahead segment. */
export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
