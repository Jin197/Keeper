/**
 * Affiliate / partner links — the revenue line that doesn't depend on
 * subscriptions. Isomorphic (used in client components).
 *
 * Two kinds of link:
 *   • parts  — when a maintenance task says "brake pads due", link to the
 *              part search on the country's parts retailer.
 *   • insurance — when a policy renews within ~45 days, link to the
 *              country's comparison site.
 *
 * Tracking IDs come from `NEXT_PUBLIC_AFFILIATE_*` env vars. When an ID is
 * missing the link still works (untracked), so the feature is useful on day
 * one and starts earning the day the programme approves the account.
 *
 * Affiliate programmes, for reference:
 *   Autodoc  — via Awin / own programme, 27 EU countries + UK, ~5–7 % basket
 *   Amazon   — Associates, US/UK/CA/DE/FR…, 3–4 % automotive
 *   Insurance — FR: LesFurets / Assurland (Awin) · UK: Confused / CTM (Awin) ·
 *               US: Insurify / Jerry (Impact)
 */

import type { MaintenanceCategory } from '@/lib/types';

export interface PartsLink {
  retailer: string;
  url: string;
  /** True when a tracking id is present and the click will be attributed. */
  tracked: boolean;
}

export interface InsuranceLink {
  provider: string;
  url: string;
  tracked: boolean;
}

// ── Parts ────────────────────────────────────────────────────────

const AUTODOC_DOMAINS: Record<string, string> = {
  FR: 'www.autodoc.fr',
  DE: 'www.autodoc.de',
  GB: 'www.autodoc.co.uk',
  ES: 'www.autodoc.es',
  IT: 'www.autodoc.it',
  NL: 'www.autodoc.nl',
  BE: 'www.autodoc.be',
  PT: 'www.autodoc.pt',
  AT: 'www.autodoc.at',
  CH: 'www.autodoc.ch',
  PL: 'www.autodoc.pl',
  CZ: 'www.autodoc.cz',
  SE: 'www.autodoc.se',
  DK: 'www.autodoc.dk',
  FI: 'www.autodoc.fi',
  IE: 'www.autodoc.ie',
  GR: 'www.autodoc.gr',
  RO: 'www.autodoc.ro',
  HU: 'www.autodoc.hu',
  SK: 'www.autodoc.sk',
  BG: 'www.autodoc.bg',
  HR: 'www.autodoc.hr',
  SI: 'www.autodoc.si',
  LU: 'www.autodoc.lu',
  LT: 'www.autodoc.lt',
  LV: 'www.autodoc.lv',
  EE: 'www.autodoc.ee',
  NO: 'www.autodoc.no',
};

const AMAZON_DOMAINS: Record<string, string> = {
  US: 'www.amazon.com',
  CA: 'www.amazon.ca',
  MX: 'www.amazon.com.mx',
  BR: 'www.amazon.com.br',
  AU: 'www.amazon.com.au',
  JP: 'www.amazon.co.jp',
  IN: 'www.amazon.in',
  AE: 'www.amazon.ae',
  SA: 'www.amazon.sa',
  SG: 'www.amazon.sg',
  TR: 'www.amazon.com.tr',
  EG: 'www.amazon.eg',
};

/** Search terms per category — English for global retailers, French for FR/BE/CH/LU. */
const PART_TERMS: Record<MaintenanceCategory, { en: string; fr: string; de: string }> = {
  oil: { en: 'engine oil filter', fr: 'huile moteur filtre à huile', de: 'Motoröl Ölfilter' },
  tires: { en: 'tyres', fr: 'pneus', de: 'Reifen' },
  brakes: { en: 'brake pads discs', fr: 'plaquettes disques de frein', de: 'Bremsbeläge Bremsscheiben' },
  filter: { en: 'air filter cabin filter', fr: 'filtre à air filtre habitacle', de: 'Luftfilter Innenraumfilter' },
  battery: { en: 'car battery', fr: 'batterie voiture', de: 'Autobatterie' },
  inspection: { en: 'wiper blades bulbs', fr: 'balais essuie-glace ampoules', de: 'Scheibenwischer Glühlampen' },
  belt: { en: 'timing belt kit water pump', fr: 'kit distribution pompe à eau', de: 'Zahnriemensatz Wasserpumpe' },
  fluid: { en: 'brake fluid DOT 4', fr: 'liquide de frein DOT 4', de: 'Bremsflüssigkeit DOT 4' },
  gearbox: { en: 'automatic gearbox oil', fr: 'huile boîte automatique', de: 'Getriebeöl Automatik' },
  other: { en: 'coolant antifreeze', fr: 'liquide de refroidissement', de: 'Kühlmittel' },
};

const FRENCH_SPEAKING = new Set(['FR', 'BE', 'CH', 'LU', 'MC', 'MA', 'TN', 'DZ', 'SN', 'CI', 'CM']);
const GERMAN_SPEAKING = new Set(['DE', 'AT']);

export function partsLink(
  country: string | null | undefined,
  category: MaintenanceCategory,
  vehicle?: { make?: string; model?: string; year?: number },
): PartsLink | null {
  const cc = (country ?? '').toUpperCase();
  const lang = FRENCH_SPEAKING.has(cc) ? 'fr' : GERMAN_SPEAKING.has(cc) ? 'de' : 'en';
  const terms = PART_TERMS[category][lang];
  const vehicleTerms = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ');
  const q = `${terms} ${vehicleTerms}`.trim();

  if (AUTODOC_DOMAINS[cc]) {
    const id = process.env.NEXT_PUBLIC_AFFILIATE_AUTODOC_ID;
    const url = new URL(`https://${AUTODOC_DOMAINS[cc]}/search`);
    url.searchParams.set('keyword', q);
    if (id) url.searchParams.set('ref', id);
    return { retailer: 'Autodoc', url: url.toString(), tracked: Boolean(id) };
  }

  const amazonHost = AMAZON_DOMAINS[cc] ?? (cc === 'GB' ? 'www.amazon.co.uk' : null);
  if (amazonHost) {
    const tag = process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TAG;
    const url = new URL(`https://${amazonHost}/s`);
    url.searchParams.set('k', q);
    url.searchParams.set('i', 'automotive');
    if (tag) url.searchParams.set('tag', tag);
    return { retailer: 'Amazon', url: url.toString(), tracked: Boolean(tag) };
  }

  return null;
}

// ── Insurance ────────────────────────────────────────────────────

const INSURANCE_DEFAULTS: Record<string, { provider: string; url: string }> = {
  FR: { provider: 'LesFurets', url: 'https://www.lesfurets.com/assurance-auto' },
  BE: { provider: 'Comparatif assurance auto', url: 'https://www.comparatif-assurance-auto.be/' },
  CH: { provider: 'Comparis', url: 'https://www.comparis.ch/autoversicherung' },
  GB: { provider: 'Confused.com', url: 'https://www.confused.com/car-insurance' },
  IE: { provider: 'Bonkers.ie', url: 'https://www.bonkers.ie/compare-car-insurance/' },
  US: { provider: 'Insurify', url: 'https://insurify.com/car-insurance/' },
  CA: { provider: 'Ratehub', url: 'https://www.ratehub.ca/insurance/car-insurance' },
  DE: { provider: 'Check24', url: 'https://www.check24.de/kfz-versicherung/' },
  AT: { provider: 'durchblicker', url: 'https://durchblicker.at/kfz-versicherung' },
  ES: { provider: 'Rastreator', url: 'https://www.rastreator.com/seguros-de-coche.aspx' },
  IT: { provider: 'Facile.it', url: 'https://www.facile.it/assicurazioni-auto.html' },
  NL: { provider: 'Independer', url: 'https://www.independer.nl/autoverzekering/' },
  PT: { provider: 'ComparaJá', url: 'https://www.comparaja.pt/seguros/automovel' },
  PL: { provider: 'Rankomat', url: 'https://rankomat.pl/ubezpieczenia-samochodowe' },
  AU: { provider: 'Compare the Market', url: 'https://www.comparethemarket.com.au/car-insurance/' },
  BR: { provider: 'Minuto Seguros', url: 'https://www.minutoseguros.com.br/seguro-auto/' },
  MX: { provider: 'Rastreator MX', url: 'https://www.rastreator.mx/seguros-de-auto' },
  IN: { provider: 'PolicyBazaar', url: 'https://www.policybazaar.com/motor-insurance/car-insurance/' },
  ZA: { provider: 'Hippo', url: 'https://www.hippo.co.za/car-insurance/' },
  MA: { provider: 'Assurance.ma', url: 'https://www.assurance.ma/assurance-auto' },
};

/**
 * The comparison link for a country. `NEXT_PUBLIC_AFFILIATE_INSURANCE_URL_<CC>`
 * overrides the default with a tracked deep link once the programme is live.
 */
export function insuranceLink(country: string | null | undefined): InsuranceLink | null {
  const cc = (country ?? '').toUpperCase();
  const tracked = process.env[`NEXT_PUBLIC_AFFILIATE_INSURANCE_URL_${cc}`];
  const fallback = INSURANCE_DEFAULTS[cc];
  if (tracked) return { provider: fallback?.provider ?? 'Compare', url: tracked, tracked: true };
  if (fallback) return { provider: fallback.provider, url: fallback.url, tracked: false };
  return null;
}

/** Days until the ISO date; null when absent/invalid. */
export function daysUntil(isoDate: string | null | undefined, now = new Date()): number | null {
  if (!isoDate) return null;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / 86400000);
}

/** Show the renewal nudge in the 45 days before renewal, and for 15 days after. */
export function shouldNudgeInsurance(renewalDate: string | null | undefined, now = new Date()): boolean {
  const d = daysUntil(renewalDate, now);
  return d !== null && d <= 45 && d >= -15;
}
