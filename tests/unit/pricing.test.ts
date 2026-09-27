import { describe, it, expect } from 'vitest';
import { priceBandForCountry, currencyForCountry, resolvePricing, formatPrice, PRICE_TABLE, PRICED_COUNTRIES } from '@/lib/pricing';

describe('territory pricing', () => {
  it('puts high-income countries on band A, mid on B, low on C', () => {
    expect(priceBandForCountry('GB')).toBe('A');
    expect(priceBandForCountry('US')).toBe('A');
    expect(priceBandForCountry('FR')).toBe('A');
    expect(priceBandForCountry('BR')).toBe('B');
    expect(priceBandForCountry('PL')).toBe('B');
    expect(priceBandForCountry('MA')).toBe('C');
    expect(priceBandForCountry('IN')).toBe('C');
    expect(priceBandForCountry('SN')).toBe('C');
  });

  it('defaults unknown / missing countries to band A and USD', () => {
    expect(priceBandForCountry(undefined)).toBe('A');
    expect(priceBandForCountry('ZZ')).toBe('A');
    expect(currencyForCountry('ZZ')).toBe('USD');
  });

  it('resolves the local currency line for the country', () => {
    const gb = resolvePricing('GB');
    expect(gb.currency).toBe('GBP');
    expect(gb.monthly).toBe(3.99);
    expect(gb.band).toBe('A');

    const br = resolvePricing('BR');
    expect(br.currency).toBe('BRL');
    expect(br.band).toBe('B');

    const sn = resolvePricing('SN');
    expect(sn.currency).toBe('XOF');
    expect(sn.band).toBe('C');
  });

  it('lets a preferred currency win when the band has a line for it', () => {
    expect(resolvePricing('MA', 'EUR').currency).toBe('EUR');
    expect(resolvePricing('MA', 'EUR').band).toBe('C'); // still the local band
    expect(resolvePricing('GB', 'XYZ').currency).toBe('GBP'); // unknown → country default
  });

  it('yearly is cheaper per month than monthly, in every line', () => {
    for (const band of ['A', 'B', 'C'] as const) {
      for (const line of Object.values(PRICE_TABLE[band])) {
        expect(line.yearly).toBeLessThan(line.monthly * 12);
        expect(line.saleDossier).toBeGreaterThan(0);
      }
    }
  });

  it('every priced country resolves without throwing', () => {
    for (const cc of PRICED_COUNTRIES) {
      const p = resolvePricing(cc);
      expect(p.monthly).toBeGreaterThan(0);
      expect(p.yearlySavingsPct).toBeGreaterThan(0);
    }
  });

  it('formats zero-decimal currencies without cents', () => {
    expect(formatPrice(600, 'XOF', 'fr')).not.toMatch(/,00/);
    expect(formatPrice(3.99, 'GBP', 'en-GB')).toBe('£3.99');
    expect(formatPrice(39, 'GBP', 'en-GB')).toBe('£39');
  });
});
