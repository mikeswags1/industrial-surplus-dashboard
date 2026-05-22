-- Allow one-click unsubscribe events in outreach logs.

alter table public.outreach_logs
  drop constraint if exists outreach_logs_event_type_check;

alter table public.outreach_logs
  add constraint outreach_logs_event_type_check check (
    event_type in ('send', 'reply', 'bounce', 'open', 'click', 'complaint', 'unsubscribe')
  );
