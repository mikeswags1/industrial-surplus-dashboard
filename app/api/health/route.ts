import { NextResponse } from "next/server";
import { getServerHealthSnapshot } from "@/lib/env/server";

export async function GET() {
  const snapshot = getServerHealthSnapshot();
  return NextResponse.json({
    ok: snapshot.supabase === "ok",
    ...snapshot,
  });
}
