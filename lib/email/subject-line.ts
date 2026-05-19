import type { BatchSpecificityMode } from "@/lib/email/batch-email-generation";
import { LEAD_FINDER_TARGET_INDUSTRIES } from "@/lib/lead-finder/target-industries";

const GENERIC_EQUIPMENT = new Set([
  "mixed / other",
  "mixed/other",
  "industrial equipment",
  "surplus equipment",
  "industrial surplus equipment (mixed categories)",
]);

/** Exact preset labels → subject focus (matches Lead Finder / CRM target_industry). */
const PRESET_INDUSTRY_SUBJECT: Record<string, string> = Object.fromEntries(
  LEAD_FINDER_TARGET_INDUSTRIES.map((p) => {
    const label = p.label;
    let phrase: string;
    switch (label) {
      case "Electrical Contractors":
        phrase = "surplus electrical gear";
        break;
      case "Energy Services":
        phrase = "energy-services surplus";
        break;
      case "Construction Companies":
        phrase = "construction surplus equipment";
        break;
      case "Well Drilling Contractors":
        phrase = "drilling surplus equipment";
        break;
      case "Solar Contractors":
        phrase = "solar contractor surplus";
        break;
      case "Power Plants":
        phrase = "power plant surplus";
        break;
      case "Power Companies":
        phrase = "utility surplus equipment";
        break;
      case "Electronic Manufacturing":
        phrase = "electronics manufacturing surplus";
        break;
      case "Crane Services":
        phrase = "crane & rigging surplus";
        break;
      case "Oilfield Equipment Suppliers":
        phrase = "oilfield surplus equipment";
        break;
      case "Machine & Tool Manufacturing":
        phrase = "machine shop surplus";
        break;
      case "Demolition Contractors":
        phrase = "demolition surplus";
        break;
      case "Large Manufacturing Plants":
        phrase = "plant surplus equipment";
        break;
      case "Chemical Plants":
        phrase = "chemical plant surplus";
        break;
      case "Automotive Manufacturing Plants":
        phrase = "automotive plant surplus";
        break;
      case "Natural Gas Plants":
        phrase = "natural gas plant surplus";
        break;
      case "Plumbing & Heating Contractors":
        phrase = "commercial MEP surplus";
        break;
      case "Mechanical Contractors":
        phrase = "mechanical contractor surplus";
        break;
      default:
        phrase = "industrial surplus";
    }
    return [label, phrase];
  })
);

export type EmailSubjectContext = {
  equipment_type?: string;
  industry?: string;
  state?: string;
  specificity_mode: BatchSpecificityMode;
};

export function isGenericEquipmentLabel(equipment: string): boolean {
  const n = equipment.trim().toLowerCase();
  if (!n) return true;
  if (GENERIC_EQUIPMENT.has(n)) return true;
  return n.startsWith("mixed");
}

function looksLikeCompanyName(text: string): boolean {
  const t = text.trim();
  if (t.length > 55) return true;
  return /\b(LLC|L\.L\.C\.|Inc\.?|Corp\.?|Co\.|Company)\b/i.test(t);
}

/** Short phrase for the subject line (no state, no "Quick question"). */
function subjectFocusPhrase(ctx: EmailSubjectContext): string {
  const industry = (ctx.industry || "").trim();
  const equipment = (ctx.equipment_type || "").trim();

  const fromIndustry = industrySubjectPhrase(industry);
  const fromEquipment = isGenericEquipmentLabel(equipment)
    ? null
    : equipmentSubjectPhrase(equipment);

  if (ctx.specificity_mode === "broadcast") {
    return ctx.state?.trim() ? "surplus equipment" : "surplus equipment clearing";
  }

  if (ctx.specificity_mode === "mixed_small") {
    return "surplus industrial gear";
  }

  // single_recipient or shared_niche: prefer concrete equipment, else industry
  if (fromEquipment) return fromEquipment;
  if (fromIndustry) return fromIndustry;
  return "surplus industrial equipment";
}

function industrySubjectPhrase(industry: string): string | null {
  const raw = industry.trim();
  if (!raw || looksLikeCompanyName(raw)) return null;

  const preset = PRESET_INDUSTRY_SUBJECT[raw];
  if (preset) return preset;

  const low = raw.toLowerCase();
  if (low === "your industry" || low === "industrial services" || low === "unknown") return null;

  // Common Google primary types / short labels on leads
  if (low === "electrician" || low.includes("electrical contractor")) return "surplus electrical gear";
  if (low.includes("electrical")) return "surplus electrical gear";
  if (low.includes("power plant") || low === "power plants") return "power plant surplus";
  if (low.includes("power compan") || low.includes("utility")) return "utility surplus equipment";
  if (low.includes("manufacturing") || low === "manufacturer") return "manufacturing surplus";
  if (low.includes("warehouse") || low.includes("logistics")) return "warehouse surplus";
  if (low.includes("scrap") || low.includes("metal")) return "scrap & surplus metal";
  if (low.includes("oilfield")) return "oilfield surplus equipment";
  if (low.includes("crane")) return "crane & rigging surplus";
  if (low.includes("construction")) return "construction surplus equipment";
  if (low.includes("demolition")) return "demolition surplus";
  if (low.includes("solar")) return "solar contractor surplus";
  if (low.includes("plumbing") || low.includes("mechanical") || low.includes("hvac"))
    return "commercial MEP surplus";
  if (low.includes("drilling")) return "drilling surplus equipment";

  const shortened = raw
    .replace(/\b(inc|llc|l\.l\.c\.|corp|co)\b\.?/gi, "")
    .replace(/\b(contractors?|services?|company|companies|suppliers?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!shortened || shortened.length > 36) return "industrial surplus";
  return `surplus ${shortened.toLowerCase()}`;
}

function equipmentSubjectPhrase(equipment: string): string | null {
  const e = equipment.trim();
  if (!e || isGenericEquipmentLabel(e)) return null;
  const low = e.toLowerCase();

  if (low === "forklifts") return "surplus forklifts";
  if (low === "scrap metal") return "scrap & surplus metal";
  if (low === "circuit breakers") return "surplus breakers & panels";
  if (low === "electrical equipment") return "surplus electrical gear";
  if (low === "valves") return "surplus valves & pipe";
  if (low === "machinery") return "surplus machinery";
  if (low === "warehouse inventory") return "warehouse surplus";
  if (low === "plant closure assets") return "plant closure surplus";
  if (low === "liquidation inventory") return "liquidation surplus";

  return `surplus ${low}`;
}

/** Human-readable cold-email subject (under ~72 chars when possible). */
export function buildEmailSubject(ctx: EmailSubjectContext): string {
  const state = ctx.state?.trim();
  const stateSuffix = state ? ` (${state})` : "";
  const focus = subjectFocusPhrase(ctx);
  return `Quick question — ${focus}${stateSuffix}`;
}

const AWKWARD_SUBJECT =
  /mixed\s*\/?\s*other|unused\s+mixed|surplus\s+surplus|\?\?\?|!!!|fast cash|guaranteed|liquidation inventory|plant closure assets/i;

/** If AI or legacy template produced a bad subject, replace with a sane one. */
export function normalizeEmailSubject(
  subject: string | undefined | null,
  ctx: EmailSubjectContext
): string {
  const trimmed = (subject || "").trim();
  if (!trimmed || AWKWARD_SUBJECT.test(trimmed)) {
    return buildEmailSubject(ctx);
  }
  if (/unused\s+/i.test(trimmed) && isGenericEquipmentLabel(ctx.equipment_type || "")) {
    return buildEmailSubject(ctx);
  }
  // Reject subjects that echo raw CRM equipment enum verbatim
  const equip = (ctx.equipment_type || "").trim();
  if (equip && !isGenericEquipmentLabel(equip) && trimmed.toLowerCase().includes(equip.toLowerCase())) {
    const rebuilt = buildEmailSubject(ctx);
    if (rebuilt !== trimmed) return rebuilt;
  }
  return trimmed;
}
