import { NextResponse } from "next/server";
import {
  getGooglePlacesConfig,
  isOpenAiConfigured,
  isSupabaseServerConfigured,
} from "@/lib/env/server";

export async function GET() {
  return NextResponse.json({
    dataLayer: isSupabaseServerConfigured() ? "supabase" : "unconfigured",
    googlePlaces: getGooglePlacesConfig() ? "ok" : "missing",
    openai: isOpenAiConfigured() ? "ok" : "missing",
  });
}
