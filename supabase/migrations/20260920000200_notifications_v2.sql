-- ============================================================
-- Velocewealth · notifications v2
--   • real, persisted notification preferences on the profile
--   • dedupe key so daily crons never send the same reminder twice
--   • new kinds for forecast / inspection / insurance / welcome
-- ============================================================

alter table public.profiles
  add column if not exists notification_prefs jsonb not null
    default '{"email": true, "forecast": true, "inspection": true, "insurance": true, "fuel": true}'::jsonb;

comment on column public.profiles.notification_prefs is
  'User-controlled switches read by the reminder crons. Keys: email (channel), forecast, inspection, insurance, fuel (topics).';

alter table public.in_app_notifications
  add column if not exists dedupe_key text;

create unique index if not exists in_app_notifications_dedupe_idx
  on public.in_app_notifications (user_id, dedupe_key)
  where dedupe_key is not null;

-- Postgres cannot add enum values inside a transaction block on some
-- versions; `if not exists` keeps re-runs safe.
alter type public.in_app_notification_kind add value if not exists 'forecast_due';
alter type public.in_app_notification_kind add value if not exists 'inspection_due';
alter type public.in_app_notification_kind add value if not exists 'insurance_renewal';
alter type public.in_app_notification_kind add value if not exists 'welcome';
