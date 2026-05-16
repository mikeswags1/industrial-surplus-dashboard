import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE_MAX_AGE_SEC,
  SITE_ACCESS_COOKIE_NAME,
  getSiteAccessExpectedCode,
  getSiteAccessSessionToken,
  isSiteAccessEnabled,
  isSiteAccessExplicitlyDisabled,
  siteAccessCookieMatches,
  timingSafeEqualStr,
} from "@/lib/access/site-access";

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(SITE_ACCESS_COOKIE_NAME)?.value;
  const gateActive = isSiteAccessEnabled();
  const unlocked = gateActive && siteAccessCookieMatches(raw);
  const explicitlyDisabled = isSiteAccessExplicitlyDisabled();
  return NextResponse.json({ gateActive, unlocked, explicitlyDisabled });
}

export async function POST(request: Request) {
  if (!isSiteAccessEnabled()) {
    return NextResponse.json(
      { error: "Site access gate is turned off (SITE_ACCESS_DISABLED)." },
      { status: 501 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const submitted =
    typeof body === "object" && body !== null && typeof (body as { code?: unknown }).code === "string"
      ? (body as { code: string }).code
      : "";

  const expected = getSiteAccessExpectedCode()!;
  const token = getSiteAccessSessionToken()!;

  if (!timingSafeEqualStr(submitted.trim(), expected)) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(SITE_ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_ACCESS_COOKIE_MAX_AGE_SEC,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(SITE_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
