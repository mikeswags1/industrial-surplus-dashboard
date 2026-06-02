const BASIC_CONTACT_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Local parts we never treat as a human outbound contact address. */
const NO_REPLY_LOCAL = /^(noreply|no[-_]?reply|donotreply|do[-_]?not[-_]?reply|mailer[-_]?daemon|postmaster|bounce|automated|notifications?|newsletters?)$/i;

/**
 * Local parts that are obvious scraped placeholders, not real human inboxes.
 * Examples we've seen in real Lead Finder results: `website@domain.com`,
 * `yourname@yourcompany.com`, `email@example.com`. These come from website
 * boilerplate or contact-form template leftovers — sending to them is a waste
 * of warmup reputation and never gets read.
 */
const PLACEHOLDER_LOCAL = /^(website|webmaster|webadmin|domain|e?mail|emails?|mailto|yourname|your[-_]?name|yourcompany|your[-_]?company|your[-_]?email|your[-_]?business|example|sample|placeholder|test\d*|sampleemail|demo|demos?|firstname|first[-_]?name|lastname|last[-_]?name|f?lname|user(name)?|username\d*|someone|anyone|nobody|me|john[-_]?doe|jane[-_]?doe|johndoe|janedoe|doe|address|name|fname|placeholder\d*|temp(orary)?|null|undefined|none|n[/]?a)$/i;

/**
 * Domain hosts that are obvious placeholders / template leftovers. We match
 * the full host so `mycompany.com` isn't blocked just because it contains
 * "company".
 */
const PLACEHOLDER_DOMAIN = /^(example|domain|yourdomain|your[-_]?domain|yourcompany|your[-_]?company|yourbusiness|your[-_]?business|yoursite|your[-_]?site|website|sample|demo|demos?|placeholder|email|e?mail|mysite|company|business|test|tests?|fake|null)\.[a-z]{2,}$/i;

/**
 * Block "echo" addresses where the local part is the same generic word as the
 * domain host — `website@website.com`, `email@email.com`, `domain@domain.com`.
 * These are classic scraped-template junk.
 */
function isEchoPlaceholder(local: string, domain: string): boolean {
  const host = domain.split(".")[0] ?? "";
  if (!host || !local) return false;
  return local.toLowerCase() === host.toLowerCase();
}

/**
 * Lead Finder emails are scraped from public HTML; gate quality before saving
 * or approving. Returns `true` only when the address looks like a real human
 * contact we should attempt to email.
 */
export function isLikelyContactEmail(email: string | null | undefined): boolean {
  const raw = typeof email === "string" ? email.trim() : "";
  if (!raw || raw.length > 254 || !BASIC_CONTACT_EMAIL.test(raw)) return false;
  const local = raw.split("@")[0] ?? "";
  const domain = raw.split("@")[1] ?? "";
  if (!local || local.length > 64) return false;
  if (!domain) return false;
  if (NO_REPLY_LOCAL.test(local)) return false;
  if (PLACEHOLDER_LOCAL.test(local)) return false;
  if (PLACEHOLDER_DOMAIN.test(domain)) return false;
  if (isEchoPlaceholder(local, domain)) return false;
  return true;
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
