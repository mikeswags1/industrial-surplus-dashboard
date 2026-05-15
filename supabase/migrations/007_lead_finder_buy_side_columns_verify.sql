-- Idempotent safety net: adds buy-side Lead Finder columns when 005 was skipped in Supabase.
-- Fixes: "Could not find the 'asset_likelihood_score' column of 'lead_finder_candidates' in the schema cache"

alter table public.lead_finder_candidates
  add column if not exists target_industry text,
  add column if not exists asset_likelihood_score integer,
  add column if not exists likely_asset_types text[] not null default '{}',
  add column if not exists outreach_angle text,
  add column if not exists reason_selected text;

update public.lead_finder_candidates c
set asset_likelihood_score = coalesce(c.asset_likelihood_score, c.score),
    reason_selected = coalesce(c.reason_selected, c.score_explanation)
where c.asset_likelihood_score is null and c.score is not null;

update public.lead_finder_candidates c
set target_industry = lr.industry
from public.lead_finder_runs lr
where c.run_id = lr.id and c.target_industry is null and lr.industry is not null;

create index if not exists lead_finder_candidates_run_asset_score_idx
  on public.lead_finder_candidates (run_id, asset_likelihood_score desc nulls last);

comment on column public.lead_finder_candidates.target_industry is 'Preset search category label (potential asset holder)';
comment on column public.lead_finder_candidates.asset_likelihood_score is '0-100 likelihood of owning excess industrial/scrap assets';
comment on column public.lead_finder_candidates.likely_asset_types is 'Estimated asset categories (scrap, electrical, machinery, etc.)';
comment on column public.lead_finder_candidates.outreach_angle is 'Suggested opener for buy/remove/recycle outreach';
comment on column public.lead_finder_candidates.reason_selected is 'Evidence-based rationale; no fabricated facts';
