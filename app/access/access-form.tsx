"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

export function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Could not unlock.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="flex flex-col gap-2">
        <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">
          Access code
        </span>
        <input
          type="password"
          autoComplete="current-password"
          className="dash-input font-mono text-[15px]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter the shared code"
          required
          disabled={busy}
        />
      </label>
      {err ? (
        <p className="text-sm text-red-400/95" role="alert">
          {err}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !code.trim()} className="dash-btn-primary w-full justify-center py-3">
        {busy ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
