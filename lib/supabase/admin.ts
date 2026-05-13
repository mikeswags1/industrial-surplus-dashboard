import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseSupabaseServerEnv } from "@/lib/env/server";

let _admin: SupabaseClient | undefined;

/** Service-role client — server routes only. Bypasses RLS. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const p = parseSupabaseServerEnv();
  if (!p.ok) {
    _admin = undefined;
    return null;
  }
  if (!_admin) {
    _admin = createClient(p.value.url, p.value.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const c = getSupabaseAdmin();
  if (!c) {
    const p = parseSupabaseServerEnv();
    const detail = p.ok ? "unknown" : p.issues.join("; ");
    throw new Error(`DATABASE_NOT_CONFIGURED: ${detail}`);
  }
  return c;
}

export function resetSupabaseAdminCache(): void {
  _admin = undefined;
}
