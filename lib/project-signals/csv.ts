import {
  PROJECT_SIGNAL_LEAD_STATUSES,
  PROJECT_SIGNAL_PROJECT_STATUSES,
  PROJECT_SIGNAL_SOURCE_TYPES,
  PROJECT_SIGNAL_TYPES,
  type ProjectSignalSourceType,
} from "@/lib/project-signals/constants";
import type { ProjectSignalLeadInput } from "@/lib/project-signals/types";
import { US_STATES } from "@/lib/types";

export const CSV_PROJECT_SIGNAL_HEADERS = [
  "project_name",
  "project_type",
  "source_type",
  "location",
  "state",
  "contact_name",
  "contact_email",
  "phone",
  "website",
  "source_url",
  "project_status",
  "estimated_value",
  "estimated_start_date",
  "estimated_completion_date",
  "equipment_opportunity",
  "notes",
  "lead_status",
  "is_demo",
] as const;

export type CsvProjectSignalRow = Partial<
  Record<(typeof CSV_PROJECT_SIGNAL_HEADERS)[number], string>
>;

export type ParsedProjectSignalCsv = {
  rows: CsvProjectSignalRow[];
  errors: { line: number; message: string }[];
};

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

export function parseProjectSignalCsv(text: string): ParsedProjectSignalCsv {
  const errors: ParsedProjectSignalCsv["errors"] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    errors.push({ line: 0, message: "Empty file" });
    return { rows: [], errors };
  }

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    idx[h] = i;
  });

  const required = ["project_name", "project_type", "source_type"] as const;
  const missing = required.filter((h) => idx[h] === undefined);
  if (missing.length) {
    errors.push({
      line: 1,
      message: `Missing columns: ${missing.join(", ")}. Required: ${required.join(", ")}`,
    });
    return { rows: [], errors };
  }

  const rows: CsvProjectSignalRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    const row: CsvProjectSignalRow = {};
    for (const key of CSV_PROJECT_SIGNAL_HEADERS) {
      if (idx[key] !== undefined) {
        row[key] = cells[idx[key]]?.trim() ?? "";
      }
    }
    rows.push(row);
  }
  return { rows, errors };
}

function parseBool(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "demo";
}

function parseNumber(raw: string | undefined): number | null {
  const v = (raw ?? "").trim().replace(/[$,]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function validateProjectSignalSource(
  input: Pick<ProjectSignalLeadInput, "source_type" | "source_url" | "is_demo">
): string | null {
  if (input.is_demo) return null;
  if (input.source_type === "manual" || input.source_type === "csv_import") return null;
  const url = input.source_url?.trim();
  if (url) return null;
  return "Real signals need a source URL, or use source type Manual / CSV import.";
}

export function csvRowToProjectSignalInput(
  row: CsvProjectSignalRow
):
  | { ok: true; value: Omit<ProjectSignalLeadInput, "confidence_score" | "lead_score" | "reason_flagged"> }
  | { ok: false; message: string } {
  const project_name = row.project_name?.trim() ?? "";
  if (!project_name) return { ok: false, message: "project_name required" };

  const project_type = row.project_type?.trim() ?? "";
  if (!project_type) return { ok: false, message: "project_type required" };

  const source_typeRaw = (row.source_type?.trim() ?? "csv_import").toLowerCase();
  if (!PROJECT_SIGNAL_SOURCE_TYPES.includes(source_typeRaw as ProjectSignalSourceType)) {
    return { ok: false, message: `Invalid source_type: ${source_typeRaw}` };
  }
  const source_type = source_typeRaw as ProjectSignalSourceType;

  const state = row.state?.trim().toUpperCase() ?? "";
  if (state && !US_STATES.includes(state as (typeof US_STATES)[number])) {
    return { ok: false, message: `Invalid state: ${state}` };
  }

  const lead_statusRaw = row.lead_status?.trim() || "New";
  if (!PROJECT_SIGNAL_LEAD_STATUSES.includes(lead_statusRaw as (typeof PROJECT_SIGNAL_LEAD_STATUSES)[number])) {
    return { ok: false, message: `Invalid lead_status: ${lead_statusRaw}` };
  }

  const project_statusRaw = row.project_status?.trim() || "Unknown";
  if (
    !PROJECT_SIGNAL_PROJECT_STATUSES.includes(
      project_statusRaw as (typeof PROJECT_SIGNAL_PROJECT_STATUSES)[number]
    )
  ) {
    return { ok: false, message: `Invalid project_status: ${project_statusRaw}` };
  }

  if (!PROJECT_SIGNAL_TYPES.includes(project_type as (typeof PROJECT_SIGNAL_TYPES)[number])) {
    // Allow custom types in CSV with a warning path — still store string
  }

  const is_demo = parseBool(row.is_demo);
  const input = {
    project_name,
    project_type,
    source_type: is_demo ? ("demo" as const) : source_type === "demo" ? "demo" : source_type,
    location: row.location?.trim() ?? "",
    state,
    contact_name: row.contact_name?.trim() ?? "",
    contact_email: row.contact_email?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    website: row.website?.trim() ?? "",
    source_url: row.source_url?.trim() ?? "",
    project_status: project_statusRaw,
    estimated_value: parseNumber(row.estimated_value),
    estimated_start_date: parseDate(row.estimated_start_date),
    estimated_completion_date: parseDate(row.estimated_completion_date),
    equipment_opportunity: row.equipment_opportunity?.trim() ?? "",
    notes: row.notes?.trim() ?? "",
    lead_status: lead_statusRaw as (typeof PROJECT_SIGNAL_LEAD_STATUSES)[number],
    is_demo,
  };

  const sourceErr = validateProjectSignalSource(input);
  if (sourceErr) return { ok: false, message: sourceErr };

  return { ok: true, value: input };
}

export function projectSignalsToCsv(rows: Record<string, unknown>[]): string {
  const header = CSV_PROJECT_SIGNAL_HEADERS.join(",");
  const lines = rows.map((r) =>
    CSV_PROJECT_SIGNAL_HEADERS.map((h) => escapeCsv(String(r[h] ?? ""))).join(",")
  );
  return [header, ...lines].join("\r\n");
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
