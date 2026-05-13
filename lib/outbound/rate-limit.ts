import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_SENDS_PER_HOUR = Number(
  process.env.OUTBOUND_MAX_SENDS_PER_HOUR ?? "100"
);

export async function assertSendRateLimitOk(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: true };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("outreach_logs")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "send")
    .gte("created_at", since);

  if (error) return { ok: false, message: error.message };
  if ((count ?? 0) >= MAX_SENDS_PER_HOUR) {
    return {
      ok: false,
      message: `Rate limit: max ${MAX_SENDS_PER_HOUR} sends/hour (outreach_logs).`,
    };
  }
  return { ok: true };
}
