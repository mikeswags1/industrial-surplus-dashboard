import { NextResponse } from "next/server";
import { getResendConfig } from "@/lib/env/server";
import { sendWithResend } from "@/lib/email/resend-send";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertSendRateLimitOk } from "@/lib/outbound/rate-limit";

type Body = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  leadId?: string;
  campaignId?: string;
};

export async function POST(request: Request) {
  const cfg = getResendConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Resend not configured (RESEND_API_KEY, RESEND_FROM_EMAIL)" },
      { status: 501 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = body.to?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "valid to email required" }, { status: 400 });
  }
  if (!body.subject?.trim() || !body.html?.trim()) {
    return NextResponse.json({ error: "subject and html required" }, { status: 400 });
  }

  const rl = await assertSendRateLimitOk();
  if (!rl.ok) {
    return NextResponse.json({ error: rl.message }, { status: 429 });
  }

  const sent = await sendWithResend({
    to,
    subject: body.subject,
    html: body.html,
    text: body.text,
  });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 502 });
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    await admin.from("outreach_logs").insert({
      event_type: "send",
      provider: "resend",
      provider_message_id: sent.id,
      to_email: to,
      from_email: cfg.from,
      subject: body.subject,
      body_preview: body.html.replace(/<[^>]+>/g, " ").slice(0, 240),
      lead_id: body.leadId ?? null,
      campaign_id: body.campaignId ?? null,
      meta: {},
    });
  }

  return NextResponse.json({ ok: true, providerMessageId: sent.id });
}
