-- ============================================================
-- Velocewealth · Launch pivot (Sept 2026)
--   1. vehicles.country            — registration country, drives which
--                                    public data sources apply (MOT, NHTSA…)
--   2. vehicles.insurance_renewal_date — powers the "compare before renewal"
--                                    reminder
--   3. vehicle_purchases           — one-off purchases (certified sale dossier)
-- ============================================================

alter table public.vehicles
  add column if not exists country text check (country ~ '^[A-Z]{2}$'),
  add column if not exists insurance_renewal_date date;

comment on column public.vehicles.country is
  'ISO-3166 alpha-2 registration country. Inferred from the plate format or the profile at creation.';

-- Backfill from the owner's profile country for existing rows.
update public.vehicles v
   set country = upper(p.country)
  from public.profiles p
 where v.user_id = p.id
   and v.country is null
   and p.country ~* '^[a-z]{2}$';

-- ── One-off purchases ───────────────────────────────────────
create table if not exists public.vehicle_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  kind text not null check (kind in ('sale_dossier')),
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_purchases_vehicle_kind_idx
  on public.vehicle_purchases (vehicle_id, kind);

alter table public.vehicle_purchases enable row level security;

-- Owners can read their purchases; only the service role (webhook) writes.
drop policy if exists "vehicle_purchases_select_own" on public.vehicle_purchases;
create policy "vehicle_purchases_select_own" on public.vehicle_purchases
  for select using (auth.uid() = user_id);

grant select on public.vehicle_purchases to authenticated;
grant all    on public.vehicle_purchases to service_role;
