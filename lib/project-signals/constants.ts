/** Project types that indicate surplus / removal opportunities. */
export const PROJECT_SIGNAL_TYPES = [
  "Data center construction",
  "AI / cloud / hyperscale campus",
  "Electrical contractor project",
  "Utility upgrade",
  "Plant closure",
  "Factory shutdown",
  "Facility expansion",
  "Demolition project",
  "Industrial relocation",
  "Equipment replacement",
  "Manufacturing expansion",
] as const;

export type ProjectSignalType = (typeof PROJECT_SIGNAL_TYPES)[number];

/** Where the signal came from — automated feeds use the non-manual values later. */
export const PROJECT_SIGNAL_SOURCE_TYPES = [
  "manual",
  "csv_import",
  "demo",
  "construction_permit",
  "planning_board",
  "zoning",
  "news",
  "contractor_page",
  "utility_filing",
  "job_post",
  "company_announcement",
] as const;

export type ProjectSignalSourceType = (typeof PROJECT_SIGNAL_SOURCE_TYPES)[number];

export const PROJECT_SIGNAL_SOURCE_LABELS: Record<ProjectSignalSourceType, string> = {
  manual: "Manual entry",
  csv_import: "CSV import",
  demo: "Demo / sample",
  construction_permit: "Construction permit",
  planning_board: "Planning board agenda",
  zoning: "Zoning application",
  news: "News article",
  contractor_page: "Contractor project page",
  utility_filing: "Utility filing",
  job_post: "Job posting",
  company_announcement: "Company announcement",
};

/** Construction / project lifecycle (not CRM lead status). */
export const PROJECT_SIGNAL_PROJECT_STATUSES = [
  "Planned",
  "Permitted",
  "Under construction",
  "Near completion",
  "Completed",
  "Shutdown announced",
  "Unknown",
] as const;

export type ProjectSignalProjectStatus = (typeof PROJECT_SIGNAL_PROJECT_STATUSES)[number];

export const PROJECT_SIGNAL_LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Follow Up Later",
  "Not Interested",
] as const;

export type ProjectSignalLeadStatus = (typeof PROJECT_SIGNAL_LEAD_STATUSES)[number];

/** Common equipment families Jake chases on project signals. */
export const PROJECT_SIGNAL_EQUIPMENT_HINTS = [
  "Switchgear",
  "Transformers",
  "MCCs",
  "Breakers",
  "Wire & cable",
  "Generators",
  "Electrical equipment",
  "Industrial machinery",
  "Scrap metal",
  "Asset removal",
] as const;
