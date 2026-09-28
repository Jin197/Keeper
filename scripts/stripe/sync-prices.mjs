#!/usr/bin/env node
/**
 * Create the Stripe products and prices that `lib/pricing.ts` describes.
 *
 * Doing this by hand means ~9 prices × up to 17 currencies each in the
 * dashboard, and any typo silently charges the wrong amount. This script reads
 * the same `PRICE_TABLE` the app renders from, so the two cannot drift.
 *
 * What it creates
 *   Product "Keeper Pro"            → 6 recurring prices (3 bands × monthly|yearly)
 *   Product "Keeper sale dossier"   → 3 one-time prices (3 bands)
 * Each price is created in its band's base currency and carries
 * `currency_options` for every other currency of that band, so Checkout can
 * charge in the buyer's own currency.
 *
 * Idempotent: prices are tagged with metadata (kind, band, interval) and an
 * existing, matching, active price is reused rather than duplicated. Stripe
 * prices are immutable, so when an amount changes the old price is deactivated
 * and a new one created — update the env vars afterwards.
 *
 * Usage
 *   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe/sync-prices.mjs          # dry run, changes nothing
 *   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe/sync-prices.mjs --apply  # create
 *   …--apply --deactivate-stale   # also archive prices this script no longer wants
 *
 * It prints the env var block to paste into Vercel at the end.
 */

import Stripe from 'stripe';
import { PRICE_TABLE } from '../../lib/pricing.ts';

const APPLY = process.argv.includes('--apply');
const DEACTIVATE_STALE = process.argv.includes('--deactivate-stale');
const key = process.env.STRIPE_SECRET_KEY;
if (!key && APPLY) {
  console.error('STRIPE_SECRET_KEY is required to apply (use a test key first: sk_test_…).');
  process.exit(1);
}
const stripe = key ? new Stripe(key, { apiVersion: '2024-11-20.acacia' }) : null;
const live = Boolean(key?.startsWith('sk_live'));

/**
 * In a dry run the plan is worth printing even with no key or no network, so
 * every read degrades to "nothing found" instead of aborting.
 */
async function safeRead(fn, fallback, label) {
  if (!stripe) return fallback;
  try {
    return await fn();
  } catch (e) {
    if (APPLY) throw e;
    console.log(`  (could not read ${label} from Stripe: ${e.message.split('\n')[0]})`);
    return fallback;
  }
}

/**
 * Stripe's zero-decimal currencies — amounts are whole units, not cents.
 * Deliberately NOT the app's display list (lib/pricing.ts also hides cents for
 * HUF and IDR, which Stripe still expects in minor units). Getting this wrong
 * charges 100× the intended amount.
 */
const STRIPE_ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/** Currencies Stripe requires to be a whole multiple of 100 minor units. */
const HUNDREDS_ONLY = new Set(['HUF', 'TWD', 'ISK']);

function minorUnits(amount, currency) {
  const cur = currency.toUpperCase();
  if (STRIPE_ZERO_DECIMAL.has(cur)) {
    if (!Number.isInteger(amount)) {
      throw new Error(`${cur} is zero-decimal but ${amount} is not a whole number — fix lib/pricing.ts`);
    }
    return amount;
  }
  const minor = Math.round(amount * 100);
  if (HUNDREDS_ONLY.has(cur) && minor % 100 !== 0) {
    // Round up to the next whole unit rather than let Stripe reject the price.
    return Math.ceil(minor / 100) * 100;
  }
  return minor;
}

/** Band → the currency the price itself is denominated in. UK first. */
const BASE_CURRENCY = { A: 'GBP', B: 'USD', C: 'USD' };

/** Stripe caps currency_options; keep the base out of it and stay under the cap. */
const MAX_CURRENCY_OPTIONS = 20;

const PRODUCTS = {
  pro: { name: 'Keeper Pro', description: 'Unlimited vehicles and receipt scans, full maintenance forecast, known-fault data, certified sale dossier, tax-ready export.' },
  dossier: { name: 'Keeper certified sale dossier', description: 'One-off certified PDF service record for a single vehicle, with hash-chain verification.' },
};

async function findOrCreateProduct(slug) {
  const meta = PRODUCTS[slug];
  const existing = await safeRead(
    () => stripe.products.search({ query: `active:'true' AND metadata['keeper_product']:'${slug}'` }),
    { data: [] },
    `product ${slug}`,
  );
  if (existing.data[0]) {
    console.log(`  product ${slug}: reusing ${existing.data[0].id}`);
    return existing.data[0];
  }
  if (!APPLY) {
    console.log(`  product ${slug}: would create "${meta.name}"`);
    return { id: `(dry-run:${slug})` };
  }
  const created = await stripe.products.create({
    name: meta.name,
    description: meta.description,
    metadata: { keeper_product: slug },
  });
  console.log(`  product ${slug}: created ${created.id}`);
  return created;
}

/** Amounts for one (band, field) across every currency of the band. */
function amountsFor(band, field) {
  const table = PRICE_TABLE[band];
  const base = BASE_CURRENCY[band];
  if (!table[base]) throw new Error(`Band ${band} has no ${base} line in PRICE_TABLE`);
  const others = Object.keys(table).filter((c) => c !== base);
  if (others.length > MAX_CURRENCY_OPTIONS) {
    console.warn(`  ⚠ band ${band} has ${others.length} extra currencies; Stripe allows ${MAX_CURRENCY_OPTIONS}. Extra ones are skipped: ${others.slice(MAX_CURRENCY_OPTIONS).join(', ')}`);
  }
  return {
    base: { currency: base.toLowerCase(), unit_amount: minorUnits(table[base][field], base) },
    options: Object.fromEntries(
      others.slice(0, MAX_CURRENCY_OPTIONS).map((c) => [
        c.toLowerCase(),
        { unit_amount: minorUnits(table[c][field], c) },
      ]),
    ),
  };
}

const wanted = [];
for (const band of ['A', 'B', 'C']) {
  wanted.push({ kind: 'pro', band, interval: 'monthly', field: 'monthly', envVar: `STRIPE_PRICE_MONTHLY${band === 'A' ? '' : `_${band}`}` });
  wanted.push({ kind: 'pro', band, interval: 'yearly', field: 'yearly', envVar: `STRIPE_PRICE_YEARLY${band === 'A' ? '' : `_${band}`}` });
  wanted.push({ kind: 'dossier', band, interval: 'one_time', field: 'saleDossier', envVar: `STRIPE_PRICE_SALE_DOSSIER${band === 'A' ? '' : `_${band}`}` });
}

async function syncPrice(product, spec) {
  const { base, options } = amountsFor(spec.band, spec.field);
  const label = `${spec.kind} ${spec.band} ${spec.interval}`;
  const human = `${(base.unit_amount / (STRIPE_ZERO_DECIMAL.has(base.currency.toUpperCase()) ? 1 : 100)).toFixed(2)} ${base.currency.toUpperCase()}`;

  // An existing active price with the same metadata and the same amounts is reused.
  const list = await safeRead(
    () => stripe.prices.list({ product: product.id, active: true, limit: 100, expand: ['data.currency_options'] }),
    { data: [] },
    `prices for ${label}`,
  );
  const match = list.data.find(
    (p) =>
      p.metadata?.keeper_kind === spec.kind &&
      p.metadata?.keeper_band === spec.band &&
      p.metadata?.keeper_interval === spec.interval &&
      p.currency === base.currency &&
      p.unit_amount === base.unit_amount,
  );
  if (match) {
    const missing = Object.keys(options).filter((c) => !match.currency_options?.[c]);
    console.log(`  ${label}: reusing ${match.id} (${human})${missing.length ? ` — missing currencies: ${missing.join(', ')}` : ''}`);
    return { id: match.id, envVar: spec.envVar, reused: true };
  }

  const stale = list.data.filter(
    (p) => p.metadata?.keeper_kind === spec.kind && p.metadata?.keeper_band === spec.band && p.metadata?.keeper_interval === spec.interval,
  );

  if (!APPLY) {
    console.log(`  ${label}: would create ${human} + ${Object.keys(options).length} currency options${stale.length ? ` (and ${stale.length} stale price(s) to archive)` : ''}`);
    return { id: `(dry-run:${spec.envVar})`, envVar: spec.envVar, reused: false };
  }

  const created = await stripe.prices.create({
    product: product.id,
    currency: base.currency,
    unit_amount: base.unit_amount,
    currency_options: options,
    ...(spec.interval === 'one_time' ? {} : { recurring: { interval: spec.interval === 'yearly' ? 'year' : 'month' } }),
    // Prices in lib/pricing.ts are what the buyer pays. The publisher is under
    // the French small-business scheme (franchise en base, art. 293 B CGI) and
    // charges no VAT, so 'inclusive' simply means "this is the final amount".
    // It stays correct if VAT registration happens later and Stripe Tax is
    // turned on, since Stripe then breaks the tax out of the same total.
    tax_behavior: 'inclusive',
    metadata: { keeper_kind: spec.kind, keeper_band: spec.band, keeper_interval: spec.interval },
  });
  console.log(`  ${label}: created ${created.id} (${human} + ${Object.keys(options).length} currencies)`);

  for (const p of stale) {
    if (DEACTIVATE_STALE) {
      await stripe.prices.update(p.id, { active: false });
      console.log(`    archived stale ${p.id}`);
    } else {
      console.log(`    ⚠ stale price still active: ${p.id} (re-run with --deactivate-stale)`);
    }
  }
  return { id: created.id, envVar: spec.envVar, reused: false };
}

console.log(`Stripe ${!key ? 'no key — plan only' : live ? 'LIVE' : 'test'} mode · ${APPLY ? 'APPLYING CHANGES' : 'dry run (add --apply to create)'}`);
if (live && APPLY) console.log('⚠ This creates real, chargeable prices in your live account.');

const products = { pro: await findOrCreateProduct('pro'), dossier: await findOrCreateProduct('dossier') };
const results = [];
for (const spec of wanted) {
  results.push(await syncPrice(products[spec.kind], spec));
}

console.log('\n── Paste into Vercel (Production + Preview) ──');
for (const r of results) console.log(`${r.envVar}=${r.id}`);
console.log('\nReminder: the webhook must point at /api/stripe/webhook.');
console.log('Do NOT enable Stripe Tax while the publisher is under franchise en base:');
console.log('it would add VAT that is not owed and must not be collected.');
console.log('Revisit once VAT registration happens (turnover threshold, or EU B2C above 10k EUR).');
if (!APPLY) console.log('Nothing was created — re-run with --apply.');
