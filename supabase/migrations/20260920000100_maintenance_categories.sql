-- ============================================================
-- Velocewealth · three more maintenance categories
--   belt    — timing belt / chain (and the wet belt on small Fords/PSA)
--   fluid   — brake fluid (2-year item everyone forgets)
--   gearbox — automatic / DSG / CVT oil
-- Needed by the per-model manufacturer schedules (lib/maintenance/schedules).
-- ============================================================

alter table public.maintenance_entries drop constraint if exists maintenance_entries_category_check;
alter table public.maintenance_entries add constraint maintenance_entries_category_check
  check (category in ('oil','tires','brakes','filter','battery','inspection','belt','fluid','gearbox','other'));

alter table public.maintenance_tasks drop constraint if exists maintenance_tasks_category_check;
alter table public.maintenance_tasks add constraint maintenance_tasks_category_check
  check (category in ('oil','tires','brakes','filter','battery','inspection','belt','fluid','gearbox','other'));
