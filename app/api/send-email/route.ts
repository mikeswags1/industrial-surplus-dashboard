import { NextResponse } from "next/server";
import { getResendConfig } from "@/lib/env/server";
import { sendWithResend } from "@/lib/email/resend-send";
import { resolveOutboundIdentity } from "@/lib/repositories/inboxes.repository";
import { countSendEventsForLead } from "@/lib/repositories/leads.repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertSendRateLimitOk } from "@/lib/outbound/rate-limit";
import { assertLeadMailable } from "@/lib/outbound/suppression";
import {
  appendUnsubscribeHtml,
  appendUnsubscribeText,
  buildUnsubscribeUrl,
  unsubscribeHeaders,
} from "@/lib/outbound/unsubscribe";

type Body = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  leadId?: string;
  campaignId?: string;
  /** Set true to send again when a send log already exists for this lead */
  allowResend?: boolean;
};

export async function POST(request: Request) {
  const cfg = getResendConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set. Add it under Vercel → Environment Variables (or .env.local)." },
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

  const admin = getSupabaseAdmin();
  if (body.leadId && !body.allowResend && admin) {
    const prior = await countSendEventsForLead(admin, body.leadId);
    if (prior > 0) {
      return NextResponse.json(
        {
          error:
            "This lead already has a sent email logged. Pass allowResend: true from the Send Emails page to send again.",
          code: "DUPLICATE_SEND",
        },
        { status: 409 }
      );
    }
  }

  if (admin) {
    let status: string | null = null;
    if (body.leadId) {
      const { data } = await admin
        .from("leads")
        .select("status")
        .eq("id", body.leadId)
        .maybeSingle();
      status = (data?.status as string | undefined) ?? null;
    }
    const mailable = await assertLeadMailable(admin, {
      leadId: body.leadId,
      email: to,
      status,
    });
    if (!mailable.ok) {
      return NextResponse.json(
        { error: `Suppressed recipient: ${mailable.reason}`, code: "SUPPRESSED_RECIPIENT" },
        { status: 409 }
      );
    }
  }

  const rl = await assertSendRateLimitOk();
  if (!rl.ok) {
    return NextResponse.json({ error: rl.message }, { status: 429 });
  }

  let identity = { from: cfg.from, replyTo: null as string | null };
  if (admin) {
    let orgId: string | null = null;
    if (body.leadId) {
      const { data } = await admin
        .from("leads")
        .select("organization_id")
        .eq("id", body.leadId)
        .maybeSingle();
      orgId = (data?.organization_id as string | undefined) ?? null;
    }
    try {
      identity = await resolveOutboundIdentity(admin, orgId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not resolve sender";
      return NextResponse.json({ error: msg }, { status: 501 });
    }
  }

  if (!identity.from?.trim()) {
    return NextResponse.json(
      {
        error:
          "No verified From address yet. Save Outbound sender in Settings or set RESEND_FROM_EMAIL.",
      },
      { status: 501 }
    );
  }

  const unsubscribeUrl = buildUnsubscribeUrl(request, { leadId: body.leadId, email: to });
  const htmlWithUnsubscribe = appendUnsubscribeHtml(body.html, unsubscribeUrl);
  const textWithUnsubscribe = body.text
    ? appendUnsubscribeText(body.text, unsubscribeUrl)
    : undefined;

  const sent = await sendWithResend({
    to,
    subject: body.subject,
    html: htmlWithUnsubscribe,
    text: textWithUnsubscribe,
    from: identity.from,
    replyTo: identity.replyTo,
    headers: unsubscribeHeaders(unsubscribeUrl),
  });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 502 });
  }

  if (admin) {
    await admin.from("outreach_logs").insert({
      event_type: "send",
      provider: "resend",
      provider_message_id: sent.id,
      to_email: to,
      from_email: identity.from,
      subject: body.subject,
      body_preview: htmlWithUnsubscribe.replace(/<[^>]+>/g, " ").slice(0, 240),
      lead_id: body.leadId ?? null,
      campaign_id: body.campaignId ?? null,
      meta: {},
    });
  }

  return NextResponse.json({ ok: true, providerMessageId: sent.id });
}
