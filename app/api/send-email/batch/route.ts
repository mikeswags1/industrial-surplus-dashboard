import { NextResponse } from "next/server";
import { getResendConfig } from "@/lib/env/server";
import { sendWithResend } from "@/lib/email/resend-send";
import { resolveOutboundIdentity } from "@/lib/repositories/inboxes.repository";
import {
  countSendEventsForLead,
  updateLeadRow,
} from "@/lib/repositories/leads.repository";
import { leadRowToLead, type LeadRow } from "@/lib/db/mappers";
import { assertSendRateLimitOk } from "@/lib/outbound/rate-limit";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainBodyToHtml(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p).trim().replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

type Body = {
  leadIds?: unknown;
  subject?: unknown;
  /** Plain text preferred; converted to simple HTML */
  body?: unknown;
  html?: unknown;
  allowResend?: unknown;
  pauseMs?: unknown;
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

  const leadIds = Array.isArray(body.leadIds)
    ? body.leadIds.filter((x): x is string => typeof x === "string")
    : [];
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const textBody = typeof body.body === "string" ? body.body.trim() : "";
  const htmlDirect = typeof body.html === "string" ? body.html.trim() : "";
  const allowResend = Boolean(body.allowResend);
  const pauseMs = Math.min(5000, Math.max(0, Number(body.pauseMs) || 650));

  if (!leadIds.length) return NextResponse.json({ error: "leadIds required" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "subject required" }, { status: 400 });
  if (!textBody && !htmlDirect) return NextResponse.json({ error: "body or html required" }, { status: 400 });

  const html = htmlDirect.length ? htmlDirect : plainBodyToHtml(textBody);
  const admin = requireSupabaseAdmin();

  const results: { leadId: string; ok: boolean; error?: string; skipped?: string }[] = [];

  for (const leadId of leadIds) {
    const rl = await assertSendRateLimitOk();
    if (!rl.ok) {
      results.push({ leadId, ok: false, error: rl.message });
      continue;
    }

    const { data: row, error: rowErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();
    if (rowErr || !row) {
      results.push({ leadId, ok: false, error: "lead not found" });
      continue;
    }

    const lead = leadRowToLead(row as LeadRow);
    const to = lead.email?.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      results.push({ leadId, ok: false, error: "no valid email on lead" });
      continue;
    }

    if (!allowResend) {
      const n = await countSendEventsForLead(admin, leadId);
      if (n > 0) {
        results.push({
          leadId,
          ok: false,
          skipped: "already_sent",
          error: "Use allowResend to send again",
        });
        continue;
      }
    }

    const identity = await resolveOutboundIdentity(admin, lead.organization_id ?? null);

    const sent = await sendWithResend({
      to,
      subject,
      html,
      text: textBody || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      from: identity.from,
      replyTo: identity.replyTo,
    });

    if (!sent.ok) {
      results.push({ leadId, ok: false, error: sent.error });
      continue;
    }

    await admin.from("outreach_logs").insert({
      event_type: "send",
      provider: "resend",
      provider_message_id: sent.id,
      to_email: to,
      from_email: identity.from,
      subject,
      body_preview: html.replace(/<[^>]+>/g, " ").slice(0, 240),
      lead_id: leadId,
      meta: { batch: true },
    });

    if (lead.status === "New") {
      await updateLeadRow(admin, leadId, { status: "Contacted" });
    }

    results.push({ leadId, ok: true });

    if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs));
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ results, sent: okCount, failed: results.length - okCount });
}
