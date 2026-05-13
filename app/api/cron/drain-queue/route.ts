import { NextResponse } from "next/server";
import { processCampaignQueueOnce } from "@/lib/outbound/process-queue";

/** Vercel Cron: set CRON_SECRET and Authorization: Bearer <secret> */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await processCampaignQueueOnce(8);
  return NextResponse.json(result);
}
