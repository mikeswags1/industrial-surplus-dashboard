/**
 * Preset searches for Select Surplus LLC (buy/remove/recycle)—target companies likely to
 * OWN or accumulate industrial assets (potential sellers), not surplus resellers/competitors.
 */
export type LeadFinderTargetIndustryPreset = {
  label: string;
  /** Phrase fed to Google Places Text Search (paired with city + state in code). */
  placesQueryPhrase: string;
};

export const LEAD_FINDER_TARGET_INDUSTRIES = [
  { label: "Electrical Contractors", placesQueryPhrase: "electrical contractors" },
  { label: "Energy Services", placesQueryPhrase: "energy services companies" },
  { label: "Construction Companies", placesQueryPhrase: "construction companies" },
  { label: "Well Drilling Contractors", placesQueryPhrase: "well drilling contractors" },
  { label: "Solar Contractors", placesQueryPhrase: "solar contractors" },
  { label: "Power Plants", placesQueryPhrase: "power plants" },
  { label: "Power Companies", placesQueryPhrase: "power companies utility" },
  { label: "Electronic Manufacturing", placesQueryPhrase: "electronic manufacturing companies" },
  { label: "Crane Services", placesQueryPhrase: "crane services" },
  { label: "Oilfield Equipment Suppliers", placesQueryPhrase: "oilfield equipment suppliers" },
  { label: "Machine & Tool Manufacturing", placesQueryPhrase: "machine tool manufacturing companies" },
  { label: "Demolition Contractors", placesQueryPhrase: "demolition contractors" },
  { label: "Large Manufacturing Plants", placesQueryPhrase: "manufacturing plants industrial" },
  { label: "Chemical Plants", placesQueryPhrase: "chemical plants" },
  { label: "Automotive Manufacturing Plants", placesQueryPhrase: "automotive manufacturing plants" },
  { label: "Natural Gas Plants", placesQueryPhrase: "natural gas plants" },
  { label: "Plumbing & Heating Contractors", placesQueryPhrase: "commercial plumbing heating contractors industrial" },
  { label: "Mechanical Contractors", placesQueryPhrase: "mechanical contractors industrial commercial" },
] as const satisfies readonly LeadFinderTargetIndustryPreset[];

export const LEAD_FINDER_TARGET_INDUSTRY_LABELS = new Set<string>(
  LEAD_FINDER_TARGET_INDUSTRIES.map((p) => p.label)
);

/** Old UI/API labels mapped to current presets */
export const LEAD_FINDER_TARGET_INDUSTRY_LEGACY_ALIASES: Record<string, string> = {
  "Electronic Manufacturing Companies": "Electronic Manufacturing",
  "Machine and Tool Manufacturers": "Machine & Tool Manufacturing",
};

export function presetForTargetIndustryLabel(
  label: string
): LeadFinderTargetIndustryPreset | undefined {
  return LEAD_FINDER_TARGET_INDUSTRIES.find((p) => p.label === label.trim());
}
