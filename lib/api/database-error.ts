import { NextResponse } from "next/server";

export function isDatabaseNotConfiguredError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("DATABASE_NOT_CONFIGURED");
}

/** 503 — safe to expose to clients; no secrets. */
export function jsonDatabaseNotConfigured(err: unknown) {
  const detail =
    err instanceof Error
      ? err.message.replace(/^DATABASE_NOT_CONFIGURED:\s*/, "").trim() ||
        "Supabase server environment is not configured."
      : "unknown";
  return NextResponse.json(
    {
      error: "unconfigured",
      code: "DATABASE_NOT_CONFIGURED",
      message: detail,
    },
    { status: 503 }
  );
}
