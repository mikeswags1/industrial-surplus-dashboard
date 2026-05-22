import { Resend } from "resend";
import { normalizeResendFromHeader } from "@/lib/email/normalize-resend-from";
import { getResendConfig } from "@/lib/env/server";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** When set, overrides `RESEND_FROM_EMAIL` (must be a verified sender / domain in Resend). */
  from?: string;
  /** Optional Reply-To header (verified address recommended). */
  replyTo?: string | null;
  /** Provider headers such as List-Unsubscribe. */
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getResendConfig();
  if (!cfg)
    return { ok: false, error: "RESEND_API_KEY is not configured — cannot send mail." };

  const fromRaw = input.from?.trim() || cfg.from?.trim();
  if (!fromRaw) {
    return {
      ok: false,
      error:
        "Missing From address: set RESEND_FROM_EMAIL or save Outbound sender in Settings (inboxes table).",
    };
  }

  const normFrom = normalizeResendFromHeader(fromRaw);
  if (!normFrom.ok) {
    return { ok: false, error: normFrom.reason };
  }

  const resend = new Resend(cfg.apiKey);
  const replyTo = input.replyTo?.trim();

  const { data, error } = await resend.emails.send({
    from: normFrom.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? null };
}
