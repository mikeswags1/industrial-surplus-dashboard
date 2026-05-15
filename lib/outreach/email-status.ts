import type { Lead } from "@/lib/types";

/**
 * Email column label for the leads table — outbound sends only (no reply / response fields).
 */
export function computeEmailSendLabel(lead: Pick<Lead, "status">, lastSendIso: string | null): string {
  if (lead.status === "Deal Won") return "Deal Won";
  if (lead.status === "Interested") return "Interested";
  if (lead.status === "Not Interested") return "Not Interested";

  const lastSendMs = lastSendIso ? Date.parse(lastSendIso) : NaN;
  if (Number.isFinite(lastSendMs)) {
    return "Email sent";
  }

  return "No email sent";
}

export function attachOutreachToLead(
  lead: Lead,
  lastSendIso: string | null,
  emailSendCount = 0
): Lead {
  return {
    ...lead,
    last_email_sent_at: lastSendIso,
    email_send_count: emailSendCount,
    email_status_label: computeEmailSendLabel(lead, lastSendIso),
  };
}
