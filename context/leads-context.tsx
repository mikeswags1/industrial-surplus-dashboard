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
import { MOCK_LEADS } from "@/lib/mock-leads";

const STORAGE_KEY = "isd_leads_v1";

type LeadsContextValue = {
  leads: Lead[];
  addLead: (input: Omit<Lead, "id" | "created_at" | "updated_at">) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  resetToMock: () => void;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

function loadInitial(): Lead[] {
  if (typeof window === "undefined") return MOCK_LEADS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_LEADS;
    const parsed = JSON.parse(raw) as Lead[];
    if (!Array.isArray(parsed) || parsed.length === 0) return MOCK_LEADS;
    return parsed;
  } catch {
    return MOCK_LEADS;
  }
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLeads(loadInitial());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, hydrated]);

  const addLead = useCallback(
    (input: Omit<Lead, "id" | "created_at" | "updated_at">) => {
      const ts = nowIso();
      const row: Lead = {
        ...input,
        id: newId(),
        created_at: ts,
        updated_at: ts,
      };
      setLeads((prev) => [row, ...prev]);
    },
    []
  );

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...patch, updated_at: nowIso() } : l
      )
    );
  }, []);

  const resetToMock = useCallback(() => {
    setLeads(MOCK_LEADS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ leads, addLead, updateLead, resetToMock }),
    [leads, addLead, updateLead, resetToMock]
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
