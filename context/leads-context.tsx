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

export type LeadsDataSource = "loading" | "remote" | "unconfigured" | "error";

type LeadsContextValue = {
  leads: Lead[];
  dataSource: LeadsDataSource;
  /** Last API error when dataSource is "error" (e.g. 500). */
  backendMessage: string | null;
  addLead: (input: Omit<Lead, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  bulkSetStatus: (ids: string[], status: LeadStatus) => Promise<void>;
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

function isUnconfiguredStatus(status: number) {
  return status === 503 || status === 501;
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dataSource, setDataSource] = useState<LeadsDataSource>("loading");
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBackendMessage(null);
    const res = await fetch("/api/leads", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      leads?: Lead[];
      error?: string;
      message?: string;
    };

    if (isUnconfiguredStatus(res.status)) {
      setDataSource("unconfigured");
      setLeads([]);
      setBackendMessage(json.message ?? json.error ?? "Database not configured.");
      return;
    }
    if (!res.ok) {
      setDataSource("error");
      setLeads([]);
      setBackendMessage(json.message ?? json.error ?? `Request failed (${res.status})`);
      return;
    }
    setLeads(json.leads ?? []);
    setDataSource("remote");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addLead = useCallback(
    async (input: Omit<Lead, "id" | "created_at" | "updated_at">) => {
      if (dataSource !== "remote") {
        throw new Error(
          "Cannot create leads until Supabase is configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)."
        );
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string; message?: string }).message ?? (j as { error?: string }).error ?? "Failed to create lead");
      }
      await refresh();
    },
    [dataSource]
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      if (dataSource !== "remote") {
        throw new Error("Cannot update leads until the database API is available.");
      }
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string; message?: string }).message ?? (j as { error?: string }).error ?? "Failed to update lead");
      }
      await refresh();
    },
    [dataSource]
  );

  const bulkSetStatus = useCallback(
    async (ids: string[], status: LeadStatus) => {
      if (dataSource !== "remote") {
        throw new Error("Cannot update leads until the database API is available.");
      }
      if (!ids.length) return;
      const res = await fetch("/api/leads/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Bulk status failed");
      }
      await refresh();
    },
    [dataSource, refresh]
  );

  const importFromCsvText = useCallback(
    async (csvText: string, tag?: string) => {
      if (dataSource !== "remote") {
        throw new Error("CSV import requires a configured Supabase backend.");
      }
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, tag }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Import failed");
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
        throw new Error((j as { error?: string }).error ?? "Enrich failed");
      }
      await refresh();
    },
    [dataSource]
  );

  const value = useMemo(
    () => ({
      leads,
      dataSource,
      backendMessage,
      addLead,
      updateLead,
      bulkSetStatus,
      refresh,
      importFromCsvText,
      enrichLead,
    }),
    [
      leads,
      dataSource,
      backendMessage,
      addLead,
      updateLead,
      bulkSetStatus,
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
      ["New", "Contacted", "Interested", "Quote Needed"].includes(
        l.status
      )
    )
    .reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
}
