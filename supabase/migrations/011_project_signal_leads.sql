-- Project Signal Lead Finder foundation (permits/news feeds come later)
-- Run after 010_lead_finder_places_search_calls.sql

create table if not exists public.project_signal_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.organizations (id) on delete cascade,
  project_name text not null,
  project_type text not null,
  source_type text not null,
  location text,
  state text,
  contact_name text,
  contact_email text,
  phone text,
  website text,
  source_url text,
  project_status text not null default 'Unknown',
  estimated_value numeric,
  estimated_start_date date,
  estimated_completion_date date,
  equipment_opportunity text,
  confidence_score integer not null default 0,
  lead_score integer not null default 0,
  reason_flagged text,
  notes text,
  lead_status text not null default 'New',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_signal_leads_confidence_check
    check (confidence_score between 0 and 100),
  constraint project_signal_leads_lead_score_check
    check (lead_score between 0 and 100),
  constraint project_signal_leads_source_type_check check (
    source_type in (
      'manual',
      'csv_import',
      'demo',
      'construction_permit',
      'planning_board',
      'zoning',
      'news',
      'contractor_page',
      'utility_filing',
      'job_post',
      'company_announcement'
    )
  ),
  constraint project_signal_leads_lead_status_check check (
    lead_status in ('New', 'Contacted', 'Interested', 'Follow Up Later', 'Not Interested')
  ),
  constraint project_signal_leads_project_status_check check (
    project_status in (
      'Planned',
      'Permitted',
      'Under construction',
      'Near completion',
      'Completed',
      'Shutdown announced',
      'Unknown'
    )
  ),
  constraint project_signal_leads_real_source_check check (
    is_demo = true
    or source_type in ('manual', 'csv_import', 'demo')
    or (source_url is not null and trim(source_url) <> '')
  )
);

create index if not exists project_signal_leads_org_created_idx
  on public.project_signal_leads (organization_id, created_at desc);

create index if not exists project_signal_leads_org_state_idx
  on public.project_signal_leads (organization_id, state);

create index if not exists project_signal_leads_org_project_type_idx
  on public.project_signal_leads (organization_id, project_type);

create index if not exists project_signal_leads_org_source_type_idx
  on public.project_signal_leads (organization_id, source_type);

create index if not exists project_signal_leads_org_lead_status_idx
  on public.project_signal_leads (organization_id, lead_status);

create index if not exists project_signal_leads_org_lead_score_idx
  on public.project_signal_leads (organization_id, lead_score desc);

drop trigger if exists project_signal_leads_set_updated_at on public.project_signal_leads;
create trigger project_signal_leads_set_updated_at
before update on public.project_signal_leads
for each row execute function public.set_updated_at();

alter table public.project_signal_leads enable row level security;

drop policy if exists "project_signal_leads_authenticated" on public.project_signal_leads;
create policy "project_signal_leads_authenticated"
on public.project_signal_leads for all
to authenticated
using (true)
with check (true);

comment on table public.project_signal_leads is
  'Project-based surplus signals (construction, shutdowns, upgrades) — not Google Maps POI leads.';
