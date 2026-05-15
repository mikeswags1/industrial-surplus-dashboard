/** Internal token: one “virtual” city so category × state × city math stays 1 per state. */
export const LEAD_FINDER_STATEWIDE_CITY = "__LF_STATEWIDE__" as const;

export function isLeadFinderStatewideCity(city: string): boolean {
  return city.trim() === LEAD_FINDER_STATEWIDE_CITY;
}

export type LeadFinderCityMode = "statewide" | "specific";
