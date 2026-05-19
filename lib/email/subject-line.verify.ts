/**
 * Run: npx tsx lib/email/subject-line.verify.ts
 * Exits non-zero if any case fails (gate before deploy).
 */
import { buildEmailSubject, normalizeEmailSubject } from "./subject-line";
import type { EmailSubjectContext } from "./subject-line";

type Case = { name: string; ctx: EmailSubjectContext; want: string };

const cases: Case[] = [
  {
    name: "electrical contractor NJ + Mixed/other (screenshot)",
    ctx: {
      equipment_type: "Mixed / other",
      industry: "Electrical Contractors",
      state: "NJ",
      specificity_mode: "single_recipient",
    },
    want: "Quick question — surplus electrical gear (NJ)",
  },
  {
    name: "Google type Electrician + generic equipment",
    ctx: {
      equipment_type: "Mixed / other",
      industry: "Electrician",
      state: "TX",
      specificity_mode: "single_recipient",
    },
    want: "Quick question — surplus electrical gear (TX)",
  },
  {
    name: "specific equipment wins over generic industry",
    ctx: {
      equipment_type: "Forklifts",
      industry: "Electrical Contractors",
      state: "OH",
      specificity_mode: "single_recipient",
    },
    want: "Quick question — surplus forklifts (OH)",
  },
  {
    name: "power plant preset",
    ctx: {
      equipment_type: "Mixed / other",
      industry: "Power Plants",
      state: "AL",
      specificity_mode: "single_recipient",
    },
    want: "Quick question — power plant surplus (AL)",
  },
  {
    name: "broadcast multi-state",
    ctx: {
      equipment_type: "Mixed / other",
      industry: "Industrial services",
      specificity_mode: "broadcast",
    },
    want: "Quick question — surplus equipment clearing",
  },
  {
    name: "broadcast same state",
    ctx: {
      equipment_type: "Machinery",
      industry: "Large Manufacturing Plants",
      state: "PA",
      specificity_mode: "shared_niche",
    },
    want: "Quick question — surplus machinery (PA)",
  },
  {
    name: "mixed small batch",
    ctx: {
      equipment_type: "Mixed / other",
      industry: "Crane Services",
      state: "FL",
      specificity_mode: "mixed_small",
    },
    want: "Quick question — surplus industrial gear (FL)",
  },
  {
    name: "company name must not become subject focus",
    ctx: {
      equipment_type: "Mixed / other",
      industry: "Jason Klein Electrical Contractor, LLC",
      state: "NJ",
      specificity_mode: "single_recipient",
    },
    want: "Quick question — surplus industrial equipment (NJ)",
  },
];

let failed = 0;
for (const c of cases) {
  const got = buildEmailSubject(c.ctx);
  if (got !== c.want) {
    console.error(`FAIL ${c.name}\n  got:  ${got}\n  want: ${c.want}`);
    failed++;
  } else {
    console.log(`ok   ${c.name}`);
  }
}

const badAi = normalizeEmailSubject("Quick question — unused Mixed / other (NJ)", {
  equipment_type: "Mixed / other",
  industry: "Electrical Contractors",
  state: "NJ",
  specificity_mode: "single_recipient",
});
if (badAi !== "Quick question — surplus electrical gear (NJ)") {
  console.error(`FAIL normalize AI subject\n  got:  ${badAi}`);
  failed++;
} else {
  console.log("ok   normalize rejects unused Mixed/other");
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length + 1} checks passed.`);
