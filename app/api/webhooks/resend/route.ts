import { NextResponse } from "next/server";
import { Webhook } from "svix";
import {
  extractBounceMetaId,
  extractBounceRecipient,
  extractFromAddress,
  extractResendEmailId,
  extractSubjectSnippet,
  extractToAddresses,
  getResendEvent,
  parseEmailAddress,
} from "@/lib/email/resend-webhook-payload";
import { getResendWebhookSecret } from "@/lib/env/server";
import {
  recordDeliveryIssueFromProvider,
  recordInboundReplyFromProvider,
} from "@/lib/repositories/leads.repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Resend webhook (Svix-signed). Configure in Resend dashboard with signing secret → RESEND_WEBHOOK_SECRET.
 * Events: `email.received` (inbound reply), `email.bounced`, `email.complained`.
 */
export async function POST(request: Request) {
  const secret = getResendWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not configured" },
      { status: 501 }
    );
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix signature headers" }, { status: 400 });
  }

  let payload: unknown;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const evt = getResendEvent(payload);
  if (!evt) {
    return NextResponse.json({ ok: true, handled: false, note: "unrecognized payload" });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    if (evt.type === "email.received") {
      const from = extractFromAddress(evt.data);
      const toList = extractToAddresses(evt.data);
      const emailId = extractResendEmailId(evt.data) || svixId;
      const { subject, snippet } = extractSubjectSnippet(evt.data);

      if (!from) {
        return NextResponse.json({
          ok: true,
          handled: false,
          reason: "could_not_parse_from_address",
        });
      }

      const rawPayload =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : { payload };

      const result = await recordInboundReplyFromProvider(admin, {
        providerMessageId: emailId,
        fromEmail: from,
        subject,
        snippet,
        toEmails: toList,
        rawPayload,
      });

      return NextResponse.json({
        ok: true,
        handled: true,
        event: evt.type,
        duplicate: result.duplicate,
        leadMatched: Boolean(result.leadId),
      });
    }

    if (evt.type === "email.bounced" || evt.type === "email.complained") {
      let recipient = extractBounceRecipient(evt.data);
      if (!recipient) {
        const alt = evt.data.recipient ?? evt.data.bounced_email;
        if (typeof alt === "string") recipient = parseEmailAddress(alt);
      }
      if (!recipient) {
        return NextResponse.json({
          ok: true,
          handled: false,
          reason: "could_not_parse_recipient",
          event: evt.type,
        });
      }
      const bounceId = extractBounceMetaId(evt.data);
      await recordDeliveryIssueFromProvider(
        admin,
        evt.type === "email.bounced" ? "bounce" : "complaint",
        {
          providerMessageId: bounceId,
          recipientEmail: recipient,
          detail: { eventType: evt.type, data: evt.data },
        }
      );
      return NextResponse.json({ ok: true, handled: true, event: evt.type });
    }

    return NextResponse.json({ ok: true, handled: false, event: evt.type });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "resend-webhook",
    hint: "POST Svix-signed Resend events to this URL",
  });
}
