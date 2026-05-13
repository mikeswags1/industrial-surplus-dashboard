import type { Campaign, CampaignStatus } from "@/lib/types";

export type CampaignRow = {
  id: string;
  name: string;
  equipment_type: string;
  region: string;
  primary_subject: string;
  primary_body: string;
  follow_up_1: string | null;
  follow_up_2: string | null;
  status: string;
  emails_sent: number;
  replies_count: number;
  interested_count: number;
  created_at: string;
  updated_at: string;
};

const STATUSES: CampaignStatus[] = ["draft", "active", "paused", "completed"];

function coerceCampaignStatus(s: string): CampaignStatus {
  return (STATUSES as readonly string[]).includes(s) ? (s as CampaignStatus) : "draft";
}

export function campaignRowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    equipment_type: row.equipment_type,
    region: row.region,
    primary_subject: row.primary_subject,
    primary_body: row.primary_body,
    follow_up_1: row.follow_up_1 ?? "",
    follow_up_2: row.follow_up_2 ?? "",
    status: coerceCampaignStatus(row.status),
    emails_sent: row.emails_sent,
    replies_count: row.replies_count,
    interested_count: row.interested_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function campaignInputToInsert(
  input: Omit<Campaign, "id" | "created_at" | "updated_at">
) {
  return {
    name: input.name,
    equipment_type: input.equipment_type,
    region: input.region,
    primary_subject: input.primary_subject,
    primary_body: input.primary_body,
    follow_up_1: input.follow_up_1 || null,
    follow_up_2: input.follow_up_2 || null,
    status: input.status,
    emails_sent: input.emails_sent,
    replies_count: input.replies_count,
    interested_count: input.interested_count,
  };
}
