import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/env/server";

export async function GET() {
  return NextResponse.json({
    dataLayer: isSupabaseServerConfigured() ? "supabase" : "unconfigured",
  });
}
