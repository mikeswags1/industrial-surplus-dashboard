import type { ProjectSignalType } from "@/lib/project-signals/constants";

export type NewsDiscoveryQuery = {
  /** Google News RSS search phrase */
  q: string;
  project_type: ProjectSignalType;
  equipment_opportunity: string;
};

/** Curated searches — each maps to a surplus-relevant project signal type. */
export const NEWS_DISCOVERY_QUERIES: NewsDiscoveryQuery[] = [
  {
    q: "data center construction groundbreaking",
    project_type: "Data center construction",
    equipment_opportunity: "Switchgear, transformers, generators, wire & cable",
  },
  {
    q: "hyperscale AI data center campus",
    project_type: "AI / cloud / hyperscale campus",
    equipment_opportunity: "Switchgear, transformers, electrical equipment",
  },
  {
    q: "factory shutdown manufacturing plant",
    project_type: "Factory shutdown",
    equipment_opportunity: "Industrial machinery, scrap metal, asset removal",
  },
  {
    q: "plant closure industrial facility",
    project_type: "Plant closure",
    equipment_opportunity: "Industrial machinery, MCCs, scrap metal",
  },
  {
    q: "industrial demolition project",
    project_type: "Demolition project",
    equipment_opportunity: "Scrap metal, heavy equipment, asset removal",
  },
  {
    q: "utility substation upgrade transmission",
    project_type: "Utility upgrade",
    equipment_opportunity: "Transformers, switchgear, breakers",
  },
  {
    q: "manufacturing plant expansion construction",
    project_type: "Manufacturing expansion",
    equipment_opportunity: "Industrial machinery, electrical surplus",
  },
  {
    q: "industrial facility relocation",
    project_type: "Industrial relocation",
    equipment_opportunity: "Industrial machinery, warehouse surplus",
  },
  {
    q: "electrical contractor substation industrial project",
    project_type: "Electrical contractor project",
    equipment_opportunity: "Switchgear, breakers, wire & cable",
  },
  {
    q: "equipment replacement plant upgrade industrial",
    project_type: "Equipment replacement",
    equipment_opportunity: "Electrical equipment, industrial machinery",
  },
];

export const DISCOVERY_MAX_ITEMS_PER_QUERY = 6;
export const DISCOVERY_MAX_INSERTS_PER_RUN = 35;
