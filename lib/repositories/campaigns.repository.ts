import type { SupabaseClient } from "@supabase/supabase-js";
import {
  campaignInputToInsert,
  campaignRowToCampaign,
  type CampaignRow,
} from "@/lib/db/campaign-mappers";
import type { Campaign } from "@/lib/types";

export async function fetchCampaigns(admin: SupabaseClient): Promise<Campaign[]> {
  const { data, error } = await admin
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => campaignRowToCampaign(r as CampaignRow));
}

export async function insertCampaignRow(
  admin: SupabaseClient,
  input: Omit<Campaign, "id" | "created_at" | "updated_at">
): Promise<Campaign> {
  const row = campaignInputToInsert(input);
  const { data, error } = await admin
    .from("campaigns")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return campaignRowToCampaign(data as CampaignRow);
}

const CAMPAIGN_PATCH_KEYS: (keyof Campaign)[] = [
  "name",
  "equipment_type",
  "region",
  "primary_subject",
  "primary_body",
  "follow_up_1",
  "follow_up_2",
  "status",
  "emails_sent",
  "replies_count",
  "interested_count",
];

export async function updateCampaignRow(
  admin: SupabaseClient,
  id: string,
  patch: Partial<Campaign>
): Promise<Campaign | "not_found" | "empty_patch"> {
  const dbPatch: Record<string, unknown> = {};
  for (const k of CAMPAIGN_PATCH_KEYS) {
    if (k in patch && patch[k] !== undefined) dbPatch[k as string] = patch[k];
  }
  if (Object.keys(dbPatch).length === 0) return "empty_patch";
  const { data, error } = await admin
    .from("campaigns")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return "not_found";
  return campaignRowToCampaign(data as CampaignRow);
}
