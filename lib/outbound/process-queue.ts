import { sendWithResend } from "@/lib/email/resend-send";
import { resolveOutboundIdentity } from "@/lib/repositories/inboxes.repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertSendRateLimitOk } from "@/lib/outbound/rate-limit";
import { getResendConfig } from "@/lib/env/server";

type Job = {
  id: string;
  campaign_id: string;
  lead_id: string;
  step: number;
};

/**
 * Processes up to `limit` pending rows from campaign_send_queue.
 * Intended to be called from Vercel Cron (GET/POST with CRON_SECRET).
 */
export async function processCampaignQueueOnce(limit = 5): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const admin = getSupabaseAdmin();
  if (!admin) return { processed: 0, errors: ["Supabase not configured"] };
  if (!getResendConfig())
    return { processed: 0, errors: ["RESEND_API_KEY not set — add it to the server environment"] };

  const now = new Date().toISOString();
  const { data: jobs, error: qErr } = await admin
    .from("campaign_send_queue")
    .select("id, campaign_id, lead_id, step")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(limit);

  if (qErr) return { processed: 0, errors: [qErr.message] };
  if (!jobs?.length) return { processed: 0, errors: [] };

  let processed = 0;
  for (const job of jobs as Job[]) {
    const rl = await assertSendRateLimitOk();
    if (!rl.ok) {
      errors.push(rl.message);
      break;
    }

    await admin
      .from("campaign_send_queue")
      .update({ status: "processing" })
      .eq("id", job.id);

    const { data: camp, error: cErr } = await admin
      .from("campaigns")
      .select("*")
      .eq("id", job.campaign_id)
      .single();
    const { data: lead, error: lErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", job.lead_id)
      .single();

    if (cErr || lErr || !camp || !lead) {
      await admin
        .from("campaign_send_queue")
        .update({ status: "failed", last_error: "Missing campaign or lead" })
        .eq("id", job.id);
      errors.push(`Job ${job.id}: missing data`);
      continue;
    }

    const email = (lead.email as string | null)?.trim();
    if (!email) {
      await admin
        .from("campaign_send_queue")
        .update({ status: "failed", last_error: "Lead has no email" })
        .eq("id", job.id);
      continue;
    }

    let subject = camp.primary_subject as string;
    let html = camp.primary_body as string;
    if (job.step === 1) {
      subject = `Re: ${subject}`;
      html = (camp.follow_up_1 as string) || html;
    } else if (job.step >= 2) {
      subject = `Re: ${subject}`;
      html = (camp.follow_up_2 as string) || html;
    }

    const orgId =
      (typeof lead.organization_id === "string" ? lead.organization_id : null) ??
      (typeof camp.organization_id === "string" ? camp.organization_id : null);
    const identity = await resolveOutboundIdentity(admin, orgId);

    const sent = await sendWithResend({
      to: email,
      subject,
      html,
      from: identity.from,
      replyTo: identity.replyTo,
    });
    if (!sent.ok) {
      await admin
        .from("campaign_send_queue")
        .update({ status: "failed", last_error: sent.error })
        .eq("id", job.id);
      errors.push(sent.error);
      continue;
    }

    await admin.from("outreach_logs").insert({
      event_type: "send",
      provider: "resend",
      provider_message_id: sent.id,
      to_email: email,
      from_email: identity.from,
      subject,
      body_preview: html.replace(/<[^>]+>/g, " ").slice(0, 240),
      lead_id: job.lead_id,
      campaign_id: job.campaign_id,
      meta: { queue_job_id: job.id, step: job.step },
    });

    await admin
      .from("campaign_send_queue")
      .update({ status: "sent" })
      .eq("id", job.id);

    const es = (camp.emails_sent as number) ?? 0;
    await admin
      .from("campaigns")
      .update({ emails_sent: es + 1 })
      .eq("id", job.campaign_id);

    processed++;
  }

  return { processed, errors };
}
