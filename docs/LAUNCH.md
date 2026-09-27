# Velocewealth — Launch notes (September 2026 pivot)

This document is the source of truth for what the product *is* at launch. It
replaces the positioning in `product_specifications.md` (kept for history).

## 1. Positioning

**For:** everyday drivers of 4-to-15-year-old cars — the people who actually
pay for fuel, repairs and MOTs out of a tight budget.
**Not for:** collectors, fleets, "asset optimisation". Those personas are gone
from onboarding, landing and copy.

**Promise:** *Know what your car will cost you next month — and pay less.*

Three pains → three features:

| Pain | Feature | Where |
|---|---|---|
| "Fuel is eating my budget" | Real cost/km from scanned receipts + cheapest station nearby (official feeds) | `/fuel/scan`, `/fuel/nearby` |
| "The garage always finds something" | Known faults for *this* car from official records + 12-month maintenance forecast with costs | vehicle page → "Health & upcoming costs" |
| "Buyers don't trust my history" | Hash-chained service log → certified sale dossier PDF | vehicle page, one-off purchase or Pro |

## 2. Why these countries, in this order

We only promise what a public authority publishes. Coverage today:

| Country | Vehicle identity | Per-car history | Recalls / faults | Live fuel prices |
|---|---|---|---|---|
| **United Kingdom** | DVLA VES (`DVLA_API_KEY`) | **DVSA MOT history** — every test, odometer, defects, advisories (`MOT_*`) | NHTSA (model-level proxy) | — |
| **United States** | NHTSA vPIC (VIN, no key) | — | **NHTSA recalls + complaints** (no key) | — |
| **France** | SIV reseller (paid, optional) | — | NHTSA proxy | **prix-carburants.gouv.fr** (no key) |
| **Germany** | VIN | — | NHTSA proxy | **Tankerkönig** (`TANKERKOENIG_API_KEY`, free) |
| Everywhere else | VIN decode | — | NHTSA proxy | — |

The UK is first because it is the only market with a free, official,
per-vehicle history — the "wow" at signup. Default locale is therefore `en`
(`/`), French is at `/fr`. See `lib/i18n/routing.ts`.

Code: `lib/vehicle-data/*` (MOT, NHTSA, aggregation), `lib/fuel-prices/*`
(provider interface — add a country by implementing `FuelPriceProvider`).

## 3. Pricing

One product ("Pro"), three bands by buyer country (`lib/pricing.ts`):

| Band | Countries (examples) | Monthly | Yearly | Sale dossier (one-off) |
|---|---|---|---|---|
| A | UK, US, EU-15, CA, AU, CH, JP… | £3.99 / €4.99 / $4.99 | £34 / €39 / $39 | £7.99 / €9.99 |
| B | BR, MX, PL, CZ, RO, TR, ZA… | ≈ $2.49 | ≈ $19 | ≈ $4.99 |
| C | MA, DZ, SN, CI, NG, IN, PK, ID… | ≈ $0.99 | ≈ $7.99 | ≈ $1.99 |

Amounts are listed per currency in `PRICE_TABLE`. The band comes from
`profile.country` (signup) or the edge geo header for anonymous visitors
(`lib/geo.ts`). The yearly plan is 29–38% cheaper than twelve monthly payments
depending on the currency; the badge shows the real percentage per currency
(`resolvePricing().yearlySavingsPct`) rather than a fixed claim.

Free plan: 1 vehicle, 3 scans/month, cost per km, reminders, cheapest fuel.
Pro: unlimited, forecast with costs, known faults, dossier, tax export,
insurance reminder. 30-day full trial without card (`lib/trial.ts`).

### Stripe setup checklist

1. Product **Pro** → 2 recurring Prices per band (monthly, yearly). In each
   Price, add `currency_options` for every currency in that band's table so
   Checkout charges in local currency. Set the IDs in
   `STRIPE_PRICE_MONTHLY[_B|_C]`, `STRIPE_PRICE_YEARLY[_B|_C]`.
2. Product **Certified sale dossier** → one one-time Price per band with the
   same `currency_options`. IDs in `STRIPE_PRICE_SALE_DOSSIER[_B|_C]`.
3. Stripe Tax on. Webhook events: `checkout.session.completed`,
   `customer.subscription.*`. The webhook records one-off purchases in
   `vehicle_purchases` (migration `20260919000000_launch_pivot.sql`).
4. Do not create these by hand: `npm run stripe:prices` prints what it would
   create (dry run, no key needed), `npm run stripe:prices:apply` creates it
   from the same `PRICE_TABLE` the app renders, and prints the env block to
   paste. It is idempotent and encodes zero-decimal currencies correctly — the
   one mistake that would charge 100× the intended amount.
5. Changing an amount = change `lib/pricing.ts`, then re-run the script with
   `--apply --deactivate-stale` and update the env vars (Stripe prices are
   immutable). `tests/unit/pricing.test.ts` guards the table's shape.

## 3b. How the maintenance forecast is built (three layers)

| Layer | Source | Code | Status |
|---|---|---|---|
| 1 · Systematic | Manufacturer service book per model generation (+ generic table per fuel type as fallback) | `lib/maintenance/schedules/` (10 models, **all `verified: false`** — see `VALIDATION.md`), `lib/maintenance/knowledge-base.ts` | ships; validate entries against handbooks |
| 2 · Personal | The owner's logged services, real annual mileage (receipts or official MOT odometer) | `lib/maintenance/plan.ts` | ships |
| 3 · Statistical | ~40 M anonymised MOT tests/year (DfT open data): failure rate per model × age × mileage × system | `scripts/dvsa/`, table `model_failure_rates`, `lib/vehicle-data/failure-rates.ts` | ships; **run the pipeline once** |

Every task on the Health page is labelled with its layer ("Manufacturer
schedule · to confirm", "From your service log", "31 % of Focus fail on
brakes at 100–120k km"). No layer pretends to be the others.

### Running the DVSA pipeline (one evening, once a year)

1. Download from data.gov.uk → "Anonymised MOT tests and results": the latest
   year's *test results* and *test items* zips plus the *lookup* zip. Extract
   into one folder, e.g. `data/dvsa/2024/`.
2. `node scripts/dvsa/build-failure-rates.mjs --dir data/dvsa/2024 --out data/model-failure-rates.json`
   (Node ≥ 22.5; 15–40 min; SQLite work file ≈ 3 GB, output a few MB).
   Add `--dir data/dvsa/2023` to pool two years for rarer models.
3. `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/dvsa/build-failure-rates.mjs --skip-load --db data/dvsa/work.sqlite --upload`
   upserts into `model_failure_rates` (migration `20260920000000`).
4. Until the table has rows the statistical layer simply does not render.

### Reminders (nothing to configure for the user)

`/api/cron/forecast-reminders` runs daily (vercel.json): rebuilds each
vehicle's plan and pushes in-app notifications — plus email when the user
left the channel on — for services due in 30 / 7 days or overdue, MOT /
inspection due, insurance renewal. Deduplicated by `dedupe_key`, so re-runs
never double-send. Preferences live in `profiles.notification_prefs`
(Settings → Notifications, real switches). Needs `CRON_SECRET`; email needs
`RESEND_API_KEY` + `EMAIL_FROM`.

## 4. Other revenue lines

- **Parts affiliate** (`lib/affiliates.ts`, `PartsLinkButton`): every
  maintenance task links to Autodoc (EU/UK) or Amazon (US, CA, BR…) with a
  pre-filled search. Set `NEXT_PUBLIC_AFFILIATE_AUTODOC_ID` / `_AMAZON_TAG`
  once approved; links work untracked meanwhile.
- **Insurance comparison** (`InsuranceRenewalCard`): when a vehicle's
  `insurance_renewal_date` is within 45 days, the dashboard shows the
  country's comparison site. Override with a tracked deep link via
  `NEXT_PUBLIC_AFFILIATE_INSURANCE_URL_<CC>`.
- **One-off dossier** for free users (above).
- Partner-garage tier: code still accepts it but it is not sold at launch —
  no users, no garages.

## 5. What was removed and why

- **"AI diagnostic" with confidence %** — the OBD telemetry was never wired to
  a device and the "Random Forest confidence" was `sin(seed)` noise. Showing
  that to a buyer or an insurer would be a misrepresentation. Replaced by
  the Health page: manufacturer intervals × the owner's logged services ×
  official MOT/NHTSA data, each item labelled with its source.
- **Collector / fleet personas, "asset" language, fake social proof**
  ("4.9/5", "€120M assets", testimonials) — removed from landing, onboarding
  and messages.
- **Mapbox map** — replaced by a list of stations sorted by price; no map,
  no token.

## 6. Known gaps at launch (honest list)

- **The app is now EN/FR end to end**, including server-action and API error
  messages (`lib/errors.ts`), the legal pages, the new-device security email
  and the demo data. What remains French-only is French-market-only and gated
  accordingly (see below). Both PDF exports — the per-vehicle sale dossier and
  the fleet-wide certified log — follow the account's language.
- **Validator messages are English** (dev/log layer). Users see a localised
  generic ("Some fields are invalid"), not the field-level zod text, so a
  bad mileage no longer says "Kilométrage invalide" — a small loss of
  specificity, taken deliberately to avoid mixed-language forms.
- **Gated to French contexts** rather than translated: the ANTAI fines /
  licence-points tracker (shown only for FR vehicles or when fines exist) and
  the chat assistant (French knowledge base; hidden on `/`).
- Live fuel prices: FR + DE only. Spain/UK/Australia have open feeds and
  slot into `lib/fuel-prices` when there is time.
- MOT history needs DVSA credentials (free, ≤ 5 working days) — form and
  suggested answers in `docs/GO-LIVE.md §4`.
- Manufacturer schedules: 10 models, intervals cross-checked against public
  UK/FR sources (Toyota UK, L'argus for the PureTech belt, Ford/Vauxhall
  handbook figures quoted by UK guides) but **not yet against the handbook
  PDFs themselves** → all still `verified: false`; the UI says "to confirm".
- Recalls for non-US models are sparse; the UI says so rather than pads.

## 6a. Stripe prices — do not create them by hand

`npm run stripe:prices` reads the same `PRICE_TABLE` the app renders and prints
the 2 products + 9 prices it would create (dry run; works with no key and no
network). `npm run stripe:prices:apply` creates them and prints the env block
to paste into Vercel. It is idempotent, tags every price with metadata so
re-runs reuse rather than duplicate, and encodes zero-decimal currencies with
Stripe's own list — not the app's display list, which also hides cents for HUF
and IDR and would have charged 100× on those.

## 6b. Legal pages — read this before going live

The imprint used to ship a **fabricated company identity** (an SAS with a
capital, an RCS number and an intra-EU VAT number that belong to nobody).
Publishing a false registration or VAT number is a misrepresentation, so it is
gone: `lib/legal/entity.ts` reads every field from the environment, prints
only what is set, and shows a visible warning until name + address + contact
exist. **Set `LEGAL_ENTITY_*` in Vercel before offering the service
commercially** (see `.env.example`).

The four documents were rewritten from scratch in English and French
(`lib/legal/content.ts`) and now state what the product actually does: two
plans plus the one-off dossier, a 30-day trial, 10-character passwords, the
real processor list, EU hosting, the public-data licences (OGL, US public
domain), and — new and legally necessary — **the affiliate-link disclosure**.
They also say plainly what the forecast is not: not a roadworthiness test, and
population statistics are not a statement about the reader's own car.

They are honest and specific, but they are not a lawyer's review. Have them
checked before you rely on them.

## 7. Migration & deploy

```bash
supabase db push            # applies 20260919000000 (pivot), 20260920000000 (failure rates),
                            # 20260920000100 (categories), 20260920000200 (notifications)
npm run typecheck && npm test
npm run build
```

Set the env vars from `.env.example`, point Stripe's webhook at
`/api/stripe/webhook`, and deploy. Vercel supplies `x-vercel-ip-country`,
which `lib/geo.ts` uses for anonymous price display.
