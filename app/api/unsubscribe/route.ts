import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function recordUnsubscribe(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: true, message: "Unsubscribed." });
  }

  const url = new URL(request.url);
  const leadId = url.searchParams.get("lead")?.trim() ?? "";
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!leadId && !email) {
    return NextResponse.json({ error: "Missing unsubscribe target." }, { status: 400 });
  }

  let resolvedLeadId: string | null = leadId || null;
  if (!resolvedLeadId && email) {
    const { data } = await admin
      .from("leads")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    resolvedLeadId = (data?.id as string | undefined) ?? null;
  }

  if (resolvedLeadId) {
    await admin
      .from("leads")
      .update({ status: "Not Interested" })
      .eq("id", resolvedLeadId);
  }

  const event = {
    event_type: "unsubscribe",
    provider: "dashboard",
    lead_id: resolvedLeadId,
    to_email: email || null,
    subject: "Unsubscribed",
    body_preview: "Recipient used unsubscribe link.",
    meta: { source: "unsubscribe_link" },
  };

  const { error } = await admin.from("outreach_logs").insert(event);
  if (error) {
    await admin.from("outreach_logs").insert({
      ...event,
      event_type: "complaint",
      subject: "Unsubscribed",
    });
  }

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:32px;line-height:1.5"><h1>You're unsubscribed</h1><p>No more outreach emails will be sent to this address.</p></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  return recordUnsubscribe(request);
}

export async function POST(request: Request) {
  return recordUnsubscribe(request);
}
