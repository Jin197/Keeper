import 'server-only';
import { haversineKm, type FuelGrade, type FuelPriceProvider, type NearbyStation } from './types';

/**
 * France — "Prix des carburants en France · flux instantané" (open data,
 * Ministère de l'Économie). No key. Prices are pushed by the stations
 * themselves under legal obligation, so freshness is hours, not days.
 *
 * https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/
 */
const DATASET = 'prix-des-carburants-en-france-flux-instantane-v2';
const BASE = `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/${DATASET}/records`;

const GRADE_FIELD: Record<FuelGrade, string> = {
  gasoline: 'sp95_prix',
  gasoline_98: 'sp98_prix',
  e10: 'e10_prix',
  diesel: 'gazole_prix',
  e85: 'e85_prix',
  lpg: 'gplc_prix',
};
const GRADE_UPDATED: Record<FuelGrade, string> = {
  gasoline: 'sp95_maj',
  gasoline_98: 'sp98_maj',
  e10: 'e10_maj',
  diesel: 'gazole_maj',
  e85: 'e85_maj',
  lpg: 'gplc_maj',
};

interface Rec {
  id?: number | string;
  adresse?: string;
  ville?: string;
  cp?: string;
  geom?: { lon: number; lat: number } | null;
  horaires_automate_24_24?: string;
  [k: string]: unknown;
}

export const franceFuelProvider: FuelPriceProvider = {
  country: 'FR',
  source: 'prix-carburants.gouv.fr',
  sourceUrl: 'https://www.prix-carburants.gouv.fr/',
  currency: 'EUR',
  isConfigured: () => true,
  async fetchNearby(lat, lng, radiusKm, grade) {
    const field = GRADE_FIELD[grade];
    const where = `within_distance(geom, geom'POINT(${lng} ${lat})', ${Math.round(radiusKm * 1000)}m) AND ${field} IS NOT NULL`;
    const url = `${BASE}?where=${encodeURIComponent(where)}&order_by=${field}&limit=40`;
    try {
      const res = await fetch(url, { next: { revalidate: 900 } });
      if (!res.ok) return [];
      const json = (await res.json()) as { results?: Rec[] };
      return (json.results ?? [])
        .map((r): NearbyStation | null => {
          const price = Number(r[field]);
          if (!r.geom || !Number.isFinite(price) || price <= 0) return null;
          const others: Partial<Record<FuelGrade, number>> = {};
          for (const g of Object.keys(GRADE_FIELD) as FuelGrade[]) {
            const v = Number(r[GRADE_FIELD[g]]);
            if (Number.isFinite(v) && v > 0) others[g] = v;
          }
          return {
            id: `fr-${r.id ?? `${r.geom.lat},${r.geom.lon}`}`,
            name: (r.ville ?? 'Station').toString(),
            brand: null,
            address: (r.adresse ?? '').toString(),
            city: (r.ville ?? '').toString(),
            postcode: (r.cp ?? null) as string | null,
            lat: r.geom.lat,
            lng: r.geom.lon,
            distanceKm: Math.round(haversineKm(lat, lng, r.geom.lat, r.geom.lon) * 10) / 10,
            price,
            currency: 'EUR',
            updatedAt: (r[GRADE_UPDATED[grade]] as string | undefined) ?? null,
            otherPrices: others,
            isOpen: r.horaires_automate_24_24 === 'Oui' ? true : null,
          };
        })
        .filter((s): s is NearbyStation => s !== null);
    } catch {
      return [];
    }
  },
};
