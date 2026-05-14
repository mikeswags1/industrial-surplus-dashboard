"use client";

import { useState, type FormEvent } from "react";
import {
  useCampaigns,
  CAMPAIGN_STATUS_LABELS,
} from "@/context/campaigns-context";
import {
  EQUIPMENT_TYPES,
  US_STATES,
  type CampaignStatus,
  type EquipmentType,
  type USState,
} from "@/lib/types";

export default function CampaignsPage() {
  const { campaigns, addCampaign, updateCampaign } = useCampaigns();
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<EquipmentType>(EQUIPMENT_TYPES[0]);
  const [regionMode, setRegionMode] = useState<"state" | "custom">("state");
  const [state, setState] = useState<USState>("TX");
  const [regionCustom, setRegionCustom] = useState("");

  async function generateScripts() {
    const res = await fetch("/api/generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry: "Industrial surplus",
        equipment_type: equipment,
        state: regionMode === "state" ? state : "",
        company_name: "Prospect company",
        pain_point:
          "Unused equipment taking floor space; need fast valuation and pickup.",
        include_followups: true,
      }),
    });
    const data = (await res.json()) as {
      subject?: string;
      body?: string;
      follow_up_1?: string;
      follow_up_2?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Generate failed");
    return data;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const region =
      regionMode === "state" ? state : regionCustom.trim() || "Nationwide";
    let subject = `Cash quote for ${equipment.toLowerCase()} — ${region}`;
    let body = `We buy surplus industrial equipment nationwide. If you have unused ${equipment.toLowerCase()} or related assets, we can provide a fast cash quote and coordinate pickup.`;
    let follow1 = "Quick follow-up — happy to share a ballpark this week.";
    let follow2 =
      "Last check-in — we keep logistics simple and pay quickly on agreed loads.";

    try {
      const gen = await generateScripts();
      if (gen.subject) subject = gen.subject;
      if (gen.body) body = gen.body;
      if (gen.follow_up_1) follow1 = gen.follow_up_1;
      if (gen.follow_up_2) follow2 = gen.follow_up_2;
    } catch {
      /* template fallback already set */
    }

    try {
      await addCampaign({
        name: name.trim(),
        equipment_type: equipment,
        region,
        primary_subject: subject,
        primary_body: body,
        follow_up_1: follow1,
        follow_up_2: follow2,
        status: "draft",
        emails_sent: 0,
        replies_count: 0,
        interested_count: 0,
      });
      setName("");
      setRegionCustom("");
    } catch (er) {
      alert(er instanceof Error ? er.message : "Could not save campaign");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
          Draft cold email campaigns by equipment and geography. Scripts use the
          email generator API when{" "}
          <code className="text-zinc-400">OPENAI_API_KEY</code> is configured;
          otherwise a proven template is used.
        </p>
      </header>

      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5 space-y-4 max-w-2xl"
      >
        <h2 className="text-sm font-medium text-zinc-300">New campaign</h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Campaign name</span>
          <input
            required
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q2 circuit breakers — Midwest"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Equipment focus</span>
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as EquipmentType)}
            >
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2 text-sm">
            <span className="text-zinc-400">Region</span>
            <div className="flex gap-3 text-zinc-300">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="region"
                  checked={regionMode === "state"}
                  onChange={() => setRegionMode("state")}
                />
                State
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="region"
                  checked={regionMode === "custom"}
                  onChange={() => setRegionMode("custom")}
                />
                Custom
              </label>
            </div>
            {regionMode === "state" ? (
              <select
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                value={state}
                onChange={(e) => setState(e.target.value as USState)}
              >
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                placeholder="e.g. Southeast, I-35 corridor"
                value={regionCustom}
                onChange={(e) => setRegionCustom(e.target.value)}
              />
            )}
          </div>
        </div>
        <button
          type="submit"
          className="dash-btn-primary"
        >
          Save campaign (with generated scripts)
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Saved campaigns</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-zinc-100">{c.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {c.equipment_type} · {c.region}
                  </p>
                </div>
                <select
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-2 py-1 text-xs"
                  value={c.status}
                  onChange={(e) =>
                    void updateCampaign(c.id, {
                      status: e.target.value as CampaignStatus,
                    })
                  }
                >
                  {(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {CAMPAIGN_STATUS_LABELS[k]}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="text-xs text-zinc-500 space-y-1">
                <div>
                  <span className="text-zinc-400">Subject:</span>{" "}
                  {c.primary_subject}
                </div>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-3">
                {c.primary_body}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-[var(--color-border)]">
                <div>
                  <div className="text-zinc-500">Sent</div>
                  <div className="font-semibold text-zinc-200">
                    {c.emails_sent}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Replies</div>
                  <div className="font-semibold text-zinc-200">
                    {c.replies_count}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Interested</div>
                  <div className="font-semibold text-zinc-200">
                    {c.interested_count}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-zinc-300 hover:bg-[var(--color-surface-2)]"
                  onClick={() =>
                    void updateCampaign(c.id, {
                      emails_sent: c.emails_sent + 5,
                    })
                  }
                >
                  +5 sent (demo)
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-zinc-300 hover:bg-[var(--color-surface-2)]"
                  onClick={() =>
                    void updateCampaign(c.id, {
                      replies_count: c.replies_count + 1,
                    })
                  }
                >
                  +1 reply (demo)
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-zinc-300 hover:bg-[var(--color-surface-2)]"
                  onClick={() =>
                    void updateCampaign(c.id, {
                      interested_count: c.interested_count + 1,
                    })
                  }
                >
                  +1 interested (demo)
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
