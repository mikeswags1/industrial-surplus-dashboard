import type { SupabaseClient } from "@supabase/supabase-js";
import { queryExistingDedupeKeys } from "@/lib/repositories/leads.repository";
import { csvRowToLeadInput, normalizeDedupeKey, parseLeadCsv } from "@/lib/leads/csv";

export type ImportPreviewRow = {
  line: number;
  outcome: "insert" | "skip_duplicate" | "invalid";
  message?: string;
  company_name?: string;
  email?: string;
};

export type LeadImportPreviewResult = {
  parseErrors: { line: number; message: string }[];
  rows: ImportPreviewRow[];
  summary: {
    totalDataRows: number;
    insert: number;
    skip_duplicate: number;
    invalid: number;
  };
};

export async function buildLeadImportPreview(
  admin: SupabaseClient,
  csvText: string,
  tag: string
): Promise<LeadImportPreviewResult> {
  const parsed = parseLeadCsv(csvText);
  if (parsed.errors.length) {
    return {
      parseErrors: parsed.errors,
      rows: [],
      summary: { totalDataRows: 0, insert: 0, skip_duplicate: 0, invalid: 0 },
    };
  }

  const existing = await queryExistingDedupeKeys(admin);
  const seen = new Set(existing);

  const rows: ImportPreviewRow[] = [];
  let insert = 0;
  let skip_duplicate = 0;
  let invalid = 0;

  for (let i = 0; i < parsed.rows.length; i++) {
    const line = i + 2;
    const conv = csvRowToLeadInput(parsed.rows[i], tag);
    if (!conv.ok) {
      invalid++;
      rows.push({ line, outcome: "invalid", message: conv.message });
      continue;
    }
    const key = normalizeDedupeKey(conv.value.email, conv.value.company_name);
    if (seen.has(key)) {
      skip_duplicate++;
      rows.push({
        line,
        outcome: "skip_duplicate",
        company_name: conv.value.company_name,
        email: conv.value.email,
      });
      continue;
    }
    seen.add(key);
    insert++;
    rows.push({
      line,
      outcome: "insert",
      company_name: conv.value.company_name,
      email: conv.value.email,
    });
  }

  return {
    parseErrors: [],
    rows,
    summary: {
      totalDataRows: parsed.rows.length,
      insert,
      skip_duplicate,
      invalid,
    },
  };
}
