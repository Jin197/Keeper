import 'server-only';
import { franceFuelProvider } from './france';
import { germanyFuelProvider } from './germany';
import { summariseStations, type FuelGrade, type FuelPriceProvider, type NearbyFuelResult } from './types';

export type { FuelGrade, NearbyFuelResult, NearbyStation } from './types';

const PROVIDERS: FuelPriceProvider[] = [franceFuelProvider, germanyFuelProvider];

/** Coarse bounding boxes — enough to route a GPS fix to the right national feed. */
const BBOX: Record<string, [number, number, number, number]> = {
  // [minLat, maxLat, minLng, maxLng]
  FR: [41.3, 51.2, -5.3, 9.6],
  DE: [47.2, 55.1, 5.8, 15.1],
};

export function countryForCoords(lat: number, lng: number): string | null {
  // France and Germany overlap along the Rhine (≈ 7.8° E between Basel and
  // Karlsruhe); east of it above 47.5° N is Germany.
  for (const [cc, [a, b, c, d]] of Object.entries(BBOX)) {
    if (lat >= a && lat <= b && lng >= c && lng <= d) {
      if (cc === 'FR' && lng > 7.8 && lat > 47.5) continue;
      return cc;
    }
  }
  return null;
}

export function fuelPriceCountries(): { country: string; configured: boolean; source: string }[] {
  return PROVIDERS.map((p) => ({ country: p.country, configured: p.isConfigured(), source: p.source }));
}

export async function getNearbyFuelPrices(
  lat: number,
  lng: number,
  grade: FuelGrade,
  opts: { radiusKm?: number; country?: string | null } = {},
): Promise<NearbyFuelResult | { unavailable: true; country: string | null; reason: 'no-provider' | 'not-configured' }> {
  const radiusKm = Math.min(25, Math.max(1, opts.radiusKm ?? 5));
  const country = opts.country?.toUpperCase() || countryForCoords(lat, lng);
  const provider = PROVIDERS.find((p) => p.country === country);
  if (!provider) return { unavailable: true, country, reason: 'no-provider' };
  if (!provider.isConfigured()) return { unavailable: true, country, reason: 'not-configured' };

  const stations = await provider.fetchNearby(lat, lng, radiusKm, grade);
  return summariseStations(stations, {
    country: provider.country,
    grade,
    currency: provider.currency,
    source: provider.source,
    sourceUrl: provider.sourceUrl,
    radiusKm,
  });
}
