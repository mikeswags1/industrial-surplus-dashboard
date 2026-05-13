"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { newId, nowIso } from "@/lib/types";

const STORAGE_KEY = "isd_leads_v2";

export type LeadsDataSource = "loading" | "local" | "remote";

type LeadsContextValue = {
  leads: Lead[];
  dataSource: LeadsDataSource;
  addLead: (input: Omit<Lead, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  /** Clears browser-stored leads (local mode only). */
  resetToMock: () => void;
  refresh: () => Promise<void>;
  importFromCsvText: (
    csvText: string,
    tag?: string
  ) => Promise<{
    inserted: number;
    skipped: number;
    rowErrors: { line: number; message: string }[];
  }>;
  enrichLead: (id: string) => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

function loadLocal(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Lead[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dataSource, setDataSource] = useState<LeadsDataSource>("loading");
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/leads", { cache: "no-store" });
    if (res.status === 501) {
      setDataSource("local");
      setLeads(loadLocal());
      return;
    }
    if (!res.ok) {
      setDataSource("local");
      setLeads(loadLocal());
      return;
    }
    const json = (await res.json()) as { leads: Lead[] };
    setLeads(json.leads ?? []);
    setDataSource("remote");
  }, []);

  useEffect(() => {
    setHydrated(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hydrated || dataSource !== "local") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, hydrated, dataSource]);

  const addLead = useCallback(
    async (input: Omit<Lead, "id" | "created_at" | "updated_at">) => {
      if (dataSource === "remote") {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || "Failed to create lead");
        }
        const { lead } = (await res.json()) as { lead: Lead };
        setLeads((prev) => [lead, ...prev]);
        return;
      }
      const ts = nowIso();
      const row: Lead = {
        ...input,
        id: newId(),
        created_at: ts,
        updated_at: ts,
      };
      setLeads((prev) => [row, ...prev]);
    },
    [dataSource]
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      if (dataSource === "remote") {
        const res = await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || "Failed to update lead");
        }
        const { lead } = (await res.json()) as { lead: Lead };
        setLeads((prev) => prev.map((l) => (l.id === id ? lead : l)));
        return;
      }
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, ...patch, updated_at: nowIso() } : l
        )
      );
    },
    [dataSource]
  );

  const resetToMock = useCallback(() => {
    setLeads([]);
    localStorage.removeItem(STORAGE_KEY);
    setDataSource("local");
  }, []);

  const importFromCsvText = useCallback(
    async (csvText: string, tag?: string) => {
      if (dataSource !== "remote") {
        throw new Error("CSV import requires Supabase (server API). Configure keys and refresh.");
      }
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, tag }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || "Import failed");
      }
      await refresh();
      return json as {
        inserted: number;
        skipped: number;
        rowErrors: { line: number; message: string }[];
      };
    },
    [dataSource, refresh]
  );

  const enrichLead = useCallback(
    async (id: string) => {
      if (dataSource !== "remote") return;
      const res = await fetch(`/api/leads/${id}/enrich`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Enrich failed");
      }
      const { lead } = (await res.json()) as { lead: Lead };
      setLeads((prev) => prev.map((l) => (l.id === id ? lead : l)));
    },
    [dataSource]
  );

  const value = useMemo(
    () => ({
      leads,
      dataSource,
      addLead,
      updateLead,
      resetToMock,
      refresh,
      importFromCsvText,
      enrichLead,
    }),
    [
      leads,
      dataSource,
      addLead,
      updateLead,
      resetToMock,
      refresh,
      importFromCsvText,
      enrichLead,
    ]
  );

  return (
    <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}

export function countByStatus(leads: Lead[], status: LeadStatus) {
  return leads.filter((l) => l.status === status).length;
}

export function pipelineValue(leads: Lead[]) {
  return leads
    .filter((l) =>
      ["New", "Contacted", "Replied", "Interested", "Quote Needed"].includes(
        l.status
      )
    )
    .reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
}
