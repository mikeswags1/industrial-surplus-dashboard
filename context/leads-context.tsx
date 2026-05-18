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
  deleteLead: (id: string) => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

function isUnconfiguredStatus(status: number) {
  return status === 503 || status === 501;
}

async function parseApiJson(res: Response): Promise<Record<string, unknown>> {
  const t = await res.text();
  try {
    return t ? (JSON.parse(t) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Middleware returns JSON 401 for /api/* without PIN cookie — redirect to access screen (avoids HTML redirect + JSON parse errors). */
function redirectIfSiteAccessRequired(res: Response, json: Record<string, unknown>): boolean {
  if (res.status !== 401 || json.code !== "SITE_ACCESS_REQUIRED") return false;
  if (typeof window === "undefined") return false;
  window.location.assign(
    `/access?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
  );
  return true;
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dataSource, setDataSource] = useState<LeadsDataSource>("loading");
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBackendMessage(null);
    const res = await fetch("/api/leads", { cache: "no-store", credentials: "include" });
    const json = (await parseApiJson(res)) as {
      leads?: Lead[];
      error?: string;
      message?: string;
      code?: string;
    };

    if (redirectIfSiteAccessRequired(res, json)) return;

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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const j = await parseApiJson(res);
      if (redirectIfSiteAccessRequired(res, j)) return;
      if (!res.ok) {
        throw new Error(
          (j.message as string | undefined) ??
            (j.error as string | undefined) ??
            "Failed to create lead"
        );
      }
      await refresh();
    },
    [dataSource, refresh]
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      if (dataSource !== "remote") {
        throw new Error("Cannot update leads until the database API is available.");
      }
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await parseApiJson(res);
      if (redirectIfSiteAccessRequired(res, j)) return;
      if (!res.ok) {
        throw new Error(
          (j.message as string | undefined) ??
            (j.error as string | undefined) ??
            "Failed to update lead"
        );
      }
      await refresh();
    },
    [dataSource, refresh]
  );

  const bulkSetStatus = useCallback(
    async (ids: string[], status: LeadStatus) => {
      if (dataSource !== "remote") {
        throw new Error("Cannot update leads until the database API is available.");
      }
      if (!ids.length) return;
      const res = await fetch("/api/leads/bulk-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const j = await parseApiJson(res);
      if (redirectIfSiteAccessRequired(res, j)) return;
      if (!res.ok) {
        throw new Error((j.error as string | undefined) ?? "Bulk status failed");
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, tag }),
      });
      const json = await parseApiJson(res);
      if (redirectIfSiteAccessRequired(res, json)) {
        throw new Error("Redirecting to access screen.");
      }
      if (!res.ok) {
        throw new Error((json.error as string | undefined) ?? "Import failed");
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
      const res = await fetch(`/api/leads/${id}/enrich`, { method: "POST", credentials: "include" });
      const j = await parseApiJson(res);
      if (redirectIfSiteAccessRequired(res, j)) return;
      if (!res.ok) {
        throw new Error((j.error as string | undefined) ?? "Enrich failed");
      }
      await refresh();
    },
    [dataSource, refresh]
  );

  const deleteLead = useCallback(
    async (id: string) => {
      if (dataSource !== "remote") {
        throw new Error("Cannot delete leads until the database API is available.");
      }
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE", credentials: "include" });
      const j = await parseApiJson(res);
      if (redirectIfSiteAccessRequired(res, j)) return;
      if (!res.ok) {
        throw new Error(
          (j.message as string | undefined) ??
            (j.error as string | undefined) ??
            "Failed to delete lead"
        );
      }
      await refresh();
    },
    [dataSource, refresh]
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
      deleteLead,
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
      deleteLead,
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
