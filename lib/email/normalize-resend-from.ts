/**
 * Resend expects `from` like `email@domain.com` or `Name <email@domain.com>`.
 * Users sometimes paste fullwidth brackets, HTML entities, or odd whitespace.
 */

import { extractBareEmail } from "@/lib/email/resend-from-validation";

const RE_BARE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

/**
 * Returns a string safe to pass to Resend `from`, or a short reason if invalid.
 */
export function normalizeResendFromHeader(raw: string): { ok: true; from: string } | { ok: false; reason: string } {
  let s = decodeBasicEntities(raw.replace(/^\uFEFF/, "").trim());
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\uFF1C/g, "<").replace(/\uFF1E/g, ">");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\s+/g, " ");

  if (RE_BARE.test(s)) {
    return { ok: true, from: s };
  }

  const angle = /^(.+?)\s*<\s*([^\s@]+@[^\s@]+\.[^\s@]+)\s*>\s*$/.exec(s);
  if (angle) {
    let name = angle[1].trim().replace(/^["']|["']$/g, "");
    const email = angle[2].trim();
    if (!name.length) {
      return { ok: true, from: email };
    }
    if (/[,;()]/.test(name)) {
      name = `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return { ok: true, from: `${name} <${email}>` };
  }

  const bare = extractBareEmail(s);
  if (bare) {
    return { ok: true, from: bare };
  }

  return {
    ok: false,
    reason:
      "From must look like email@domain.com or Name <email@domain.com> (check for smart quotes or wrong brackets).",
  };
}
