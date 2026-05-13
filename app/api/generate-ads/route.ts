import { NextResponse } from "next/server";
import OpenAI from "openai";

type Body = {
  angle?: string;
  equipment_type?: string;
  state?: string;
  extra_notes?: string;
};

function template(b: Body) {
  const angle = b.angle || "We buy industrial surplus";
  const equipment = b.equipment_type || "industrial equipment";
  const state = b.state || "";
  const extra = b.extra_notes || "";

  return `${angle}

Sell ${equipment.toLowerCase()} you no longer need. ${state ? `Serving operators in ${state} and nationwide. ` : ""}Fast cash quotes, free evaluations, and coordinated pickup.

${extra}

CTA: Message us for a same-week look — no obligation.

—

Alt headline ideas:
- Cash for surplus ${equipment.toLowerCase()}
- Free evaluation · nationwide pickup
- Plant closing? We buy assets

Primary text (short):
${angle} — ${equipment}. ${extra} DM or call for a fast quote.`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ copy: template(body) });
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const sys = `You write Facebook/Instagram primary text for industrial surplus buyers.
Constraints: plain text, no hashtags unless asked, 3 short paragraphs max, strong CTA, professional tone.
Return JSON: { "copy": string } only.`;

    const user = JSON.stringify(body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return NextResponse.json({ copy: template(body) });
    const parsed = JSON.parse(raw) as { copy?: string };
    return NextResponse.json({
      copy: parsed.copy || template(body),
    });
  } catch {
    return NextResponse.json({ copy: template(body) });
  }
}
