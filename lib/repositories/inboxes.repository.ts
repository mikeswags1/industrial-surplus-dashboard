import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeResendFromHeader } from "@/lib/email/normalize-resend-from";
import { getResendConfig } from "@/lib/env/server";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/default-org";
import type { InboxRow } from "@/lib/database/types";

function inferDomain(fromEmail: string): string {
  const m = fromEmail.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z][a-zA-Z0-9.-]*)/);
  return m?.[1] ?? "unknown";
}

/**
 * Resend "from" for an organization: active `inboxes` row (prefer default), else `RESEND_FROM_EMAIL`.
 */
export async function resolveOutboundIdentity(
  admin: SupabaseClient,
  organizationId: string | null | undefined
): Promise<{ from: string; replyTo: string | null }> {
  const cfg = getResendConfig();
  if (!cfg) {
    throw new Error("RESEND_API_KEY is not set — add it in Vercel / .env to send mail.");
  }

  const orgId = organizationId ?? DEFAULT_ORGANIZATION_ID;
  const { data, error } = await admin
    .from("inboxes")
    .select("from_email, reply_to_email")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as Pick<InboxRow, "from_email" | "reply_to_email"> | null;
  const inboxFrom = row?.from_email?.trim();
  if (inboxFrom) {
    const norm = normalizeResendFromHeader(inboxFrom);
    if (!norm.ok) {
      throw new Error(
        `${norm.reason} Update it under Settings → Outbound sender.`
      );
    }
    return {
      from: norm.from,
      replyTo: row?.reply_to_email?.trim() || null,
    };
  }

  const fallback = cfg.from?.trim();
  if (!fallback) {
    throw new Error(
      "No sender address: save one under Settings → Outbound sender, or set RESEND_FROM_EMAIL in your environment."
    );
  }
  const norm = normalizeResendFromHeader(fallback);
  if (!norm.ok) {
    throw new Error(`${norm.reason} Check RESEND_FROM_EMAIL in Vercel.`);
  }
  return { from: norm.from, replyTo: null };
}

export async function listInboxesForOrganization(
  admin: SupabaseClient,
  organizationId: string = DEFAULT_ORGANIZATION_ID
): Promise<InboxRow[]> {
  const { data, error } = await admin
    .from("inboxes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as InboxRow[];
}

export async function upsertDefaultInbox(
  admin: SupabaseClient,
  params: {
    organizationId?: string;
    displayName: string;
    fromEmail: string;
    replyToEmail?: string | null;
    domain?: string | null;
  }
): Promise<InboxRow> {
  const orgId = params.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const fromEmail = params.fromEmail.trim();
  if (!fromEmail) throw new Error("fromEmail required");

  const domain = (params.domain?.trim() || inferDomain(fromEmail)).toLowerCase();
  const displayName = params.displayName.trim() || domain;

  const { data: existing, error: findErr } = await admin
    .from("inboxes")
    .select("id")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  const patch = {
    display_name: displayName,
    domain,
    from_email: fromEmail,
    reply_to_email: params.replyToEmail?.trim() || null,
    status: "active",
    is_default: true,
  };

  if (existing?.id) {
    const { data: updated, error: upErr } = await admin
      .from("inboxes")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated as InboxRow;
  }

  const { data: inserted, error: insErr } = await admin
    .from("inboxes")
    .insert({
      organization_id: orgId,
      ...patch,
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);
  return inserted as InboxRow;
}
