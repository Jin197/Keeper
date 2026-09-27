import 'server-only';
import { env } from '@/lib/env';
import { haversineKm, type FuelGrade, type FuelPriceProvider, type NearbyStation } from './types';

/**
 * Germany — Tankerkönig (creativecommons.tankerkoenig.de). Free API key,
 * data from the Markttransparenzstelle für Kraftstoffe (Bundeskartellamt),
 * so it is the official real-time feed. Radius max 25 km.
 */
const GRADE_TYPE: Partial<Record<FuelGrade, 'e5' | 'e10' | 'diesel'>> = {
  gasoline: 'e5',
  gasoline_98: 'e5',
  e10: 'e10',
  diesel: 'diesel',
};

interface TkStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  postCode: number;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  price?: number;
  e5?: number | false;
  e10?: number | false;
  diesel?: number | false;
  isOpen: boolean;
}

export const germanyFuelProvider: FuelPriceProvider = {
  country: 'DE',
  source: 'Tankerkönig / MTS-K',
  sourceUrl: 'https://creativecommons.tankerkoenig.de/',
  currency: 'EUR',
  isConfigured: () => Boolean(env.tankerkoenigApiKey()),
  async fetchNearby(lat, lng, radiusKm, grade) {
    const key = env.tankerkoenigApiKey();
    const type = GRADE_TYPE[grade];
    if (!key || !type) return [];
    const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${Math.min(25, radiusKm)}&sort=price&type=${type}&apikey=${key}`;
    try {
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (!res.ok) return [];
      const json = (await res.json()) as { ok?: boolean; stations?: TkStation[] };
      if (!json.ok) return [];
      return (json.stations ?? [])
        .filter((s) => typeof s.price === 'number' && s.price > 0)
        .map((s): NearbyStation => ({
          id: `de-${s.id}`,
          name: s.name,
          brand: s.brand || null,
          address: `${s.street} ${s.houseNumber}`.trim(),
          city: s.place,
          postcode: String(s.postCode),
          lat: s.lat,
          lng: s.lng,
          distanceKm: Math.round((s.dist ?? haversineKm(lat, lng, s.lat, s.lng)) * 10) / 10,
          price: s.price as number,
          currency: 'EUR',
          updatedAt: null,
          otherPrices: {
            ...(typeof s.e5 === 'number' ? { gasoline: s.e5 } : {}),
            ...(typeof s.e10 === 'number' ? { e10: s.e10 } : {}),
            ...(typeof s.diesel === 'number' ? { diesel: s.diesel } : {}),
          },
          isOpen: s.isOpen,
        }));
    } catch {
      return [];
    }
  },
};
