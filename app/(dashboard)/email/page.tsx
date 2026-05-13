"use client";

import { useState } from "react";
import { EQUIPMENT_TYPES, US_STATES } from "@/lib/types";

type GenBody = {
  industry: string;
  equipment_type: string;
  state: string;
  company_name: string;
  pain_point: string;
  include_followups?: boolean;
};

export default function EmailGeneratorPage() {
  const [industry, setIndustry] = useState("Manufacturing");
  const [equipment, setEquipment] = useState(EQUIPMENT_TYPES[0]);
  const [state, setState] = useState("TX");
  const [company, setCompany] = useState("");
  const [pain, setPain] = useState(
    "Idle assets taking floor space; need quick valuation and pickup."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    subject: string;
    body: string;
    follow_up_1?: string;
    follow_up_2?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const payload: GenBody = {
        industry,
        equipment_type: equipment,
        state,
        company_name: company || "your team",
        pain_point: pain,
        include_followups: true,
      };
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult({
        subject: data.subject,
        body: data.body,
        follow_up_1: data.follow_up_1,
        follow_up_2: data.follow_up_2,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Email generator
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cold outreach tuned for industrial surplus buyers. Uses OpenAI when{" "}
          <code className="text-zinc-400">OPENAI_API_KEY</code> is set; otherwise
          returns a vetted template.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4">
          <h2 className="text-sm font-medium text-zinc-300">Inputs</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Industry</span>
            <input
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Equipment type</span>
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            >
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">State</span>
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Company name (optional)</span>
            <input
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Manufacturing"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Pain point</span>
            <textarea
              rows={4}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={pain}
              onChange={(e) => setPain(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-muted)] disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate email"}
          </button>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4 min-h-[320px]">
          <h2 className="text-sm font-medium text-zinc-300">Output</h2>
          {!result ? (
            <p className="text-sm text-zinc-500">
              Generated subject, body, and follow-ups appear here.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs uppercase text-zinc-500 mb-1">
                  Subject
                </div>
                <div className="rounded-md bg-[var(--color-surface-0)] border border-[var(--color-border)] px-3 py-2 text-zinc-100">
                  {result.subject}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-zinc-500 mb-1">Body</div>
                <pre className="whitespace-pre-wrap rounded-md bg-[var(--color-surface-0)] border border-[var(--color-border)] px-3 py-2 text-zinc-200 font-sans">
                  {result.body}
                </pre>
              </div>
              {result.follow_up_1 ? (
                <div>
                  <div className="text-xs uppercase text-zinc-500 mb-1">
                    Follow-up 1
                  </div>
                  <pre className="whitespace-pre-wrap rounded-md bg-[var(--color-surface-0)] border border-[var(--color-border)] px-3 py-2 text-zinc-200 font-sans">
                    {result.follow_up_1}
                  </pre>
                </div>
              ) : null}
              {result.follow_up_2 ? (
                <div>
                  <div className="text-xs uppercase text-zinc-500 mb-1">
                    Follow-up 2
                  </div>
                  <pre className="whitespace-pre-wrap rounded-md bg-[var(--color-surface-0)] border border-[var(--color-border)] px-3 py-2 text-zinc-200 font-sans">
                    {result.follow_up_2}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
