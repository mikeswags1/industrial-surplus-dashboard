-- Phase 2: outbound platform tables + lead enrichment columns
-- Run after schema.sql in Supabase SQL editor.

-- Default org for single-tenant MVP (multi-client prep)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Default workspace')
on conflict (id) do nothing;

alter table public.leads
  add column if not exists organization_id uuid references public.organizations (id) default '00000000-0000-4000-8000-000000000001',
  add column if not exists tags text[] not null default '{}',
  add column if not exists company_summary text,
  add column if not exists industry_detected text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists enrichment_at timestamptz;

alter table public.campaigns
  add column if not exists organization_id uuid references public.organizations (id) default '00000000-0000-4000-8000-000000000001';

-- Email + webhook events (sends, opens, bounces; replies also logged here)
create table if not exists public.outreach_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.organizations (id),
  lead_id uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  event_type text not null,
  provider text not null default 'resend',
  provider_message_id text,
  to_email text,
  from_email text,
  subject text,
  body_preview text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint outreach_logs_event_type_check check (
    event_type in ('send', 'reply', 'bounce', 'open', 'click', 'complaint')
  )
);

create index if not exists outreach_logs_lead_id_idx on public.outreach_logs (lead_id);
create index if not exists outreach_logs_campaign_id_idx on public.outreach_logs (campaign_id);
create index if not exists outreach_logs_created_at_idx on public.outreach_logs (created_at desc);

-- Inbound reply rows (Resend inbound webhook can populate)
create table if not exists public.inbound_replies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.organizations (id),
  lead_id uuid references public.leads (id) on delete set null,
  outreach_log_id uuid references public.outreach_logs (id) on delete set null,
  subject text,
  snippet text,
  received_at timestamptz not null default now(),
  raw_headers jsonb not null default '{}'
);

-- Campaign → lead send queue (cron / worker processes pending rows)
create table if not exists public.campaign_send_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.organizations (id),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  step smallint not null default 0,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_send_queue_status_check check (
    status in ('pending', 'processing', 'sent', 'failed', 'cancelled')
  ),
  constraint campaign_send_queue_step_unique unique (campaign_id, lead_id, step)
);

drop trigger if exists campaign_send_queue_set_updated_at on public.campaign_send_queue;
create trigger campaign_send_queue_set_updated_at
before update on public.campaign_send_queue
for each row execute function public.set_updated_at();

-- Profiles (Supabase Auth user ↔ workspace) — optional until Auth UI ships
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.organizations (id),
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.outreach_logs enable row level security;
alter table public.inbound_replies enable row level security;
alter table public.campaign_send_queue enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;

drop policy if exists "outreach_logs_authenticated" on public.outreach_logs;
create policy "outreach_logs_authenticated"
on public.outreach_logs for all
to authenticated
using (true)
with check (true);

drop policy if exists "inbound_replies_authenticated" on public.inbound_replies;
create policy "inbound_replies_authenticated"
on public.inbound_replies for all
to authenticated
using (true)
with check (true);

drop policy if exists "campaign_send_queue_authenticated" on public.campaign_send_queue;
create policy "campaign_send_queue_authenticated"
on public.campaign_send_queue for all
to authenticated
using (true)
with check (true);

drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self"
on public.profiles for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "organizations_read" on public.organizations;
create policy "organizations_read"
on public.organizations for select
to authenticated
using (true);

comment on table public.outreach_logs is 'Outbound email events and webhook-derived states';
comment on table public.campaign_send_queue is 'Durable queue for campaign sequences (worker/cron)';
comment on table public.inbound_replies is 'Parsed inbound email replies linked to leads';
