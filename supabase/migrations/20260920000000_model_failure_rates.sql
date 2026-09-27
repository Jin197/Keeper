-- ============================================================
-- Velocewealth · model_failure_rates
-- Population statistics from the DVSA anonymised MOT dataset, built by
-- scripts/dvsa/build-failure-rates.mjs. Read-only for the app; written by
-- the service role from the pipeline.
--
-- One row per (make, model family, age band | 'ALL', mileage band, system).
--   system = 'any'  → overall test failure rate for the cell
--   make/model = '*' → fleet-wide baseline
-- ============================================================

create table if not exists public.model_failure_rates (
  id bigint generated always as identity primary key,
  make text not null,
  model text not null,
  age_band text not null,          -- '3-5' | '6-8' | '9-11' | '12-14' | '15+' | 'ALL'
  km_band text not null,           -- '0-20k' … '220-240k' | '240k+'
  system text not null,            -- brakes, suspension, tyres, steering, lamps, emissions, body, visibility, seatbelts, wheels, other, any
  tests integer not null,
  failures integer not null,
  advisories integer not null default 0,
  fail_rate numeric(6,4) not null,
  source_years text,
  computed_at timestamptz not null default now(),
  unique (make, model, age_band, km_band, system)
);

create index if not exists model_failure_rates_lookup_idx
  on public.model_failure_rates (make, model, km_band, age_band);

alter table public.model_failure_rates enable row level security;

-- Public statistics: any signed-in user may read; nobody but the service role writes.
drop policy if exists "model_failure_rates_read" on public.model_failure_rates;
create policy "model_failure_rates_read" on public.model_failure_rates
  for select to authenticated using (true);

grant select on public.model_failure_rates to authenticated;
grant all    on public.model_failure_rates to service_role;

comment on table public.model_failure_rates is
  'DVSA anonymised MOT results aggregated by model / age / mileage / system. Source: DfT open data (OGL). Rebuilt yearly by scripts/dvsa.';
