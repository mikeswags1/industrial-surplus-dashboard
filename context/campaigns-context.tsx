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

export type CampaignsDataSource = "loading" | "remote" | "unconfigured" | "error";

type CampaignsContextValue = {
  campaigns: Campaign[];
  dataSource: CampaignsDataSource;
  backendMessage: string | null;
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

function isUnconfiguredStatus(status: number) {
  return status === 503 || status === 501;
}

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dataSource, setDataSource] = useState<CampaignsDataSource>("loading");
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBackendMessage(null);
    const res = await fetch("/api/campaigns", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      campaigns?: Campaign[];
      error?: string;
      message?: string;
    };

    if (isUnconfiguredStatus(res.status)) {
      setDataSource("unconfigured");
      setCampaigns([]);
      setBackendMessage(json.message ?? json.error ?? "Database not configured.");
      return;
    }
    if (!res.ok) {
      setDataSource("error");
      setCampaigns([]);
      setBackendMessage(json.message ?? json.error ?? `Request failed (${res.status})`);
      return;
    }
    setCampaigns(json.campaigns ?? []);
    setDataSource("remote");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCampaign = useCallback(
    async (input: Omit<Campaign, "id" | "created_at" | "updated_at">) => {
      if (dataSource !== "remote") {
        throw new Error(
          "Cannot save campaigns until Supabase is configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)."
        );
      }
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string; message?: string }).message ?? (j as { error?: string }).error ?? "Failed to save campaign");
      }
      const { campaign } = (await res.json()) as { campaign: Campaign };
      setCampaigns((prev) => [campaign, ...prev]);
    },
    [dataSource]
  );

  const updateCampaign = useCallback(
    async (id: string, patch: Partial<Campaign>) => {
      if (dataSource !== "remote") {
        throw new Error("Cannot update campaigns until the database API is available.");
      }
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string; message?: string }).message ?? (j as { error?: string }).error ?? "Failed to update campaign");
      }
      const { campaign } = (await res.json()) as { campaign: Campaign };
      setCampaigns((prev) => prev.map((c) => (c.id === id ? campaign : c)));
    },
    [dataSource]
  );

  const queueCampaignSends = useCallback(
    async (campaignId: string, leadIds: string[]) => {
      if (dataSource !== "remote") {
        throw new Error("Queue requires a configured Supabase project.");
      }
      const res = await fetch(`/api/campaigns/${campaignId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Queue failed");
      }
      return json as { queued: number; requested: number; capped: boolean };
    },
    [dataSource]
  );

  const value = useMemo(
    () => ({
      campaigns,
      dataSource,
      backendMessage,
      addCampaign,
      updateCampaign,
      refresh,
      queueCampaignSends,
    }),
    [
      campaigns,
      dataSource,
      backendMessage,
      addCampaign,
      updateCampaign,
      refresh,
      queueCampaignSends,
    ]
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
