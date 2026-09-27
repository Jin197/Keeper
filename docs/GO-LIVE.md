# Go-live runbook — the four things only you can do

Everything in code is done and tested. These four steps need **your** accounts
(Supabase, Vercel, DVSA) and therefore your logins — none of them can be run
from a machine that has no `.env.local`, no Supabase CLI login and no Vercel
link (which is the state of the repo checkout used to build this).

## 0. A blocking defect found on your live database (27 Sep)

The secret API key authenticates as `service_role` — the Auth admin API accepts
it — but **every table in `public` refuses it**: Postgres answers 42501
"permission denied for table profiles" and even hints
`GRANT SELECT ON public.profiles TO service_role`. The `anon` role can read
those same tables. The grants from migration `20260518000000` are therefore not
in force on this project.

Every server-side write uses that role, so as things stand, in production:

- the Stripe webhook cannot set `profiles.plan_tier` → **a customer pays and
  stays on the free plan**, silently;
- `pushInAppNotification` fails → no reminders at all;
- both crons fail on their first query.

None of it shows in the UI. `20260927000000_restore_service_role_grants.sql`
fixes it with a loop over every table (so it also covers the new ones) and
raises an exception if `service_role` still cannot update `profiles`, so a
broken backend fails the migration instead of the launch.

**Verify after `db push`** — this must print the profile row, not a 403:

```bash
curl -s "$SUPABASE_URL/rest/v1/profiles?select=id,plan_tier&limit=1" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY"
```

## 1. Apply the 6 migrations (≈ 5 min)

```bash
npm i -g supabase            # once
supabase login               # opens the browser
supabase link --project-ref <your-project-ref>   # Settings → General in the Supabase dashboard
npm run db:push              # applies:
#   20260927000000_restore_service_role_grants.sql  ← read §0 first
#   20260919000000_launch_pivot.sql        vehicles.country, insurance_renewal_date, vehicle_purchases
#   20260920000000_model_failure_rates.sql the DVSA statistics table
#   20260920000100_maintenance_categories.sql belt / fluid / gearbox
#   20260920000200_notifications_v2.sql    notification_prefs, dedupe_key, new kinds
#   20260922000000_drop_postgis.sql        removes PostGIS (unused) and with it public.spatial_ref_sys
```

**`public.spatial_ref_sys` warning?** It is PostGIS's own table, created by the
old map migration and owned by the extension, so RLS cannot be enabled on it.
The last migration drops PostGIS entirely (nothing uses it any more); after
`db push` the table — and the advisor warning — are gone. If you see
"must be owner of table spatial_ref_sys" while pushing, run that one
migration's SQL in the dashboard SQL editor (it runs as the owner there).

If `db push` complains about the enum `ALTER TYPE … ADD VALUE` inside a
transaction, run that migration's four `alter type` lines by hand in the SQL
editor — Postgres < 12 quirk; Supabase's Postgres 15 is fine.

## 2. Vercel environment (≈ 5 min)

Project → Settings → Environment Variables (Production + Preview):

| Variable | Value |
|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` — Vercel sends it as `Authorization: Bearer …` on both crons in `vercel.json` |
| `SUPABASE_SECRET_KEY` | the `sb_secret_…` key. **Never** as `NEXT_PUBLIC_*` |
| `RESEND_API_KEY`, `EMAIL_FROM` | from resend.com, or leave empty → reminders stay in-app only |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` (+ `_B`, `_C`), `STRIPE_PRICE_SALE_DOSSIER` | see `docs/LAUNCH.md §3` |
| `DVLA_API_KEY` | free, instant: https://developer-portal.driver-vehicle-licensing.api.gov.uk/ |
| `MOT_CLIENT_ID`, `MOT_CLIENT_SECRET`, `MOT_TOKEN_URL`, `MOT_SCOPE_URL`, `MOT_API_KEY` | after step 4 |
| `TANKERKOENIG_API_KEY` | free: https://creativecommons.tankerkoenig.de/ |

Or with the CLI: `npm i -g vercel && vercel link && vercel env add CRON_SECRET production`.

## 3. Load the DVSA statistics (≈ 2 min once the file exists)

The 2024 dataset (74 M tests) has already been downloaded and aggregated on
this machine into `data/model-failure-rates.json` (git-ignored, see the
figures in `docs/LAUNCH.md §3b`). To load it into your database:

```bash
set -a; source .env.local; set +a   # SUPABASE_URL + SUPABASE_SECRET_KEY are already there
npm run dvsa:upload
```

To rebuild next year: download the new year's three zips from
https://www.data.gov.uk/dataset/e3939ef8-30c7-4ca8-9c7c-ad9475cc9b2f/anonymised-mot-tests-and-results
into `data/dvsa/<year>/` (flatten the monthly CSVs into that folder, copy the
lookup CSVs next to them) and run `npm run dvsa:build` then `npm run dvsa:upload`.

## 4. Register for the DVSA MOT History API (5 min form, up to 5 working days)

Form: https://documentation.history.mot.api.gov.uk/mot-history-api/register
It asks for your name, contact email, postal address, and whether you apply
as an individual or an organisation — that is why it cannot be filled in for
you. Suggested answers:

- **Organisation / use**: Velocewealth — consumer web app that shows a car
  owner the MOT history of *their own* vehicle (plate entered by the owner)
  to forecast maintenance. Read-only, per-vehicle lookups, cached 24 h,
  no bulk download, no resale of data.
- **Expected volume**: < 1 000 requests/day at launch.

You will receive by email: a **client id**, a **client secret**, a **tenant id**
(→ `MOT_TOKEN_URL=https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token`),
the scope `https://tapi.dvsa.gov.uk/.default` (→ `MOT_SCOPE_URL`) and an
**API key** (→ `MOT_API_KEY`). Paste the five values into Vercel; the UK
"MOT history" block appears on the next deploy. Until then the app says
"MOT history is available once the DVSA key is configured" — nothing breaks.
