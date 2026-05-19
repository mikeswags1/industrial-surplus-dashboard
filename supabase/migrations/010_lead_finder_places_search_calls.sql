-- Track billable-ish Google Places Text Search usage per Lead Finder run (one request per combo).
alter table public.lead_finder_runs
  add column if not exists places_text_search_calls integer;

comment on column public.lead_finder_runs.places_text_search_calls is
  'Places API Text Search (New) requests for this run; equals category × state × city-slot combinations executed.';
