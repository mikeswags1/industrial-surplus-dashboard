import type { Lead } from "@/lib/types";

export type OutreachTimestamps = {
  lastSendIso: string | null;
  lastReplyIso: string | null;
};

function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 86_400_000));
}

/**
 * Client-facing email outreach label (from `outreach_logs` + pipeline `status`).
 * Does not require lead to show "we sell surplus" — only send/reply history.
 */
export function computeEmailStatusLabel(
  lead: Pick<Lead, "status">,
  lastSendIso: string | null,
  lastReplyIso: string | null,
  nowMs: number = Date.now()
): string {
  if (lead.status === "Deal Won") return "Deal Won";
  if (lead.status === "Interested") return "Interested";
  if (lead.status === "Not Interested") return "Not Interested";

  const lastReplyMs = lastReplyIso ? Date.parse(lastReplyIso) : NaN;
  if (Number.isFinite(lastReplyMs) || lead.status === "Replied") {
    return "Replied";
  }

  const lastSendMs = lastSendIso ? Date.parse(lastSendIso) : NaN;
  if (Number.isFinite(lastSendMs)) {
    const d = daysBetween(lastSendMs, nowMs);
    if (d > 3) return `No Response — ${d} days`;
    return "Email Sent";
  }

  return "No Email Sent";
}

export function attachOutreachToLead(
  lead: Lead,
  lastSendIso: string | null,
  lastReplyIso: string | null,
  nowMs?: number
): Lead {
  return {
    ...lead,
    last_email_sent_at: lastSendIso,
    reply_logged_at: lastReplyIso,
    email_status_label: computeEmailStatusLabel(lead, lastSendIso, lastReplyIso, nowMs),
  };
}
