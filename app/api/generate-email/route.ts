import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  BROADCAST_RECIPIENT_THRESHOLD,
  type BatchSpecificityMode,
} from "@/lib/email/batch-email-generation";
import {
  buildEmailSubject,
  isGenericEquipmentLabel,
  normalizeEmailSubject,
  type EmailSubjectContext,
} from "@/lib/email/subject-line";

type Body = {
  industry?: string;
  equipment_type?: string;
  state?: string;
  company_name?: string;
  pain_point?: string;
  include_followups?: boolean;
  recipient_count?: number;
  specificity_mode?: BatchSpecificityMode;
  selection_notes?: string;
};

function resolveGenerationMeta(body: Body): {
  recipient_count: number;
  specificity_mode: BatchSpecificityMode;
} {
  const recipient_count =
    typeof body.recipient_count === "number" &&
    Number.isFinite(body.recipient_count) &&
    body.recipient_count >= 1
      ? Math.floor(body.recipient_count)
      : 1;
  const specificity_mode: BatchSpecificityMode =
    body.specificity_mode ??
    (recipient_count <= 1
      ? "single_recipient"
      : recipient_count >= BROADCAST_RECIPIENT_THRESHOLD
        ? "broadcast"
        : "mixed_small");
  return { recipient_count, specificity_mode };
}

function specificityInstructions(
  recipient_count: number,
  mode: BatchSpecificityMode
): string {
  switch (mode) {
    case "broadcast":
      return `Batch mode (${recipient_count} recipients): ONE identical email goes to every recipient.
Write broadly so it fits factories, warehouses, and trades across regions. NEVER name a recipient company or imply this email is only to them — use "Hi there," etc.
Avoid hyper-specific subjects tied to one niche or one city unless all inputs clearly share them.
The subject must scan well for diverse readers.
Never put internal labels like "Mixed / other" in the subject — use plain language like "surplus industrial gear".`;
    case "shared_niche":
      return `Focused batch (${recipient_count} recipients): recipients share the same equipment/category lens and geography fields provided — you may speak specifically to that surplus niche and region.
Still ONE shared letter: NEVER name one recipient company or its facilities. Prefer "Hi there," not a company name.`;
    case "mixed_small":
      return `Small mixed batch (${recipient_count} recipients): equipment or geography varies across rows.
Stay moderately general — surplus industrial equipment / warehouse assets framing — without pinning one odd specialty or town unless inputs are strongly aligned.
Never name one recipient company.`;
    default:
      return `Single-recipient outreach: if company_name is provided and usable, you may greet naturally (otherwise "Hi there,").
Subject: short, natural B2B line — e.g. "Quick question — surplus electrical gear (NJ)". Never use "unused Mixed / other" or raw CRM equipment enums.`;
  }
}

function subjectContext(b: Body, specificity_mode: BatchSpecificityMode): EmailSubjectContext {
  return {
    equipment_type: b.equipment_type,
    industry: b.industry,
    state: b.state,
    specificity_mode,
  };
}

function template(b: Body) {
  const { specificity_mode } = resolveGenerationMeta(b);
  const industry = b.industry || "your industry";
  const equipment = b.equipment_type || "surplus equipment";
  const statePhrase = b.state ? ` in ${b.state}` : "";
  const pain = b.pain_point || "unused assets taking space";
  const subCtx = subjectContext(b, specificity_mode);

  const companyRaw = (b.company_name || "").trim();
  const useCompany =
    specificity_mode === "single_recipient" &&
    companyRaw.length > 0 &&
    companyRaw.toLowerCase() !== "your team";
  const greet = useCompany ? companyRaw : "there";

  const subject = buildEmailSubject(subCtx);

  let bodyOut: string;
  if (specificity_mode === "broadcast") {
    bodyOut = `Hi ${greet},

We help industrial teams clear surplus equipment — forklifts, electrical gear, valves, machinery, scrap metal, and warehouse inventory — when loads need to move without turning it into a project.

If idle assets pile up occasionally, we're straightforward to engage.

If timing's wrong, feel free to ignore.

Best regards`;
  } else if (specificity_mode === "shared_niche") {
    bodyOut = `Hi ${greet},

We help companies clear surplus industrial equipment — forklifts, electrical, valves, machinery, scrap, and warehouse inventory${statePhrase}. If you have idle assets or end-of-line units, we can usually coordinate pickup pragmatically.

Given your lane (${industry}), we often hear about ${pain}.

If timing is off, no problem — happy to reconnect another quarter.

Best regards`;
  } else if (specificity_mode === "mixed_small") {
    bodyOut = `Hi ${greet},

We buy and coordinate pickup on surplus industrial equipment — forklifts, electrical, valves, machinery, scrap, and warehouse inventory${statePhrase}. Useful when mixed loads need to move without fuss.

Teams in ${industry} sometimes sit on ${pain}; we keep it simple.

If not a fit now, no worries.

Best regards`;
  } else {
    bodyOut = `Hi ${greet},

We help companies clear surplus industrial equipment — forklifts, electrical, valves, machinery, scrap, and warehouse inventory${statePhrase}. If you have idle assets or end-of-line units, we can usually turn them around with straightforward pickup.

Worth noting: ${industry}. We often hear about ${pain}.

If timing is off, no problem — happy to reconnect another quarter.

Best regards`;
  }

  const followFocus =
    subCtx.industry?.toLowerCase().includes("electrical")
      ? "surplus electrical gear"
      : isGenericEquipmentLabel(equipment)
        ? "surplus equipment"
        : equipment.toLowerCase();
  const follow1 =
    specificity_mode === "broadcast"
      ? "Circling back — still open to hearing about surplus loads you might want to move?"
      : `Circling back — still open to a quick look at ${followFocus} you might want to move?`;
  const follow2 =
    "Last check-in — we coordinate pickup on agreed loads. Open to a short call this week?";

  return { subject, body: bodyOut, follow_up_1: follow1, follow_up_2: follow2 };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const meta = resolveGenerationMeta(body);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(template(body));
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const sys = `You write concise B2B cold emails for an industrial surplus buyer (Select Surplus style).
Tone: calm professional, one human talking to another — never salesy, never "get rich quick."
Avoid in subjects and opening lines: cash, fast cash, guaranteed, act now, free money, URGENT, !!!, and "fast quote."
Prefer: short subject and plain-spoken body.
Subject examples: "Quick question — surplus electrical gear (NJ)", "Quick question — surplus forklifts (TX)".
Never use awkward internal labels (e.g. "Mixed / other", "Liquidation inventory") verbatim in the subject.

${specificityInstructions(meta.recipient_count, meta.specificity_mode)}

Output strict JSON with keys: subject (string), body (string), follow_up_1 (string), follow_up_2 (string).
Keep body under 160 words. No HTML.`;

    const user = JSON.stringify({
      recipient_count: meta.recipient_count,
      specificity_mode: meta.specificity_mode,
      industry: body.industry,
      equipment_type: body.equipment_type,
      state: body.state ?? null,
      company_name:
        meta.specificity_mode === "single_recipient" ? body.company_name ?? null : null,
      pain_point: body.pain_point,
      include_followups: body.include_followups ?? true,
      selection_notes: body.selection_notes ?? null,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(template(body));
    }
    const parsed = JSON.parse(raw) as {
      subject?: string;
      body?: string;
      follow_up_1?: string;
      follow_up_2?: string;
    };
    const t = template(body);
    const subCtx = subjectContext(body, meta.specificity_mode);
    return NextResponse.json({
      subject: normalizeEmailSubject(parsed.subject, subCtx),
      body: parsed.body || t.body,
      follow_up_1: parsed.follow_up_1 || t.follow_up_1,
      follow_up_2: parsed.follow_up_2 || t.follow_up_2,
    });
  } catch {
    return NextResponse.json(template(body));
  }
}
