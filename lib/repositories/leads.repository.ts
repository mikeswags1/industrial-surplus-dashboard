import type { SupabaseClient } from "@supabase/supabase-js";
import {
  leadInputToInsert,
  leadRowToLead,
  type LeadRow,
} from "@/lib/db/mappers";
import { attachOutreachToLead } from "@/lib/outreach/email-status";
import { normalizeDedupeKey } from "@/lib/leads/csv";
import type { Lead, LeadStatus } from "@/lib/types";

const MAX_LIST = 2000;
const DEFAULT_LIST = 500;

export function clampLeadListParams(limitRaw: string | null, offsetRaw: string | null) {
  const limit = Math.min(
    MAX_LIST,
    Math.max(1, Number.parseInt(limitRaw ?? "", 10) || DEFAULT_LIST)
  );
  const offset = Math.max(0, Number.parseInt(offsetRaw ?? "", 10) || 0);
  return { limit, offset };
}

export async function queryExistingDedupeKeys(
  admin: SupabaseClient,
  maxRows = 5000
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("leads")
    .select("email, company_name")
    .limit(maxRows);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  for (const r of data ?? []) {
    const e = (r.email as string | null)?.trim();
    const c = (r.company_name as string)?.trim();
    if (e && c) seen.add(normalizeDedupeKey(e, c));
  }
  return seen;
}

type LogRow = { lead_id: string | null; event_type: string; created_at: string };

type LeadOutreachAgg = {
  lastSend: string | null;
  lastReply: string | null;
  sendCount: number;
  replyCount: number;
};

function aggregateOutreachByLeadId(logs: LogRow[]) {
  const map = new Map<string, LeadOutreachAgg>();
  for (const row of logs) {
    const id = row.lead_id;
    if (!id) continue;
    let e = map.get(id);
    if (!e) {
      e = { lastSend: null, lastReply: null, sendCount: 0, replyCount: 0 };
      map.set(id, e);
    }
    if (row.event_type === "send") {
      e.sendCount += 1;
      if (!e.lastSend || row.created_at > e.lastSend) e.lastSend = row.created_at;
    }
    if (row.event_type === "reply") {
      e.replyCount += 1;
      if (!e.lastReply || row.created_at > e.lastReply) e.lastReply = row.created_at;
    }
  }
  return map;
}

export async function fetchLeads(
  admin: SupabaseClient,
  limit: number,
  offset: number
): Promise<Lead[]> {
  const end = offset + limit - 1;
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, end);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as LeadRow[];
  const base = rows.map((r) => leadRowToLead(r));
  const ids = base.map((l) => l.id);
  if (ids.length === 0) return [];

  const { data: logs, error: logErr } = await admin
    .from("outreach_logs")
    .select("lead_id, event_type, created_at")
    .in("lead_id", ids)
    .in("event_type", ["send", "reply"]);
  if (logErr) throw new Error(logErr.message);

  const agg = aggregateOutreachByLeadId((logs ?? []) as LogRow[]);
  return base.map((lead) => {
    const o = agg.get(lead.id) ?? {
      lastSend: null,
      lastReply: null,
      sendCount: 0,
      replyCount: 0,
    };
    return attachOutreachToLead(
      lead,
      o.lastSend,
      o.lastReply,
      o.sendCount,
      o.replyCount
    );
  });
}

export async function insertLeadRow(
  admin: SupabaseClient,
  input: Omit<Lead, "id" | "created_at" | "updated_at">
): Promise<Lead> {
  const row = leadInputToInsert(input);
  const { data, error } = await admin.from("leads").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return leadRowToLead(data as LeadRow);
}

const LEAD_PATCH_MAP: [keyof Lead, string][] = [
  ["company_name", "company_name"],
  ["contact_name", "contact_name"],
  ["email", "email"],
  ["phone", "phone"],
  ["website", "website"],
  ["industry", "industry"],
  ["state", "state"],
  ["city", "city"],
  ["lead_source", "lead_source"],
  ["equipment_type", "equipment_type"],
  ["estimated_value", "estimated_value"],
  ["status", "status"],
  ["notes", "notes"],
  ["tags", "tags"],
  ["company_summary", "company_summary"],
  ["industry_detected", "industry_detected"],
  ["keywords", "keywords"],
  ["target_industry", "target_industry"],
  ["likely_asset_types", "likely_asset_types"],
];

export function leadPatchToColumns(patch: Partial<Lead>): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {};
  for (const [k, col] of LEAD_PATCH_MAP) {
    if (k in patch && patch[k] !== undefined) dbPatch[col] = patch[k];
  }
  return dbPatch;
}

export async function updateLeadRow(
  admin: SupabaseClient,
  id: string,
  patch: Partial<Lead>
): Promise<Lead | "not_found" | "empty_patch"> {
  const dbPatch = leadPatchToColumns(patch);
  if (Object.keys(dbPatch).length === 0) return "empty_patch";
  const { data, error } = await admin
    .from("leads")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return "not_found" as const;
  return leadRowToLead(data as LeadRow);
}

export async function updateLeadsStatusBulk(
  admin: SupabaseClient,
  ids: string[],
  status: LeadStatus
): Promise<number> {
  if (!ids.length) return 0;
  const { data, error } = await admin
    .from("leads")
    .update({ status })
    .in("id", ids)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export async function countSendEventsForLead(
  admin: SupabaseClient,
  leadId: string
): Promise<number> {
  const { count, error } = await admin
    .from("outreach_logs")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("event_type", "send");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function insertManualReplyLog(
  admin: SupabaseClient,
  leadId: string,
  snippet?: string
): Promise<void> {
  const { error } = await admin.from("outreach_logs").insert({
    event_type: "reply",
    provider: "dashboard",
    lead_id: leadId,
    subject: "Marked as replied",
    body_preview: (snippet ?? "Manual reply mark from dashboard").slice(0, 240),
    meta: { source: "dashboard_manual" },
  });
  if (error) throw new Error(error.message);
}

export async function findLeadByEmailCaseInsensitive(
  admin: SupabaseClient,
  email: string
): Promise<{ id: string; status: LeadStatus } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  const { data, error } = await admin
    .from("leads")
    .select("id, status")
    .ilike("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id as string, status: data.status as LeadStatus };
}

export async function outreachLogExistsWithProviderMessageId(
  admin: SupabaseClient,
  providerMessageId: string
): Promise<boolean> {
  const id = providerMessageId.trim();
  if (!id) return false;
  const { data, error } = await admin
    .from("outreach_logs")
    .select("id")
    .eq("provider_message_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Inbound email (e.g. Resend `email.received`): logs reply, optional inbound_replies row, sets status Replied when matched. */
export async function recordInboundReplyFromProvider(
  admin: SupabaseClient,
  args: {
    providerMessageId: string;
    fromEmail: string;
    subject: string | null;
    snippet: string | null;
    toEmails: string[];
    rawPayload: Record<string, unknown>;
  }
): Promise<{ duplicate: boolean; leadId: string | null }> {
  if (await outreachLogExistsWithProviderMessageId(admin, args.providerMessageId)) {
    return { duplicate: true, leadId: null };
  }

  const lead = await findLeadByEmailCaseInsensitive(admin, args.fromEmail);
  const subject = args.subject?.trim() || "(no subject)";
  const preview = (args.snippet ?? "").trim().slice(0, 240);

  const { data: logRow, error: logErr } = await admin
    .from("outreach_logs")
    .insert({
      event_type: "reply",
      provider: "resend",
      provider_message_id: args.providerMessageId,
      from_email: args.fromEmail.trim().toLowerCase(),
      to_email: args.toEmails[0]?.trim().toLowerCase() ?? null,
      subject,
      body_preview: preview || "Inbound reply (webhook)",
      lead_id: lead?.id ?? null,
      meta: {
        source: "resend_webhook",
        event: "email.received",
        to: args.toEmails,
      },
    })
    .select("id")
    .single();
  if (logErr) throw new Error(logErr.message);

  if (lead?.id && logRow?.id) {
    const { error: irErr } = await admin.from("inbound_replies").insert({
      lead_id: lead.id,
      outreach_log_id: logRow.id as string,
      subject,
      snippet: preview || null,
      raw_headers: args.rawPayload,
    });
    if (irErr) {
      // Optional audit row; outreach_logs still records the reply.
    }

    const terminal: LeadStatus[] = ["Deal Won", "Not Interested"];
    if (!terminal.includes(lead.status)) {
      await updateLeadRow(admin, lead.id, { status: "Replied" });
    }
  }

  return { duplicate: false, leadId: lead?.id ?? null };
}

export async function recordDeliveryIssueFromProvider(
  admin: SupabaseClient,
  eventType: "bounce" | "complaint",
  args: {
    providerMessageId: string | null;
    recipientEmail: string;
    detail: Record<string, unknown>;
  }
): Promise<void> {
  const dedupe = (args.providerMessageId ?? "").trim() || JSON.stringify(args.detail).slice(0, 80);
  const dedupeId = `${eventType}:${dedupe}`.slice(0, 200);
  if (await outreachLogExistsWithProviderMessageId(admin, dedupeId)) {
    return;
  }

  const lead = await findLeadByEmailCaseInsensitive(admin, args.recipientEmail);
  await admin.from("outreach_logs").insert({
    event_type: eventType,
    provider: "resend",
    provider_message_id: dedupeId,
    to_email: args.recipientEmail.trim().toLowerCase(),
    lead_id: lead?.id ?? null,
    subject: eventType === "bounce" ? "Email bounced" : "Spam complaint",
    body_preview: (JSON.stringify(args.detail) ?? "").slice(0, 240),
    meta: { source: "resend_webhook", ...args.detail },
  });
}
