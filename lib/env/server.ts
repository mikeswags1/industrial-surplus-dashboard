/**
 * Server-only environment parsing and validation.
 * Never import from client components.
 */
import { z } from "zod";

const supabaseServerSchema = z.object({
  url: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  serviceRoleKey: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for server data access"),
});

const resendSchema = z.object({
  apiKey: z.string().min(1),
  from: z.string().min(3),
});

const googlePlacesSchema = z.object({
  apiKey: z.string().min(1),
});

export type SupabaseServerConfig = z.infer<typeof supabaseServerSchema>;

export function parseSupabaseServerEnv():
  | { ok: true; value: SupabaseServerConfig }
  | { ok: false; issues: string[] } {
  const raw = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  };
  const result = supabaseServerSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  return { ok: true, value: result.data };
}

/** Legacy helper — returns config or null (no throw). */
export function getSupabaseServerConfig(): {
  url: string;
  serviceRoleKey: string;
} | null {
  const p = parseSupabaseServerEnv();
  return p.ok ? p.value : null;
}

export function isSupabaseServerConfigured(): boolean {
  return parseSupabaseServerEnv().ok;
}

export function parseResendEnv():
  | { ok: true; value: z.infer<typeof resendSchema> }
  | { ok: false; issues: string[] } {
  const raw = {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    from: process.env.RESEND_FROM_EMAIL?.trim(),
  };
  const r = resendSchema.safeParse(raw);
  if (!r.success) {
    return {
      ok: false,
      issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  return { ok: true, value: r.data };
}

export function getResendConfig(): { apiKey: string; from: string } | null {
  const p = parseResendEnv();
  return p.ok ? p.value : null;
}

export function getGooglePlacesConfig(): { apiKey: string } | null {
  const raw = { apiKey: process.env.GOOGLE_PLACES_API_KEY?.trim() };
  const r = googlePlacesSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Svix signing secret from Resend → Webhooks → your endpoint (verifies inbound/bounce events). */
export function getResendWebhookSecret(): string | null {
  const s = process.env.RESEND_WEBHOOK_SECRET?.trim();
  return s ? s : null;
}

/** Safe diagnostics for /api/health — no secrets returned. */
export function getServerHealthSnapshot(): {
  supabase: "ok" | "missing";
  resend: "ok" | "missing";
  openai: "ok" | "missing";
  googlePlaces: "ok" | "missing";
  issues: string[];
} {
  const issues: string[] = [];
  const sb = parseSupabaseServerEnv();
  if (!sb.ok) issues.push(...sb.issues.map((i) => `supabase: ${i}`));
  const rs = parseResendEnv();
  if (!rs.ok) issues.push(...rs.issues.map((i) => `resend: ${i}`));

  return {
    supabase: sb.ok ? "ok" : "missing",
    resend: rs.ok ? "ok" : "missing",
    openai: isOpenAiConfigured() ? "ok" : "missing",
    googlePlaces: getGooglePlacesConfig() ? "ok" : "missing",
    issues,
  };
}
