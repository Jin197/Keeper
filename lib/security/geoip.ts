import 'server-only';

export interface GeoLocation {
  /** ISO 3166-1 alpha-2 country code (e.g. "FR") or null when unknown. */
  country: string | null;
  /** Localized city name (e.g. "Lyon") or null. */
  city: string | null;
  /** Region/state (e.g. "Auvergne-Rhône-Alpes") or null. */
  region: string | null;
}

const EMPTY: GeoLocation = { country: null, city: null, region: null };
const TIMEOUT_MS = 1000;

/**
 * Resolve an IP to a coarse geo-location using the free ipapi.co endpoint.
 *
 * Properties:
 *   - **fail-open**: any timeout/error/private-IP returns an empty location;
 *     callers fall back to displaying only the raw IP in the alert email.
 *   - **timeout 1s**: hard cap so the login flow never gets blocked.
 *   - **no key required**: free tier covers ~1k req/day; we only call on
 *     suspected new-device logins so volume stays tiny.
 *   - **no caching**: locations of dynamic IPs change; ~1ms saved isn't
 *     worth the staleness risk for security signals.
 */
export async function resolveGeoLocation(ip: string): Promise<GeoLocation> {
  if (!ip || ip === '0.0.0.0' || isPrivateIp(ip)) return EMPTY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'keeper-security' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return EMPTY;
    const json = (await res.json()) as {
      country_code?: string;
      city?: string;
      region?: string;
      error?: boolean;
    };
    if (json.error) return EMPTY;
    return {
      country: json.country_code ?? null,
      city: json.city ?? null,
      region: json.region ?? null,
    };
  } catch {
    return EMPTY;
  }
}

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  // 172.16.0.0 / 172.31.255.255
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const oct = parseInt(m[1]!, 10);
    if (oct >= 16 && oct <= 31) return true;
  }
  return false;
}

/** Human-readable location string for emails ("Lyon, France" / "France"). */
export function formatLocation(geo: GeoLocation): string | null {
  if (!geo.country && !geo.city) return null;
  if (geo.city && geo.country) return `${geo.city}, ${geo.country}`;
  return geo.city ?? geo.country ?? null;
}
