export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const EQUIPMENT_TYPES = [
  "Forklifts",
  "Electrical equipment",
  "Circuit breakers",
  "Valves",
  "Machinery",
  "Scrap metal",
  "Warehouse inventory",
  "Plant closure assets",
  "Liquidation inventory",
  "Mixed / other",
] as const;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Quote Needed",
  "Deal Won",
  "Not Interested",
  "Follow Up Later",
] as const;

export const AD_ANGLE_PRESETS = [
  "We buy industrial surplus",
  "Sell unused warehouse equipment",
  "Cash for forklifts",
  "We buy electrical equipment",
  "Plant closing? We buy assets",
  "Nationwide pickup available",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
export type AdAnglePreset = (typeof AD_ANGLE_PRESETS)[number];
export type USState = (typeof US_STATES)[number];

export type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  state: string;
  city: string;
  lead_source: string;
  equipment_type: string;
  estimated_value: number | null;
  status: LeadStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  /** Derived / manual tags (e.g. import batch, equipment family) */
  tags?: string[];
  company_summary?: string | null;
  industry_detected?: string | null;
  keywords?: string[];
  organization_id?: string | null;
  /** From Lead Finder when added via approval */
  target_industry?: string | null;
  likely_asset_types?: string[];
  /** Enriched by GET /api/leads from `outreach_logs` */
  last_email_sent_at?: string | null;
  email_send_count?: number;
  email_status_label?: string;
};

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type Campaign = {
  id: string;
  organization_id?: string | null;
  name: string;
  equipment_type: string;
  region: string;
  primary_subject: string;
  primary_body: string;
  follow_up_1: string;
  follow_up_2: string;
  status: CampaignStatus;
  emails_sent: number;
  replies_count: number;
  interested_count: number;
  created_at: string;
  updated_at: string;
};

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
