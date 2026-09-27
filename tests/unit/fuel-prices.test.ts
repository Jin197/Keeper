import { describe, it, expect } from 'vitest';
import { haversineKm, summariseStations, type NearbyStation } from '@/lib/fuel-prices/types';
import { countryForCoords } from '@/lib/fuel-prices';

const station = (id: string, price: number, distanceKm = 1): NearbyStation => ({
  id, name: id, brand: null, address: '', city: '', postcode: null, lat: 0, lng: 0, distanceKm, price, currency: 'EUR', updatedAt: null, otherPrices: {}, isOpen: null,
});

describe('fuel price summary', () => {
  it('sorts cheapest first and computes spread and savings vs median', () => {
    const r = summariseStations([station('a', 1.80), station('b', 1.65), station('c', 1.72)], {
      country: 'FR', grade: 'diesel', currency: 'EUR', source: 's', sourceUrl: 'u', radiusKm: 5,
    });
    expect(r.stations.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(r.spreadPerLitre).toBeCloseTo(0.15, 3);
    // median = 1.72 → (1.72 − 1.65) × 45 L = 3.15
    expect(r.savingsPerFillVsMedian).toBeCloseTo(3.15, 2);
  });

  it('drops stations without a price', () => {
    const r = summariseStations([station('a', 0), station('b', 1.5)], { country: 'FR', grade: 'e10', currency: 'EUR', source: 's', sourceUrl: 'u', radiusKm: 5 });
    expect(r.stations).toHaveLength(1);
  });

  it('haversine is roughly right (Paris → Lyon ≈ 392 km)', () => {
    expect(haversineKm(48.8566, 2.3522, 45.764, 4.8357)).toBeGreaterThan(385);
    expect(haversineKm(48.8566, 2.3522, 45.764, 4.8357)).toBeLessThan(400);
  });

  it('routes coordinates to the national feed', () => {
    expect(countryForCoords(48.85, 2.35)).toBe('FR');
    expect(countryForCoords(52.52, 13.4)).toBe('DE');
    expect(countryForCoords(48.57, 7.75)).toBe('FR'); // Strasbourg
    expect(countryForCoords(48.0, 7.85)).toBe('DE'); // Freiburg
    expect(countryForCoords(51.5, -0.12)).toBeNull(); // London — no feed yet
  });
});
