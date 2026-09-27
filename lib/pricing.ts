/**
 * Territory-aware pricing (purchasing-power parity).
 *
 * One product, three price bands. The band is chosen from the buyer's
 * country; the displayed amount is the band's price in that country's
 * currency. Stripe holds one Price per (band × interval) — with
 * `currency_options` on each Price so Checkout can charge in local currency.
 *
 * This file is the single source of truth for what the UI shows. The Stripe
 * Price IDs live in env (see `lib/env.ts` → `stripePriceFor`). Keep the two
 * in sync: if you change an amount here, change it in the Stripe dashboard.
 *
 * Isomorphic — safe to import from client components.
 */

export type PriceBand = 'A' | 'B' | 'C';
export type BillingInterval = 'monthly' | 'yearly';

/** Countries on the high-income band. Everything not listed in B or C falls here. */
const BAND_B_COUNTRIES = new Set([
  // Latin America
  'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'CR', 'PA', 'DO',
  // Central / Eastern Europe
  'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'RS', 'SK', 'SI', 'LT', 'LV', 'EE', 'GR', 'PT',
  // Türkiye, Gulf non-oil, South Africa, Asia mid-income
  'TR', 'ZA', 'MY', 'TH', 'CN', 'RU', 'KZ', 'UA',
]);

const BAND_C_COUNTRIES = new Set([
  // Maghreb & West / Central Africa (the app already supports XOF/XAF/MAD)
  'MA', 'DZ', 'TN', 'EG', 'SN', 'CI', 'CM', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GA', 'CG', 'TD', 'GN',
  // Sub-Saharan
  'NG', 'GH', 'KE', 'TZ', 'UG', 'ET', 'RW', 'ZM', 'ZW', 'MZ', 'AO', 'CD', 'MG',
  // South & South-East Asia
  'IN', 'PK', 'BD', 'LK', 'NP', 'ID', 'PH', 'VN',
  // Others
  'BO', 'PY', 'HN', 'GT', 'NI', 'SV', 'HT', 'VE',
]);

export function priceBandForCountry(country: string | null | undefined): PriceBand {
  const cc = (country ?? '').toUpperCase();
  if (BAND_C_COUNTRIES.has(cc)) return 'C';
  if (BAND_B_COUNTRIES.has(cc)) return 'B';
  return 'A';
}

export interface LocalPrice {
  currency: string;
  /** Monthly plan, per month. */
  monthly: number;
  /** Yearly plan, total per year. */
  yearly: number;
  /** One-off "sale dossier" (certified PDF for free-tier users). */
  saleDossier: number;
}

/**
 * Display prices per currency. Amounts are what a local buyer sees and what
 * Stripe's `currency_options` should hold. Yearly ≈ 10 × monthly (−17 %,
 * marketed as "2 months free").
 *
 * The band decides which table to look in; the country decides which currency.
 * A currency missing from a band falls back to that band's USD line.
 */
const PRICES: Record<PriceBand, Record<string, LocalPrice>> = {
  A: {
    EUR: { currency: 'EUR', monthly: 4.99, yearly: 39, saleDossier: 9.99 },
    GBP: { currency: 'GBP', monthly: 3.99, yearly: 34, saleDossier: 7.99 },
    USD: { currency: 'USD', monthly: 4.99, yearly: 39, saleDossier: 9.99 },
    CAD: { currency: 'CAD', monthly: 6.99, yearly: 54, saleDossier: 12.99 },
    AUD: { currency: 'AUD', monthly: 7.49, yearly: 59, saleDossier: 14.99 },
    NZD: { currency: 'NZD', monthly: 7.99, yearly: 64, saleDossier: 14.99 },
    CHF: { currency: 'CHF', monthly: 4.9, yearly: 39, saleDossier: 9.9 },
    SEK: { currency: 'SEK', monthly: 55, yearly: 429, saleDossier: 109 },
    NOK: { currency: 'NOK', monthly: 55, yearly: 429, saleDossier: 109 },
    DKK: { currency: 'DKK', monthly: 37, yearly: 289, saleDossier: 75 },
    JPY: { currency: 'JPY', monthly: 750, yearly: 5900, saleDossier: 1500 },
    SGD: { currency: 'SGD', monthly: 6.99, yearly: 54, saleDossier: 12.99 },
    AED: { currency: 'AED', monthly: 18, yearly: 145, saleDossier: 37 },
    SAR: { currency: 'SAR', monthly: 18, yearly: 145, saleDossier: 37 },
    ILS: { currency: 'ILS', monthly: 18, yearly: 145, saleDossier: 37 },
    KRW: { currency: 'KRW', monthly: 6900, yearly: 54000, saleDossier: 13900 },
    HKD: { currency: 'HKD', monthly: 38, yearly: 299, saleDossier: 78 },
  },
  B: {
    USD: { currency: 'USD', monthly: 2.49, yearly: 19, saleDossier: 4.99 },
    EUR: { currency: 'EUR', monthly: 2.49, yearly: 19, saleDossier: 4.99 },
    BRL: { currency: 'BRL', monthly: 12.9, yearly: 99, saleDossier: 24.9 },
    MXN: { currency: 'MXN', monthly: 45, yearly: 349, saleDossier: 89 },
    PLN: { currency: 'PLN', monthly: 9.99, yearly: 79, saleDossier: 19.99 },
    CZK: { currency: 'CZK', monthly: 59, yearly: 459, saleDossier: 119 },
    HUF: { currency: 'HUF', monthly: 899, yearly: 6990, saleDossier: 1790 },
    RON: { currency: 'RON', monthly: 11.9, yearly: 89, saleDossier: 23.9 },
    TRY: { currency: 'TRY', monthly: 79, yearly: 599, saleDossier: 159 },
    ZAR: { currency: 'ZAR', monthly: 45, yearly: 349, saleDossier: 89 },
    ARS: { currency: 'ARS', monthly: 2490, yearly: 19900, saleDossier: 4990 },
    CLP: { currency: 'CLP', monthly: 2290, yearly: 17900, saleDossier: 4590 },
    COP: { currency: 'COP', monthly: 9900, yearly: 79000, saleDossier: 19900 },
    PEN: { currency: 'PEN', monthly: 8.9, yearly: 69, saleDossier: 17.9 },
    MYR: { currency: 'MYR', monthly: 10.9, yearly: 85, saleDossier: 21.9 },
    THB: { currency: 'THB', monthly: 85, yearly: 649, saleDossier: 169 },
  },
  C: {
    USD: { currency: 'USD', monthly: 0.99, yearly: 7.99, saleDossier: 1.99 },
    EUR: { currency: 'EUR', monthly: 0.99, yearly: 7.99, saleDossier: 1.99 },
    MAD: { currency: 'MAD', monthly: 9.9, yearly: 79, saleDossier: 19.9 },
    TND: { currency: 'TND', monthly: 2.9, yearly: 23, saleDossier: 5.9 },
    DZD: { currency: 'DZD', monthly: 129, yearly: 990, saleDossier: 259 },
    EGP: { currency: 'EGP', monthly: 49, yearly: 379, saleDossier: 99 },
    XOF: { currency: 'XOF', monthly: 600, yearly: 4800, saleDossier: 1200 },
    XAF: { currency: 'XAF', monthly: 600, yearly: 4800, saleDossier: 1200 },
    NGN: { currency: 'NGN', monthly: 1500, yearly: 11900, saleDossier: 2990 },
    GHS: { currency: 'GHS', monthly: 14.9, yearly: 119, saleDossier: 29.9 },
    KES: { currency: 'KES', monthly: 129, yearly: 990, saleDossier: 259 },
    INR: { currency: 'INR', monthly: 79, yearly: 649, saleDossier: 159 },
    PKR: { currency: 'PKR', monthly: 279, yearly: 2190, saleDossier: 549 },
    BDT: { currency: 'BDT', monthly: 109, yearly: 849, saleDossier: 219 },
    IDR: { currency: 'IDR', monthly: 15900, yearly: 129000, saleDossier: 31900 },
    PHP: { currency: 'PHP', monthly: 55, yearly: 449, saleDossier: 109 },
    VND: { currency: 'VND', monthly: 24900, yearly: 199000, saleDossier: 49900 },
  },
};

/** ISO country → local currency, for the countries we price explicitly. */
const COUNTRY_CURRENCY: Record<string, string> = {
  // Euro area
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR',
  PT: 'EUR', GR: 'EUR', LU: 'EUR', SI: 'EUR', SK: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR', HR: 'EUR',
  CY: 'EUR', MT: 'EUR', MC: 'EUR',
  GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', LI: 'CHF',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', JP: 'JPY', SG: 'SGD', AE: 'AED', SA: 'SAR', IL: 'ILS', KR: 'KRW', HK: 'HKD',
  BR: 'BRL', MX: 'MXN', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', TR: 'TRY', ZA: 'ZAR',
  AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', MY: 'MYR', TH: 'THB',
  MA: 'MAD', TN: 'TND', DZ: 'DZD', EG: 'EGP', NG: 'NGN', GH: 'GHS', KE: 'KES', IN: 'INR', PK: 'PKR',
  BD: 'BDT', ID: 'IDR', PH: 'PHP', VN: 'VND',
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', BJ: 'XOF', TG: 'XOF', NE: 'XOF', GN: 'XOF',
  CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
};

export function currencyForCountry(country: string | null | undefined): string {
  return COUNTRY_CURRENCY[(country ?? '').toUpperCase()] ?? 'USD';
}

export interface ResolvedPricing extends LocalPrice {
  band: PriceBand;
  country: string;
  /** Per-month equivalent of the yearly plan, for the "x / month billed yearly" line. */
  yearlyPerMonth: number;
  /** Percentage saved by paying yearly, rounded. */
  yearlySavingsPct: number;
}

/**
 * Everything the pricing UI needs for a buyer in `country`.
 *
 * `preferredCurrency` lets a profile's saved currency win over the country
 * default when we have a price line for it (e.g. an expat in Morocco who
 * keeps EUR); otherwise the country decides.
 */
export function resolvePricing(
  country: string | null | undefined,
  preferredCurrency?: string | null,
): ResolvedPricing {
  const cc = (country ?? 'FR').toUpperCase();
  const band = priceBandForCountry(cc);
  const table = PRICES[band];
  const wanted = (preferredCurrency ?? '').toUpperCase();
  const line =
    (wanted && table[wanted]) ||
    table[currencyForCountry(cc)] ||
    table.USD;
  const yearlyPerMonth = Math.round((line.yearly / 12) * 100) / 100;
  const yearlySavingsPct = Math.round((1 - line.yearly / (line.monthly * 12)) * 100);
  return { ...line, band, country: cc, yearlyPerMonth, yearlySavingsPct };
}

/** Zero-decimal currencies per Stripe — never show cents for these. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'XOF', 'XAF', 'CLP', 'VND', 'HUF', 'IDR', 'PYG', 'UGX', 'RWF']);

export function formatPrice(amount: number, currency: string, locale = 'en'): string {
  const zero = ZERO_DECIMAL.has(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: zero ? 0 : amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: zero ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** All country codes we have an explicit currency for — used by tests and docs. */
export const PRICED_COUNTRIES = Object.keys(COUNTRY_CURRENCY);
export const PRICE_TABLE = PRICES;
