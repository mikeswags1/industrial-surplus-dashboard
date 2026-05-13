import { EQUIPMENT_TYPES, LEAD_STATUSES, US_STATES } from "@/lib/types";
import type { Lead, LeadStatus } from "@/lib/types";

export const CSV_LEAD_HEADERS = [
  "company_name",
  "contact_name",
  "email",
  "phone",
  "website",
  "industry",
  "state",
  "city",
  "equipment_type",
  "estimated_value",
  "status",
  "notes",
  "lead_source",
] as const;

export type CsvLeadRow = Partial<Record<(typeof CSV_LEAD_HEADERS)[number], string>>;

export type ParsedCsvResult = {
  rows: CsvLeadRow[];
  errors: { line: number; message: string }[];
};

/** Minimal RFC-style CSV: comma-separated, double-quote escapes. */
export function parseLeadCsv(text: string): ParsedCsvResult {
  const errors: ParsedCsvResult["errors"] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    errors.push({ line: 0, message: "Empty file" });
    return { rows: [], errors };
  }

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );

  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    idx[h] = i;
  });

  const missing = CSV_LEAD_HEADERS.filter((h) => idx[h] === undefined);
  if (missing.length) {
    errors.push({
      line: 1,
      message: `Missing columns: ${missing.join(", ")}. Required: ${CSV_LEAD_HEADERS.join(", ")}`,
    });
    return { rows: [], errors };
  }

  const rows: CsvLeadRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    const cells = splitCsvLine(line);
    const row: CsvLeadRow = {};
    for (const key of CSV_LEAD_HEADERS) {
      const v = cells[idx[key]]?.trim() ?? "";
      row[key] = v;
    }
    rows.push(row);
  }

  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && inQuotes && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

export function csvRowToLeadInput(
  row: CsvLeadRow,
  importTag: string
): { ok: true; value: Omit<Lead, "id" | "created_at" | "updated_at"> } | { ok: false; message: string } {
  const company_name = row.company_name?.trim() ?? "";
  if (!company_name) return { ok: false, message: "company_name required" };

  const email = row.email?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "valid email required" };
  }

  const state = (row.state?.trim().toUpperCase() ?? "") as string;
  if (state && !(US_STATES as readonly string[]).includes(state)) {
    return { ok: false, message: `invalid state: ${state}` };
  }

  const equipment = row.equipment_type?.trim() ?? "Mixed / other";
  if (!(EQUIPMENT_TYPES as readonly string[]).includes(equipment)) {
    return { ok: false, message: `invalid equipment_type: ${equipment}` };
  }

  const statusRaw = row.status?.trim() ?? "New";
  const status = (LEAD_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as LeadStatus)
    : "New";

  let estimated_value: number | null = null;
  if (row.estimated_value?.trim()) {
    const n = Number(row.estimated_value.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n) || n < 0) return { ok: false, message: "invalid estimated_value" };
    estimated_value = n;
  }

  return {
    ok: true,
    value: {
      company_name,
      contact_name: row.contact_name?.trim() ?? "",
      email,
      phone: row.phone?.trim() ?? "",
      website: row.website?.trim() ?? "",
      industry: row.industry?.trim() ?? "",
      state: state || "TX",
      city: row.city?.trim() ?? "",
      lead_source: row.lead_source?.trim() || "CSV Import",
      equipment_type: equipment,
      estimated_value,
      status,
      notes: row.notes?.trim() ?? "",
      tags: ["csv", importTag],
    },
  };
}

export function normalizeDedupeKey(email: string, company: string) {
  return `${email.trim().toLowerCase()}|${company.trim().toLowerCase()}`;
}
