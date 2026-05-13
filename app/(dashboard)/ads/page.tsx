"use client";

import { useState } from "react";
import { AD_ANGLE_PRESETS, EQUIPMENT_TYPES, US_STATES } from "@/lib/types";

export default function AdScriptsPage() {
  const [angle, setAngle] = useState(AD_ANGLE_PRESETS[0]);
  const [equipment, setEquipment] = useState(EQUIPMENT_TYPES[0]);
  const [state, setState] = useState("TX");
  const [extra, setExtra] = useState(
    "Fast cash quotes, free evaluations, nationwide pickup."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angle,
          equipment_type: equipment,
          state,
          extra_notes: extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data.copy as string);
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
          Ad script generator
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Facebook / Instagram primary text variants. OpenAI optional; template
          fallback always available.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Angle / hook</span>
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
            >
              {AD_ANGLE_PRESETS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Equipment focus</span>
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
            <span className="text-zinc-400">State (for local flavor)</span>
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
            <span className="text-zinc-400">Extra proof points</span>
            <textarea
              rows={3}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-muted)] disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate ad copy"}
          </button>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 min-h-[280px]">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Output</h2>
          {!result ? (
            <p className="text-sm text-zinc-500">
              Primary text, headline ideas, and CTA lines will show here.
            </p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-sans">
              {result}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
