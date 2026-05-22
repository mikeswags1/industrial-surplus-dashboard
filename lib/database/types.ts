/**
 * Typed rows aligned with Supabase public schema.
 * Keep in sync with supabase/schema.sql and migrations.
 */

export type OrganizationRow = {
  id: string;
  name: string;
  created_at: string;
};

/** Supabase Auth user profile extension (users for the app). */
export type ProfileRow = {
  id: string;
  organization_id: string;
  display_name: string | null;
  created_at: string;
};

export type LeadRow = {
  id: string;
  organization_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  state: string | null;
  city: string | null;
  lead_source: string | null;
  equipment_type: string | null;
  estimated_value: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
  company_summary: string | null;
  industry_detected: string | null;
  keywords: string[] | null;
  enrichment_at: string | null;
  target_industry?: string | null;
  likely_asset_types?: string[] | null;
};

export type LeadFinderRunRow = {
  id: string;
  organization_id: string;
  provider: "google_places";
  status: "running" | "completed" | "failed";
  state: string;
  city: string;
  industry: string;
  equipment_type: string;
  requested_count: number;
  /** Google Places Text Search (New) calls for this run (null on rows created before rollout). */
  places_text_search_calls: number | null;
  result_count: number;
  approved_count: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type LeadFinderCandidateRow = {
  id: string;
  organization_id: string;
  run_id: string;
  provider: "google_places";
  provider_place_id: string | null;
  company_name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  formatted_address: string | null;
  industry: string | null;
  source_url: string | null;
  raw_provider: Record<string, unknown>;
  enrichment_summary: string | null;
  enrichment_source_url: string | null;
  keywords: string[] | null;
  score: number | null;
  score_source: "ai" | "heuristic" | "unscored";
  score_explanation: string | null;
  target_industry: string | null;
  asset_likelihood_score: number | null;
  likely_asset_types: string[] | null;
  outreach_angle: string | null;
  reason_selected: string | null;
  status: "preview" | "approved" | "rejected" | "duplicate" | "error";
  lead_id: string | null;
  created_at: string;
};

export type CampaignRow = {
  id: string;
  organization_id: string | null;
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

export type OutreachLogRow = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  campaign_id: string | null;
  event_type: string;
  provider: string;
  provider_message_id: string | null;
  to_email: string | null;
  from_email: string | null;
  subject: string | null;
  body_preview: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type InboxRow = {
  id: string;
  organization_id: string;
  display_name: string;
  domain: string;
  from_email: string;
  reply_to_email: string | null;
  resend_domain_id: string | null;
  status: string;
  is_default: boolean;
  created_at: string;
};

export type LeadNoteRow = {
  id: string;
  organization_id: string;
  lead_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  campaign_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProjectSignalLeadRow = {
  id: string;
  organization_id: string;
  project_name: string;
  project_type: string;
  source_type:
    | "manual"
    | "csv_import"
    | "demo"
    | "construction_permit"
    | "planning_board"
    | "zoning"
    | "news"
    | "contractor_page"
    | "utility_filing"
    | "job_post"
    | "company_announcement";
  location: string | null;
  state: string | null;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  source_url: string | null;
  project_status: string;
  estimated_value: number | null;
  estimated_start_date: string | null;
  estimated_completion_date: string | null;
  equipment_opportunity: string | null;
  confidence_score: number;
  lead_score: number;
  reason_flagged: string | null;
  notes: string | null;
  lead_status: "New" | "Contacted" | "Interested" | "Follow Up Later" | "Not Interested";
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};
