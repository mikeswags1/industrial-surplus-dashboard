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

export type CampaignsDataSource = "loading" | "local" | "remote";

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
  dataSource: CampaignsDataSource;
  addCampaign: (input: Omit<Campaign, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateCampaign: (id: string, patch: Partial<Campaign>) => Promise<void>;
  refresh: () => Promise<void>;
  /** Enqueue leads for step-0 sends (requires Supabase queue table). */
  queueCampaignSends: (campaignId: string, leadIds: string[]) => Promise<{
    queued: number;
    requested: number;
    capped: boolean;
  }>;
};

const CampaignsContext = createContext<CampaignsContextValue | null>(null);

function loadLocal(): Campaign[] {
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
  const [dataSource, setDataSource] = useState<CampaignsDataSource>("loading");
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/campaigns", { cache: "no-store" });
    if (res.status === 501) {
      setDataSource("local");
      setCampaigns(loadLocal());
      return;
    }
    if (!res.ok) {
      setDataSource("local");
      setCampaigns(loadLocal());
      return;
    }
    const json = (await res.json()) as { campaigns: Campaign[] };
    setCampaigns(json.campaigns ?? []);
    setDataSource("remote");
  }, []);

  useEffect(() => {
    setHydrated(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hydrated || dataSource !== "local") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns, hydrated, dataSource]);

  const addCampaign = useCallback(
    async (input: Omit<Campaign, "id" | "created_at" | "updated_at">) => {
      if (dataSource === "remote") {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || "Failed to save campaign");
        }
        const { campaign } = (await res.json()) as { campaign: Campaign };
        setCampaigns((prev) => [campaign, ...prev]);
        return;
      }
      const ts = nowIso();
      const row: Campaign = {
        ...input,
        id: newId(),
        created_at: ts,
        updated_at: ts,
      };
      setCampaigns((prev) => [row, ...prev]);
    },
    [dataSource]
  );

  const updateCampaign = useCallback(
    async (id: string, patch: Partial<Campaign>) => {
      if (dataSource === "remote") {
        const res = await fetch(`/api/campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || "Failed to update campaign");
        }
        const { campaign } = (await res.json()) as { campaign: Campaign };
        setCampaigns((prev) => prev.map((c) => (c.id === id ? campaign : c)));
        return;
      }
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...patch, updated_at: nowIso() } : c
        )
      );
    },
    [dataSource]
  );

  const queueCampaignSends = useCallback(
    async (campaignId: string, leadIds: string[]) => {
      if (dataSource !== "remote") {
        throw new Error("Queue requires Supabase.");
      }
      const res = await fetch(`/api/campaigns/${campaignId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || "Queue failed");
      }
      return json as { queued: number; requested: number; capped: boolean };
    },
    [dataSource]
  );

  const value = useMemo(
    () => ({
      campaigns,
      dataSource,
      addCampaign,
      updateCampaign,
      refresh,
      queueCampaignSends,
    }),
    [campaigns, dataSource, addCampaign, updateCampaign, refresh, queueCampaignSends]
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
