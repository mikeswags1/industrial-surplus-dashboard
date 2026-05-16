import type { Lead } from "@/lib/types";

/** At or above this count, one email must fit everyone → generic broadcast tone. */
export const BROADCAST_RECIPIENT_THRESHOLD = 10;

export type BatchSpecificityMode =
  | "single_recipient"
  | "broadcast"
  | "shared_niche"
  | "mixed_small";

export type BatchGenerationInputs = {
  recipient_count: number;
  specificity_mode: BatchSpecificityMode;
  industry: string;
  equipment_type: string;
  state?: string;
  company_name?: string;
  pain_point: string;
  selection_notes?: string;
};

function modePick(values: string[]): string | undefined {
  const trimmed = values.map((v) => v.trim()).filter(Boolean);
  if (!trimmed.length) return undefined;
  const counts = new Map<string, number>();
  for (const v of trimmed) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = trimmed[0];
  let max = 0;
  for (const [k, n] of counts) {
    if (n > max) {
      max = n;
      best = k;
    }
  }
  return best;
}

/** Turn selected leads into generate-email API fields + specificity mode. */
export function deriveBatchGenerationInputs(
  selectedLeads: Lead[],
  fallbackPainPoint: string
): BatchGenerationInputs | null {
  if (!selectedLeads.length) return null;

  const n = selectedLeads.length;
  const seed = selectedLeads[0];

  const industries = selectedLeads.map((l) =>
    (l.target_industry ?? l.industry ?? "").trim()
  );
  const equipments = selectedLeads.map((l) => (l.equipment_type ?? "").trim());
  const states = selectedLeads.map((l) => (l.state ?? "").trim());
  const uniqEquip = new Set(equipments.filter(Boolean));
  const uniqStates = new Set(states.filter(Boolean));

  let specificity_mode: BatchSpecificityMode;
  if (n === 1) {
    specificity_mode = "single_recipient";
  } else if (n >= BROADCAST_RECIPIENT_THRESHOLD) {
    specificity_mode = "broadcast";
  } else if (uniqEquip.size <= 1 && uniqStates.size <= 1) {
    specificity_mode = "shared_niche";
  } else {
    specificity_mode = "mixed_small";
  }

  const industry =
    modePick(industries) ||
    seed.target_industry?.trim() ||
    seed.industry?.trim() ||
    "Industrial services";

  let equipment_type: string;
  if (uniqEquip.size === 0) {
    equipment_type = seed.equipment_type || "Industrial equipment";
  } else if (uniqEquip.size === 1) {
    equipment_type = [...uniqEquip][0];
  } else if (specificity_mode === "broadcast" && uniqEquip.size > 2) {
    equipment_type = "Industrial surplus equipment (mixed categories)";
  } else {
    equipment_type = modePick(equipments) || seed.equipment_type || "Industrial equipment";
  }

  let state: string | undefined =
    uniqStates.size === 1 ? [...uniqStates][0] : undefined;

  if (specificity_mode === "broadcast" && uniqStates.size > 1) {
    state = undefined;
  }

  const company_name =
    specificity_mode === "single_recipient" ? seed.company_name?.trim() || undefined : undefined;

  let selection_notes: string | undefined;
  if (specificity_mode === "broadcast") {
    selection_notes = `${n} recipients — varied mix (${uniqEquip.size} equipment categories, ${uniqStates.size} states).`;
  } else if (specificity_mode === "shared_niche") {
    selection_notes = `${n} recipients — same equipment focus${state ? ` and ${state}` : ""}.`;
  } else if (specificity_mode === "mixed_small") {
    selection_notes = `${n} recipients — similar batch but equipment or geography differs across rows.`;
  }

  return {
    recipient_count: n,
    specificity_mode,
    industry,
    equipment_type,
    state,
    company_name,
    pain_point: fallbackPainPoint,
    selection_notes,
  };
}
