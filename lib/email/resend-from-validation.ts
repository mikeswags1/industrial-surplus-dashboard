/** Domains consumers often want as `From`; Resend only sends from *your* verified domains. */

const RESEND_BLOCKED_FROM_DOMAINS = new Set(
  (
    [
      "gmail.com",
      "googlemail.com",
      "yahoo.com",
      "yahoo.co.uk",
      "hotmail.com",
      "outlook.com",
      "live.com",
      "msn.com",
      "icloud.com",
      "me.com",
      "aol.com",
      "pm.me",
      "proton.me",
      "protonmail.com",
    ] as const
  ).map((d) => d.toLowerCase())
);

/** Pulls bare `x@y` from `"Name <x@y>"` or `"x@y"`. Returns null if not a normal address shape. */
export function extractBareEmail(fromField: string): string | null {
  const t = fromField.trim();
  if (!t) return null;
  const angle = /<([^<>]+)>/.exec(t);
  const inner = angle ? angle[1].trim() : t.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inner)) return null;
  return inner.trim().replace(/\s+/g, "").toLowerCase();
}

export function isBlockedResendFromDomain(fromField: string): boolean {
  const addr = extractBareEmail(fromField);
  if (!addr) return false;
  const dom = addr.split("@")[1];
  return dom ? RESEND_BLOCKED_FROM_DOMAINS.has(dom.toLowerCase()) : false;
}
