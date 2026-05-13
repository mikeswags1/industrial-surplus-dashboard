import { Resend } from "resend";
import { getResendConfig } from "@/lib/env/server";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getResendConfig();
  if (!cfg) return { ok: false, error: "Resend not configured (RESEND_API_KEY, RESEND_FROM_EMAIL)" };

  const resend = new Resend(cfg.apiKey);
  const { data, error } = await resend.emails.send({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? null };
}
