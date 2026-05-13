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
import type { Campaign, CampaignStatus } from "@/lib/types";
import { newId, nowIso } from "@/lib/types";

const STORAGE_KEY = "isd_campaigns_v1";

const SEED: Campaign[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Q2 Forklifts — Southeast",
    equipment_type: "Forklifts",
    region: "GA, AL, SC",
    primary_subject: "Quick cash quote for idle forklifts",
    primary_body:
      "We buy surplus forklifts nationwide with fast evaluations and coordinated pickup.",
    follow_up_1: "Following up — still interested in a quote?",
    follow_up_2: "Last note — we can close quickly if timing works.",
    status: "draft",
    emails_sent: 0,
    replies_count: 0,
    interested_count: 0,
    created_at: "2026-05-01T10:00:00.000Z",
    updated_at: "2026-05-01T10:00:00.000Z",
  },
];

type CampaignsContextValue = {
  campaigns: Campaign[];
  addCampaign: (input: Omit<Campaign, "id" | "created_at" | "updated_at">) => void;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
};

const CampaignsContext = createContext<CampaignsContextValue | null>(null);

function loadInitial(): Campaign[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Campaign[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED;
    return parsed;
  } catch {
    return SEED;
  }
}

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(SEED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCampaigns(loadInitial());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns, hydrated]);

  const addCampaign = useCallback(
    (input: Omit<Campaign, "id" | "created_at" | "updated_at">) => {
      const ts = nowIso();
      const row: Campaign = {
        ...input,
        id: newId(),
        created_at: ts,
        updated_at: ts,
      };
      setCampaigns((prev) => [row, ...prev]);
    },
    []
  );

  const updateCampaign = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...patch, updated_at: nowIso() } : c
      )
    );
  }, []);

  const value = useMemo(
    () => ({ campaigns, addCampaign, updateCampaign }),
    [campaigns, addCampaign, updateCampaign]
  );

  return (
    <CampaignsContext.Provider value={value}>
      {children}
    </CampaignsContext.Provider>
  );
}

export function useCampaigns() {
  const ctx = useContext(CampaignsContext);
  if (!ctx)
    throw new Error("useCampaigns must be used within CampaignsProvider");
  return ctx;
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};
