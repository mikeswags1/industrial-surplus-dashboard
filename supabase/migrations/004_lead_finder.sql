-- Phase 2: real-source AI lead finder
-- Run after 003_production_core.sql

create table if not exists public.lead_finder_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.organizations (id) on delete cascade,
  provider text not null default 'google_places',
  status text not null default 'running',
  state text not null,
  city text not null,
  industry text not null,
  equipment_type text not null,
  requested_count integer not null default 10,
  result_count integer not null default 0,
  approved_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint lead_finder_runs_provider_check check (provider in ('google_places')),
  constraint lead_finder_runs_status_check check (status in ('running', 'completed', 'failed')),
  constraint lead_finder_runs_requested_count_check check (requested_count between 1 and 50)
);

create table if not exists public.lead_finder_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.organizations (id) on delete cascade,
  run_id uuid not null references public.lead_finder_runs (id) on delete cascade,
  provider text not null default 'google_places',
  provider_place_id text,
  company_name text not null,
  website text,
  phone text,
  email text,
  city text,
  state text,
  formatted_address text,
  industry text,
  source_url text,
  raw_provider jsonb not null default '{}',
  enrichment_summary text,
  enrichment_source_url text,
  keywords text[] not null default '{}',
  score integer,
  score_source text not null default 'unscored',
  score_explanation text,
  status text not null default 'preview',
  lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lead_finder_candidates_provider_check check (provider in ('google_places')),
  constraint lead_finder_candidates_score_check check (score is null or score between 0 and 100),
  constraint lead_finder_candidates_score_source_check check (score_source in ('ai', 'heuristic', 'unscored')),
  constraint lead_finder_candidates_status_check check (status in ('preview', 'approved', 'rejected', 'duplicate', 'error'))
);

create unique index if not exists lead_finder_candidates_run_place_unique
  on public.lead_finder_candidates (run_id, provider_place_id)
  where provider_place_id is not null;

create index if not exists lead_finder_runs_created_idx
  on public.lead_finder_runs (created_at desc);

create index if not exists lead_finder_candidates_run_score_idx
  on public.lead_finder_candidates (run_id, score desc nulls last);

create index if not exists lead_finder_candidates_status_idx
  on public.lead_finder_candidates (status);

alter table public.lead_finder_runs enable row level security;
alter table public.lead_finder_candidates enable row level security;

drop policy if exists "lead_finder_runs_authenticated" on public.lead_finder_runs;
create policy "lead_finder_runs_authenticated"
on public.lead_finder_runs for all
to authenticated
using (true)
with check (true);

drop policy if exists "lead_finder_candidates_authenticated" on public.lead_finder_candidates;
create policy "lead_finder_candidates_authenticated"
on public.lead_finder_candidates for all
to authenticated
using (true)
with check (true);

comment on table public.lead_finder_runs is 'Auditable provider searches for real-source lead discovery';
comment on table public.lead_finder_candidates is 'Real provider candidates scored for fit before approval into leads';
