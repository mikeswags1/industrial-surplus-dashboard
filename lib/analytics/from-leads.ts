import type { Lead } from "@/lib/types";

export type StateCount = { state: string; count: number };

export function aggregateLeadsByState(leads: Lead[]): StateCount[] {
  const map = new Map<string, number>();
  for (const l of leads) {
    const s = (l.state || "?").toUpperCase();
    map.set(s, (map.get(s) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateIndustry(leads: Lead[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of leads) {
    const label = (l.industry_detected || l.industry || "Unknown").trim() || "Unknown";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
