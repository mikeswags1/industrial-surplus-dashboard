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
