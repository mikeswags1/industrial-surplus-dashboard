import { Resend } from "resend";
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
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getResendConfig();
  if (!cfg) return { ok: false, error: "Resend not configured (RESEND_API_KEY, RESEND_FROM_EMAIL)" };

  const resend = new Resend(cfg.apiKey);
  const from = input.from?.trim() || cfg.from;
  const replyTo = input.replyTo?.trim();

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? null };
}
