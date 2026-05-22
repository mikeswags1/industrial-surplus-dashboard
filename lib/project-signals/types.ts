import type {
  ProjectSignalLeadStatus,
  ProjectSignalProjectStatus,
  ProjectSignalSourceType,
  ProjectSignalType,
} from "@/lib/project-signals/constants";

export type ProjectSignalLead = {
  id: string;
  organization_id: string;
  project_name: string;
  project_type: ProjectSignalType | string;
  source_type: ProjectSignalSourceType;
  location: string;
  state: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  website: string;
  source_url: string;
  project_status: ProjectSignalProjectStatus | string;
  estimated_value: number | null;
  estimated_start_date: string | null;
  estimated_completion_date: string | null;
  equipment_opportunity: string;
  confidence_score: number;
  lead_score: number;
  reason_flagged: string;
  notes: string;
  lead_status: ProjectSignalLeadStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectSignalLeadInput = Omit<
  ProjectSignalLead,
  "id" | "organization_id" | "confidence_score" | "lead_score" | "reason_flagged" | "created_at" | "updated_at"
> & {
  confidence_score?: number;
  lead_score?: number;
  reason_flagged?: string;
};

export type ProjectSignalListFilters = {
  state?: string;
  project_type?: string;
  source_type?: string;
  lead_status?: string;
  min_confidence?: number;
  min_lead_score?: number;
  created_from?: string;
  created_to?: string;
  q?: string;
};

export type ProjectSignalScores = {
  confidence_score: number;
  lead_score: number;
  reason_flagged: string;
};
