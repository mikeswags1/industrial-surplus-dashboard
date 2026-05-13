import { NextResponse } from "next/server";
import OpenAI from "openai";

type Body = {
  industry?: string;
  equipment_type?: string;
  state?: string;
  company_name?: string;
  pain_point?: string;
  include_followups?: boolean;
};

function template(b: Body) {
  const industry = b.industry || "your industry";
  const equipment = b.equipment_type || "surplus equipment";
  const state = b.state ? ` in ${b.state}` : "";
  const company = b.company_name || "your team";
  const pain = b.pain_point || "unused assets taking space";

  const subject = `Fast cash quote for ${equipment}${state ? ` (${b.state})` : ""}`;
  const body = `Hi ${company},

We buy surplus industrial equipment nationwide. If ${company} has unused forklifts, electrical gear, circuit breakers, valves, machinery, scrap, or warehouse inventory${state}, we can provide a fast cash quote and handle pickup and logistics.

Context: ${industry}. Pain we often solve: ${pain}.

If now is not a fit, no worries — happy to stay on file.

Best regards`;

  const follow1 = `Quick bump — still open to a no-obligation valuation on your ${equipment.toLowerCase()}?`;
  const follow2 = `Last note from me — we pay quickly on agreed deals and coordinate rigging where needed. Worth a 10-minute call?`;

  return { subject, body, follow_up_1: follow1, follow_up_2: follow2 };
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
    return NextResponse.json(template(body));
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const sys = `You write concise B2B cold emails for an industrial surplus buyer. 
Tone: professional, direct, no hype, no spam clichés, no fake personalization.
Output strict JSON with keys: subject (string), body (string), follow_up_1 (string), follow_up_2 (string).
Keep body under 160 words. No HTML.`;

    const user = JSON.stringify({
      industry: body.industry,
      equipment_type: body.equipment_type,
      state: body.state,
      company_name: body.company_name,
      pain_point: body.pain_point,
      include_followups: body.include_followups ?? true,
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
    return NextResponse.json({
      subject: parsed.subject || template(body).subject,
      body: parsed.body || template(body).body,
      follow_up_1: parsed.follow_up_1 || template(body).follow_up_1,
      follow_up_2: parsed.follow_up_2 || template(body).follow_up_2,
    });
  } catch {
    return NextResponse.json(template(body));
  }
}
