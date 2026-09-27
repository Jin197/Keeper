/** Fuel grades we can compare across countries. */
export type FuelGrade = 'gasoline' | 'gasoline_98' | 'e10' | 'diesel' | 'e85' | 'lpg';

export interface NearbyStation {
  id: string;
  name: string;
  brand: string | null;
  address: string;
  city: string;
  postcode: string | null;
  lat: number;
  lng: number;
  /** Straight-line distance from the query point, km. */
  distanceKm: number;
  /** Price per litre in local currency for the requested grade. */
  price: number;
  currency: string;
  /** When the price was last reported by the source. */
  updatedAt: string | null;
  /** Other grades at this station, for the detail view. */
  otherPrices: Partial<Record<FuelGrade, number>>;
  isOpen: boolean | null;
}

export interface NearbyFuelResult {
  country: string;
  grade: FuelGrade;
  currency: string;
  source: string;
  sourceUrl: string;
  stations: NearbyStation[];
  /** Cheapest − most expensive among returned stations, per litre. */
  spreadPerLitre: number;
  /** Rough saving on a 45 L fill vs the median station. */
  savingsPerFillVsMedian: number;
  radiusKm: number;
  fetchedAt: string;
}

export interface FuelPriceProvider {
  country: string;
  source: string;
  sourceUrl: string;
  currency: string;
  isConfigured(): boolean;
  fetchNearby(lat: number, lng: number, radiusKm: number, grade: FuelGrade): Promise<NearbyStation[]>;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Pure — builds the summary from a station list. Exported for tests. */
export function summariseStations(
  stations: NearbyStation[],
  meta: Pick<NearbyFuelResult, 'country' | 'grade' | 'currency' | 'source' | 'sourceUrl' | 'radiusKm'>,
  fillLitres = 45,
): NearbyFuelResult {
  const sorted = [...stations].filter((s) => s.price > 0).sort((a, b) => a.price - b.price || a.distanceKm - b.distanceKm);
  const prices = sorted.map((s) => s.price);
  const spread = prices.length ? prices[prices.length - 1] - prices[0] : 0;
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  const savings = prices.length ? Math.max(0, (median - prices[0]) * fillLitres) : 0;
  return {
    ...meta,
    stations: sorted,
    spreadPerLitre: Math.round(spread * 1000) / 1000,
    savingsPerFillVsMedian: Math.round(savings * 100) / 100,
    fetchedAt: new Date().toISOString(),
  };
}
