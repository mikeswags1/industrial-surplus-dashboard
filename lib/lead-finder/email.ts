const BASIC_CONTACT_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Local parts we never treat as a human outbound contact address. */
const NO_REPLY_LOCAL = /^(noreply|no[-_]?reply|donotreply|do[-_]?not[-_]?reply|mailer[-_]?daemon|postmaster|bounce|automated|notifications?|newsletters?)$/i;

/**
 * Lead Finder emails are scraped from public HTML; gate quality before saving or approving.
 */
export function isLikelyContactEmail(email: string | null | undefined): boolean {
  const raw = typeof email === "string" ? email.trim() : "";
  if (!raw || raw.length > 254 || !BASIC_CONTACT_EMAIL.test(raw)) return false;
  const local = raw.split("@")[0] ?? "";
  if (!local || local.length > 64) return false;
  return !NO_REPLY_LOCAL.test(local);
}

export function pickFirstContactEmail(emails?: string[]): string {
  if (!emails?.length) return "";
  for (const e of emails) {
    if (!e) continue;
    const t = e.trim();
    if (isLikelyContactEmail(t)) return t.toLowerCase();
  }
  return "";
}
