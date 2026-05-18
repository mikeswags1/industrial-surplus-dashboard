import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE_NAME,
  isSiteAccessEnabled,
  siteAccessCookieMatches,
} from "@/lib/access/site-access";

/** Production: redirect browser traffic away from *.vercel.app (GET/HEAD only so POST webhooks keep working). */
function canonicalRedirect(request: NextRequest): NextResponse | null {
  const host = process.env.CANONICAL_HOST?.trim().toLowerCase();
  if (!host || process.env.VERCEL_ENV !== "production") return null;

  const method = request.method;
  if (method !== "GET" && method !== "HEAD") return null;

  const { hostname } = request.nextUrl;
  if (!hostname.endsWith(".vercel.app")) return null;
  if (hostname === host) return null;

  const url = request.nextUrl.clone();
  url.hostname = host;
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?|ttf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const canon = canonicalRedirect(request);
  if (canon) return canon;

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

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Site access required.", code: "SITE_ACCESS_REQUIRED" },
      { status: 401 }
    );
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
