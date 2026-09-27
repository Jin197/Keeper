/**
 * Centralised env access. Throws lazily — only when a server action / route
 * actually needs the variable, so the build keeps working without a .env.local.
 */
function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `Missing environment variable ${key}. See .env.example for setup.`,
    );
  }
  return v;
}

function optional(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export type StripeBand = 'A' | 'B' | 'C';
export type StripeInterval = 'monthly' | 'yearly';

/**
 * Stripe Price ID for a (band × interval). Band A is mandatory —
 * `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` — and is the fallback for
 * bands B and C when their `_B` / `_C` variants aren't set, so a fresh
 * deployment with a single price still checks out everywhere.
 */
export function stripePriceFor(interval: StripeInterval, band: StripeBand): string {
  const base = interval === 'yearly' ? 'STRIPE_PRICE_YEARLY' : 'STRIPE_PRICE_MONTHLY';
  if (band !== 'A') {
    const banded = optional(`${base}_${band}`);
    if (banded) return banded;
  }
  return required(base);
}

/** One-off Price for the certified "sale dossier" PDF. Same band fallback. */
export function stripeSaleDossierPriceFor(band: StripeBand): string {
  if (band !== 'A') {
    const banded = optional(`STRIPE_PRICE_SALE_DOSSIER_${band}`);
    if (banded) return banded;
  }
  return required('STRIPE_PRICE_SALE_DOSSIER');
}

/** Every configured subscription Price ID, for the webhook to recognise. */
export function allStripeSubscriptionPriceIds(): Set<string> {
  const ids = new Set<string>();
  for (const base of ['STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY']) {
    for (const suffix of ['', '_B', '_C']) {
      const v = optional(`${base}${suffix}`);
      if (v) ids.add(v);
    }
  }
  return ids;
}

export const env = {
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  /**
   * The backend key. Supabase renamed these in 2026: `sb_secret_…` replaces the
   * legacy service_role JWT, and the dashboard now calls the variable
   * SUPABASE_SECRET_KEY. Accept both so a copy-paste from either era works.
   */
  supabaseServiceRoleKey: () =>
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    required('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecret: () => required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => required('STRIPE_WEBHOOK_SECRET'),
  stripePriceMonthly: () => required('STRIPE_PRICE_MONTHLY'),
  stripePriceYearly: () => required('STRIPE_PRICE_YEARLY'),
  stripePriceFamilyMonthly: () => required('STRIPE_PRICE_FAMILY_MONTHLY'),
  stripePriceFamilyYearly: () => required('STRIPE_PRICE_FAMILY_YEARLY'),
  googleVisionCredentials: () => required('GOOGLE_APPLICATION_CREDENTIALS_JSON'),

  // ── Vehicle-data providers (all optional; features degrade gracefully) ──
  /** DVSA MOT History API (UK). OAuth client-credentials + API key. */
  motClientId: () => optional('MOT_CLIENT_ID'),
  motClientSecret: () => optional('MOT_CLIENT_SECRET'),
  motTokenUrl: () => optional('MOT_TOKEN_URL'),
  motScope: () => optional('MOT_SCOPE_URL'),
  motApiKey: () => optional('MOT_API_KEY'),
  /** Tankerkönig (Germany fuel prices). Free key. */
  tankerkoenigApiKey: () => optional('TANKERKOENIG_API_KEY'),
};

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

export const isMotHistoryConfigured = () =>
  Boolean(
    process.env.MOT_CLIENT_ID &&
      process.env.MOT_CLIENT_SECRET &&
      process.env.MOT_TOKEN_URL &&
      process.env.MOT_SCOPE_URL &&
      process.env.MOT_API_KEY,
  );

export const isSaleDossierConfigured = () =>
  Boolean(process.env.STRIPE_PRICE_SALE_DOSSIER);
