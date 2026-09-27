import 'server-only';
import { headers } from 'next/headers';

/**
 * Best-effort ISO-3166 alpha-2 country for the current request.
 *
 * Priority: an explicit value (the profile's `country`, set at signup) →
 * the edge's geo header (Vercel sets `x-vercel-ip-country`; Cloudflare
 * `cf-ipcountry`) → `Accept-Language` region subtag → the fallback.
 *
 * Used for price-band selection and for choosing which public vehicle-data
 * sources apply. Never used for anything security-relevant.
 */
export function resolveRequestCountry(
  explicit?: string | null,
  fallback = 'GB',
): string {
  const clean = (v: string | null | undefined) => {
    const cc = (v ?? '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1' ? cc : null;
  };

  const fromProfile = clean(explicit);
  if (fromProfile) return fromProfile;

  let h: ReturnType<typeof headers> | null = null;
  try {
    h = headers();
  } catch {
    // Called outside a request scope (build time, tests) — fall through.
  }
  if (h) {
    const fromEdge = clean(h.get('x-vercel-ip-country')) ?? clean(h.get('cf-ipcountry'));
    if (fromEdge) return fromEdge;

    const lang = h.get('accept-language') ?? '';
    const m = lang.match(/^[a-z]{2,3}-([A-Za-z]{2})/);
    const fromLang = clean(m?.[1]);
    if (fromLang) return fromLang;
  }

  return fallback;
}
