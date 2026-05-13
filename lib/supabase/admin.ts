import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/env/server";

let _admin: SupabaseClient | null | undefined;

/** Service-role client — server routes only. Bypasses RLS. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_admin !== undefined) return _admin;
  const cfg = getSupabaseServerConfig();
  if (!cfg) {
    _admin = null;
    return _admin;
  }
  _admin = createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
