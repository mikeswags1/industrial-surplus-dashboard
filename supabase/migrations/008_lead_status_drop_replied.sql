-- Remove "Replied" pipeline status; responses live in Gmail, not this dashboard.

update public.leads
set status = 'Contacted'
where status = 'Replied';

alter table public.leads drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check check (
    status in (
      'New',
      'Contacted',
      'Interested',
      'Quote Needed',
      'Deal Won',
      'Not Interested',
      'Follow Up Later'
    )
  );
