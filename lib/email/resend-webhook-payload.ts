/**
 * Resend sends Svix-shaped webhooks; after signature verification the payload
 * typically includes `type` and `data`. Shapes vary slightly by event — we parse defensively.
 */

export function getResendEvent(payload: unknown): {
  type: string;
  data: Record<string, unknown>;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const type = typeof p.type === "string" ? p.type : "";
  const data = p.data;
  if (!data || typeof data !== "object") return { type, data: {} };
  return { type, data: data as Record<string, unknown> };
}

/** Parse "Name <email@x>" or bare email. */
export function parseEmailAddress(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/<([^>]+@[^>]+)>/);
  const addr = (m?.[1] ?? s).trim().toLowerCase();
  return addr.includes("@") ? addr : null;
}

export function extractFromAddress(data: Record<string, unknown>): string | null {
  const from = data.from;
  if (typeof from === "string") return parseEmailAddress(from);
  if (from && typeof from === "object" && "email" in from) {
    const e = (from as { email?: string }).email;
    if (typeof e === "string") return parseEmailAddress(e);
  }
  return null;
}

export function extractToAddresses(data: Record<string, unknown>): string[] {
  const to = data.to;
  if (Array.isArray(to)) {
    const out: string[] = [];
    for (const x of to) {
      if (typeof x === "string") {
        const e = parseEmailAddress(x);
        if (e) out.push(e);
      }
    }
    return out;
  }
  if (typeof to === "string") {
    const e = parseEmailAddress(to);
    return e ? [e] : [];
  }
  return [];
}

export function extractResendEmailId(data: Record<string, unknown>): string {
  const candidates = [data.email_id, data.id];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const email = data.email;
  if (email && typeof email === "object") {
    const id = (email as { id?: string }).id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return "";
}

export function extractSubjectSnippet(
  data: Record<string, unknown>
): { subject: string | null; snippet: string | null } {
  const sub =
    typeof data.subject === "string"
      ? data.subject
      : typeof data.title === "string"
        ? data.title
        : null;
  const sn =
    typeof data.text === "string"
      ? data.text
      : typeof data.snippet === "string"
        ? data.snippet
        : typeof data.body === "string"
          ? data.body
          : null;
  return { subject: sub, snippet: sn };
}

/** Bounce / complaint payloads — try common Resend field layouts */
export function extractBounceRecipient(data: Record<string, unknown>): string | null {
  const email = data.email;
  if (email && typeof email === "object") {
    const nested = email as { to?: string | string[] };
    if (typeof nested.to === "string") return parseEmailAddress(nested.to);
    if (Array.isArray(nested.to) && typeof nested.to[0] === "string") {
      return parseEmailAddress(nested.to[0]);
    }
    const to = (email as { to?: string[]; from?: string }).to;
    if (Array.isArray(to) && typeof to[0] === "string") return parseEmailAddress(to[0]);
    const bounceTo = (email as { bounce?: { to?: string } }).bounce;
    if (bounceTo && typeof bounceTo.to === "string") return parseEmailAddress(bounceTo.to);
  }
  if (typeof data.to === "string") return parseEmailAddress(data.to);
  const to = data.to;
  if (Array.isArray(to) && typeof to[0] === "string") return parseEmailAddress(to[0]);
  return null;
}

export function extractBounceMetaId(data: Record<string, unknown>): string | null {
  const email = data.email;
  if (email && typeof email === "object" && "id" in email) {
    const id = (email as { id?: string }).id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  if (typeof data.id === "string" && data.id.trim()) return data.id.trim();
  return null;
}
