import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectInputType, isValidFrenchPlate, lookupVehicle } from '@/lib/vehicle-lookup/router';
import * as sivFrance from '@/lib/vehicle-lookup/providers/siv-france';
import * as dvlaUk from '@/lib/vehicle-lookup/providers/dvla-uk';
import * as nhtsa from '@/lib/vehicle-lookup/providers/nhtsa';
import * as cache from '@/lib/vehicle-lookup/cache';

vi.mock('@/lib/vehicle-lookup/providers/siv-france');
vi.mock('@/lib/vehicle-lookup/providers/dvla-uk');
vi.mock('@/lib/vehicle-lookup/providers/nhtsa');
vi.mock('@/lib/vehicle-lookup/cache');

describe('Vehicle Lookup - Routeur & Regex Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectInputType', () => {
    it('detects SIV French plates (new format)', () => {
      expect(detectInputType('AA-123-AA')).toBe('plate-fr');
      expect(detectInputType('aa-123-aa')).toBe('plate-fr');
      expect(detectInputType('AA123AA')).toBe('plate-fr');
      expect(detectInputType('AA-123AA')).toBe('plate-fr');
    });

    it('detects FNI French plates (old format)', () => {
      expect(detectInputType('1234 AB 75')).toBe('plate-fr');
      expect(detectInputType('1234-AB-75')).toBe('unknown'); // regex doesn't support dashes for old plate directly
      expect(detectInputType('1234AB75')).toBe('plate-fr');
      expect(detectInputType('12 A 92')).toBe('plate-fr');
    });

    it('detects UK plates', () => {
      expect(detectInputType('AA12 AAA')).toBe('plate-uk');
      expect(detectInputType('aa12 aaa')).toBe('plate-uk');
      expect(detectInputType('AA12AAA')).toBe('plate-uk');
    });

    it('detects standard 17-character VINs', () => {
      const validVin = '1HGCR2F83HA000000';
      expect(detectInputType(validVin)).toBe('vin');
    });

    it('rejects invalid VINs containing I, O, or Q', () => {
      expect(detectInputType('1HGCR2F83IA000000')).toBe('unknown'); // contains I
      expect(detectInputType('1HGCR2F83OA000000')).toBe('unknown'); // contains O
      expect(detectInputType('1HGCR2F83QA000000')).toBe('unknown'); // contains Q
    });

    it('rejects inputs that do not match any known format', () => {
      expect(detectInputType('ABC-123')).toBe('unknown');
      expect(detectInputType('12345')).toBe('unknown');
      expect(detectInputType('')).toBe('unknown');
    });
  });

  describe('isValidFrenchPlate', () => {
    it('validates correct French plates regardless of spacing/dashes', () => {
      expect(isValidFrenchPlate('AA-123-AA')).toBe(true);
      expect(isValidFrenchPlate('AA 123 AA')).toBe(true);
      expect(isValidFrenchPlate('AA123AA')).toBe(true);
      expect(isValidFrenchPlate('1234 AB 75')).toBe(true);
      expect(isValidFrenchPlate('1234-AB-75')).toBe(true);
    });

    it('rejects invalid French plates', () => {
      expect(isValidFrenchPlate('A-123-AA')).toBe(false);
      expect(isValidFrenchPlate('AA-12-AA')).toBe(false);
      expect(isValidFrenchPlate('AA-1234-AA')).toBe(false);
      expect(isValidFrenchPlate('12345 AB 75')).toBe(false);
    });
  });

  describe('lookupVehicle Cascade', () => {
    it('returns cached result immediately on cache hit', async () => {
      const cachedData = {
        plate: 'AA123AA',
        make: 'Peugeot',
        model: '208',
        year: 2020,
        fuel_type: 'thermal',
        engine: '1.2 PureTech',
        vin: 'VF3AD...',
        color: 'Blue',
        trim: 'Allure',
        source: 'cache' as const,
      };

      vi.mocked(cache.getCachedLookup).mockResolvedValue(cachedData);

      const res = await lookupVehicle('AA-123-AA');
      expect(res.success).toBe(true);
      expect(res.data).toEqual(cachedData);
      expect(res.inputType).toBe('plate-fr');
      expect(sivFrance.lookupBySivFrance).not.toHaveBeenCalled();
    });

    it('calls SIV France when FR plate lookup is triggered and cache misses', async () => {
      vi.mocked(cache.getCachedLookup).mockResolvedValue(null);
      vi.mocked(sivFrance.isSivConfigured).mockReturnValue(true);
      
      const sivData = {
        plate: 'AA123AA',
        make: 'Renault',
        model: 'Clio',
        year: 2021,
        fuel_type: 'hybrid',
        engine: '1.6 E-Tech',
        vin: 'VF1R...',
        color: 'Grey',
        trim: 'Intens',
        source: 'siv' as const,
      };
      vi.mocked(sivFrance.lookupBySivFrance).mockResolvedValue(sivData);

      const res = await lookupVehicle('AA-123-AA');
      expect(res.success).toBe(true);
      expect(res.data).toEqual(sivData);
      expect(res.inputType).toBe('plate-fr');
      expect(cache.setCachedLookup).toHaveBeenCalledWith('AA123AA', sivData);
    });

    it('falls back to NHTSA US to enrich French lookup when VIN is present but engine/trim is missing', async () => {
      vi.mocked(cache.getCachedLookup).mockResolvedValue(null);
      vi.mocked(sivFrance.isSivConfigured).mockReturnValue(true);

      const baseSivData = {
        plate: 'AA123AA',
        make: 'Renault',
        model: 'Clio',
        year: 2021,
        fuel_type: 'hybrid',
        engine: '',
        vin: 'VF1R...',
        color: 'Grey',
        trim: '',
        source: 'siv' as const,
      };
      vi.mocked(sivFrance.lookupBySivFrance).mockResolvedValue(baseSivData);

      const nhtsaEnriched = {
        plate: 'AA123AA',
        make: 'Renault',
        model: 'Clio',
        year: 2021,
        fuel_type: 'hybrid',
        engine: '1.6L 4cyl FWD',
        vin: 'VF1R...',
        color: '',
        trim: 'Intens',
        source: 'nhtsa' as const,
      };
      vi.mocked(nhtsa.lookupByNhtsa).mockResolvedValue(nhtsaEnriched);

      const res = await lookupVehicle('AA-123-AA');
      expect(res.success).toBe(true);
      expect(res.data?.engine).toBe('1.6L 4cyl FWD');
      expect(res.data?.trim).toBe('Intens');
      expect(res.data?.source).toBe('siv'); // Primary source is kept
    });

    it('calls DVLA UK when UK plate is matched', async () => {
      vi.mocked(cache.getCachedLookup).mockResolvedValue(null);
      vi.mocked(dvlaUk.isDvlaConfigured).mockReturnValue(true);

      const dvlaData = {
        plate: 'AB12CDE',
        make: 'Vauxhall',
        model: '',
        year: 2018,
        fuel_type: 'thermal',
        engine: '1398cc',
        vin: '',
        color: 'Red',
        trim: '',
        source: 'dvla' as const,
      };
      vi.mocked(dvlaUk.lookupByDvla).mockResolvedValue(dvlaData);

      const res = await lookupVehicle('AB12 CDE');
      expect(res.success).toBe(true);
      expect(res.data).toEqual(dvlaData);
      expect(res.inputType).toBe('plate-uk');
    });
  });
});

describe('lookup errors are message keys, never sentences', () => {
  it('never leaks a hard-coded language into the response', async () => {
    const { lookupVehicle } = await import('@/lib/vehicle-lookup/router');
    for (const input of ['HELLO', 'AA-123-AA', 'AB12CDE', 'X'.repeat(17)]) {
      const res = await lookupVehicle(input);
      if (res.success) continue;
      // The route localises `errorKey`; a raw `error` string would ship one language.
      expect(res).not.toHaveProperty('error');
      expect(typeof res.errorKey).toBe('string');
      expect(res.errorKey).toMatch(/^[a-zA-Z]+$/);
    }
  });
});
