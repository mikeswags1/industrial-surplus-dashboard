/**
 * Browser gate: shared code + HTTP-only cookie.
 * Defaults — code `5723` and a fixed session token — so production works without extra env.
 * Set SITE_ACCESS_DISABLED=1 locally if you want no prompt.
 * Override code/token via SITE_ACCESS_CODE / SITE_ACCESS_SESSION_TOKEN anytime.
 */

export const SITE_ACCESS_COOKIE_NAME = "ss_site_gate";

/** ~90 days */
export const SITE_ACCESS_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90;

/** Default PIN shared with Jake (override with SITE_ACCESS_CODE). */
const DEFAULT_ACCESS_CODE = "5723";

/**
 * Stable cookie secret when SITE_ACCESS_SESSION_TOKEN is unset.
 * Anyone with repo access could forge this cookie — prefer env token for stricter setups.
 */
const DEFAULT_SESSION_TOKEN =
  "ss5723df9e8c41ab736291084fce07d265fb83e14962d51056ad782270832bc914";

const encoder = new TextEncoder();

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i]! ^ bufB[i]!;
  return diff === 0;
}

export function isSiteAccessExplicitlyDisabled(): boolean {
  const v = process.env.SITE_ACCESS_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getSiteAccessExpectedCode(): string | null {
  const c = process.env.SITE_ACCESS_CODE?.trim();
  return c?.length ? c : DEFAULT_ACCESS_CODE;
}

/** Cookie must match this after unlock (server-only). */
export function getSiteAccessSessionToken(): string | null {
  const t = process.env.SITE_ACCESS_SESSION_TOKEN?.trim();
  return t?.length ? t : DEFAULT_SESSION_TOKEN;
}

export function isSiteAccessEnabled(): boolean {
  if (isSiteAccessExplicitlyDisabled()) return false;
  return Boolean(getSiteAccessExpectedCode() && getSiteAccessSessionToken());
}

export function siteAccessCookieMatches(raw: string | undefined): boolean {
  const token = getSiteAccessSessionToken();
  if (!token || raw === undefined) return false;
  return timingSafeEqualStr(raw, token);
}

/** Optional `domain` (e.g. `.selectsurplususa.com`) so the gate works on every subdomain (dash / www). */
export function getSiteAccessCookieSetOptions(maxAge: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  domain?: string;
} {
  const domain = process.env.SITE_ACCESS_COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}
