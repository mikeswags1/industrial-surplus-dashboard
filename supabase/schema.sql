-- Industrial Surplus Dashboard — core tables
-- Run in Supabase SQL editor or via migrations.

create extension if not exists "pgcrypto";

-- Lead lifecycle statuses (application validates; DB uses text + check)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  industry text,
  state text,
  city text,
  lead_source text default 'Manual',
  equipment_type text,
  estimated_value numeric,
  status text not null default 'New',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check check (
    status in (
      'New',
      'Contacted',
      'Interested',
      'Quote Needed',
      'Deal Won',
      'Not Interested',
      'Follow Up Later'
    )
  )
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment_type text not null,
  region text not null,
  primary_subject text not null,
  primary_body text not null,
  follow_up_1 text,
  follow_up_2 text,
  status text not null default 'draft',
  emails_sent integer not null default 0,
  replies_count integer not null default 0,
  interested_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_status_check check (
    status in ('draft', 'active', 'paused', 'completed')
  )
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.campaigns enable row level security;

drop policy if exists "leads_all_authenticated" on public.leads;
drop policy if exists "campaigns_all_authenticated" on public.campaigns;

-- MVP: authenticated users full access (tighten per role when auth ships)
create policy "leads_all_authenticated"
on public.leads for all
to authenticated
using (true)
with check (true);

create policy "campaigns_all_authenticated"
on public.campaigns for all
to authenticated
using (true)
with check (true);

-- Optional: service role bypasses RLS for server-side jobs

comment on table public.leads is 'Prospect companies for industrial surplus outreach';
comment on table public.campaigns is 'Cold email campaign drafts and aggregate send stats';
