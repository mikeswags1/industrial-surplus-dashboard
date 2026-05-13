-- Phase 1 production: inboxes, lead notes timeline, tasks, query indexes
-- Run after 002_outbound_platform.sql

-- Sending identities (multi-domain / multi-inbox prep)
create table if not exists public.inboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.organizations (id) on delete cascade,
  display_name text not null,
  domain text not null,
  from_email text not null,
  reply_to_email text,
  resend_domain_id text,
  status text not null default 'pending',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint inboxes_status_check check (status in ('pending', 'active', 'suspended'))
);

create unique index if not exists inboxes_one_default_per_org
  on public.inboxes (organization_id)
  where is_default = true;

create index if not exists inboxes_org_idx on public.inboxes (organization_id);

-- Timeline notes (separate from leads.notes scratch field)
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_created_idx
  on public.lead_notes (lead_id, created_at desc);

-- Follow-ups / internal work queue
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('open', 'done', 'cancelled'))
);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create index if not exists tasks_org_due_idx on public.tasks (organization_id, due_at);
create index if not exists tasks_lead_idx on public.tasks (lead_id);

-- Scale: common filters (50 states × thousands of leads)
create index if not exists leads_org_state_idx on public.leads (organization_id, state);
create index if not exists leads_org_city_idx on public.leads (organization_id, city);
create index if not exists leads_org_equipment_idx on public.leads (organization_id, equipment_type);
create index if not exists leads_org_status_idx on public.leads (organization_id, status);
create index if not exists leads_org_industry_idx on public.leads (organization_id, industry);
create index if not exists leads_email_lower_idx on public.leads (lower(trim(email)))
  where email is not null and trim(email) <> '';

alter table public.inboxes enable row level security;
alter table public.lead_notes enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "inboxes_authenticated" on public.inboxes;
create policy "inboxes_authenticated"
on public.inboxes for all
to authenticated
using (true)
with check (true);

drop policy if exists "lead_notes_authenticated" on public.lead_notes;
create policy "lead_notes_authenticated"
on public.lead_notes for all
to authenticated
using (true)
with check (true);

drop policy if exists "tasks_authenticated" on public.tasks;
create policy "tasks_authenticated"
on public.tasks for all
to authenticated
using (true)
with check (true);

comment on table public.inboxes is 'Outbound sending identities; maps to Resend domains per org';
comment on table public.lead_notes is 'CRM-style timeline entries per lead';
comment on table public.tasks is 'Tasks / follow-ups tied to leads or campaigns';
