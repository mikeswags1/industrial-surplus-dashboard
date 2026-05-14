-- Leads: store Lead Finder preset + likely assets for a clear Leads table (no parsing notes)

alter table public.leads
  add column if not exists target_industry text,
  add column if not exists likely_asset_types text[] not null default '{}';

comment on column public.leads.target_industry is 'Lead Finder preset category (surplus holder target)';
comment on column public.leads.likely_asset_types is 'Likely surplus asset categories from Lead Finder scoring';
