import type { SupabaseClient } from "@supabase/supabase-js";

const SUPPRESSING_EVENTS = ["bounce", "complaint", "unsubscribe"];

export async function assertLeadMailable(
  admin: SupabaseClient,
  input: { leadId?: string | null; email: string; status?: string | null }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (input.status === "Not Interested") {
    return { ok: false, reason: "lead is marked Not Interested / unsubscribed" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, reason: "no valid email on lead" };

  if (input.leadId?.trim()) {
    const { count, error } = await admin
      .from("outreach_logs")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", input.leadId.trim())
      .in("event_type", SUPPRESSING_EVENTS);
    if (error) return { ok: false, reason: error.message };
    if ((count ?? 0) > 0) {
      return { ok: false, reason: "lead has a bounce, complaint, or unsubscribe event" };
    }
  }

  const { count, error } = await admin
    .from("outreach_logs")
    .select("id", { count: "exact", head: true })
    .ilike("to_email", email)
    .in("event_type", SUPPRESSING_EVENTS);
  if (error) return { ok: false, reason: error.message };
  if ((count ?? 0) > 0) {
    return { ok: false, reason: "email has a bounce, complaint, or unsubscribe event" };
  }

  return { ok: true };
}
