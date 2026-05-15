import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import {
  listInboxesForOrganization,
  upsertDefaultInbox,
} from "@/lib/repositories/inboxes.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/default-org";
import { isBlockedResendFromDomain } from "@/lib/email/resend-from-validation";
import { normalizeResendFromHeader } from "@/lib/email/normalize-resend-from";

/** List sending identities for the default workspace (multi-org: extend with query param later). */
export async function GET() {
  try {
    const admin = requireSupabaseAdmin();
    const inboxes = await listInboxesForOrganization(admin, DEFAULT_ORGANIZATION_ID);
    return NextResponse.json({ inboxes });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "Failed to load inboxes";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type PutBody = {
  displayName?: string;
  fromEmail?: string;
  replyToEmail?: string | null;
  domain?: string | null;
};

/** Create or update the default active inbox (Resend "from" identity for this workspace). */
export async function PUT(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    let body: PutBody;
    try {
      body = (await request.json()) as PutBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const fromEmail = body.fromEmail?.trim();
    if (!fromEmail) {
      return NextResponse.json(
        {
          error:
            "fromEmail is required. Use Resend’s format, e.g. Acme Sales <team@clientdomain.com>",
        },
        { status: 400 }
      );
    }

    const norm = normalizeResendFromHeader(fromEmail);
    if (!norm.ok) {
      return NextResponse.json({ error: norm.reason }, { status: 400 });
    }

    if (isBlockedResendFromDomain(norm.from)) {
      return NextResponse.json(
        {
          error:
            "Resend cannot send “from” consumer addresses like @gmail.com. Add a domain you control in Resend, set From to e.g. “Jake Mitchell <jake@yourdomain.com>”. You can still put Gmail (or any inbox) in Reply-To for where you read mail.",
        },
        { status: 400 }
      );
    }

    const inbox = await upsertDefaultInbox(admin, {
      displayName: body.displayName?.trim() || "Outbound",
      fromEmail: norm.from,
      replyToEmail: body.replyToEmail ?? null,
      domain: body.domain ?? null,
    });

    return NextResponse.json({ inbox });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "Failed to save inbox";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
