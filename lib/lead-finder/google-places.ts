import { getGooglePlacesConfig } from "@/lib/env/server";
import { displayNameForUsState } from "@/lib/geo/us-state-names";
import type { LeadFinderPlaceQuery, ProviderCandidate } from "@/lib/lead-finder/types";
import { presetForTargetIndustryLabel } from "@/lib/lead-finder/target-industries";
import type { LeadFinderPlaceQuery, ProviderCandidate } from "@/lib/lead-finder/types";

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.types",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
].join(",");

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
  error?: { message?: string; status?: string };
};

export class GooglePlacesNotConfiguredError extends Error {
  constructor() {
    super("GOOGLE_PLACES_NOT_CONFIGURED");
  }
}

export function isGooglePlacesNotConfiguredError(err: unknown): boolean {
  return err instanceof GooglePlacesNotConfiguredError;
}

function guessCityFromFormattedAddress(formatted?: string): string {
  if (!formatted) return "";
  const parts = formatted.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2] ?? "";
  }
  return "";
}

function buildTextQuery(input: LeadFinderPlaceQuery) {
  const preset = presetForTargetIndustryLabel(input.target_industry);
  const phrase = preset?.placesQueryPhrase ?? input.target_industry.trim();
  const stateAbbrev = input.state.trim().toUpperCase();
  const stateName = displayNameForUsState(stateAbbrev);

  if (isLeadFinderStatewideCity(input.city)) {
    return `${phrase} in ${stateName}`;
  }

  const city = input.city.trim();
  return `${phrase} in ${city}, ${stateAbbrev}`;
}

function normalizePlace(
  place: GooglePlace,
  input: LeadFinderPlaceQuery
): ProviderCandidate | null {
  const company = place.displayName?.text?.trim();
  if (!company) return null;

  const stateAbbrev = input.state.trim().toUpperCase();
  const cityFromGoogle = guessCityFromFormattedAddress(place.formattedAddress);
  const cityField = isLeadFinderStatewideCity(input.city)
    ? cityFromGoogle || stateAbbrev
    : input.city.trim();

  return {
    provider: "google_places",
    provider_place_id: place.id ?? null,
    company_name: company,
    website: place.websiteUri?.trim() ?? "",
    phone: place.nationalPhoneNumber?.trim() ?? "",
    email: "",
    city: cityField,
    state: stateAbbrev,
    formatted_address: place.formattedAddress?.trim() ?? "",
    industry:
      place.primaryTypeDisplayName?.text?.trim() ||
      place.types?.slice(0, 3).join(", ") ||
      input.target_industry.trim(),
    source_url: place.googleMapsUri?.trim() ?? "",
    raw_provider: place as Record<string, unknown>,
  };
}

export async function searchGooglePlaces(
  input: LeadFinderPlaceQuery
): Promise<ProviderCandidate[]> {
  const cfg = getGooglePlacesConfig();
  if (!cfg) throw new GooglePlacesNotConfiguredError();

  const pageSize = Math.min(Math.max(input.count, 1), 20);
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": cfg.apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: buildTextQuery(input),
      pageSize,
      languageCode: "en",
      regionCode: "US",
    }),
  });

  const json = (await response.json().catch(() => ({}))) as GooglePlacesResponse;
  if (!response.ok) {
    const msg = json.error?.message ?? `Google Places request failed (${response.status})`;
    throw new Error(msg);
  }

  return (json.places ?? [])
    .map((place) => normalizePlace(place, input))
    .filter((place): place is ProviderCandidate => Boolean(place))
    .slice(0, pageSize);
}
