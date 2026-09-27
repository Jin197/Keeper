import { describe, it, expect } from 'vitest';
import { kmBandFor, ageBandFor, normaliseMake, normaliseModel, buildProfile } from '@/lib/vehicle-data/failure-rates';

const row = (make: string, model: string, age: string, system: string, tests: number, failures: number) => ({
  make, model, age_band: age, km_band: '100-120k', system, tests, failures, advisories: 0, fail_rate: failures / tests, source_years: '2023',
});

describe('DVSA bands & normalisation (must mirror scripts/dvsa/systems.mjs)', () => {
  it('buckets km into 20k bands and caps at 240k+', () => {
    expect(kmBandFor(0)).toBeNull();
    expect(kmBandFor(15_000)).toBe('0-20k');
    expect(kmBandFor(112_480)).toBe('100-120k');
    expect(kmBandFor(239_999)).toBe('220-240k');
    expect(kmBandFor(300_000)).toBe('240k+');
  });
  it('buckets age from the first MOT at 3 years', () => {
    expect(ageBandFor(2)).toBeNull();
    expect(ageBandFor(4)).toBe('3-5');
    expect(ageBandFor(11.5)).toBe('9-11');
    expect(ageBandFor(20)).toBe('15+');
  });
  it('collapses model variants to the family and aliases makes', () => {
    expect(normaliseModel('Focus Zetec 1.0 EcoBoost')).toBe('FOCUS');
    expect(normaliseModel('Grand Scenic')).toBe('GRAND SCENIC');
    expect(normaliseModel('Model 3')).toBe('MODEL 3');
    expect(normaliseMake('Mercedes-Benz')).toBe('MERCEDES');
    expect(normaliseMake('Opel')).toBe('VAUXHALL');
    expect(normaliseMake('vw')).toBe('VOLKSWAGEN');
  });
});

describe('buildProfile', () => {
  const rows = [
    row('FORD', 'FOCUS', 'ALL', 'any', 5000, 1500),
    row('FORD', 'FOCUS', 'ALL', 'brakes', 5000, 1250),
    row('FORD', 'FOCUS', 'ALL', 'tyres', 5000, 400),
    row('FORD', 'FOCUS', '9-11', 'any', 2000, 700),
    row('FORD', 'FOCUS', '9-11', 'brakes', 2000, 620),
    row('*', '*', 'ALL', 'any', 900000, 250000),
    row('*', '*', 'ALL', 'brakes', 900000, 135000),
    row('*', '*', 'ALL', 'tyres', 900000, 90000),
  ];

  it('prefers the age-specific model cell and compares to the fleet', () => {
    const p = buildProfile(rows, { make: 'FORD', model: 'FOCUS', kmBand: '100-120k', ageBand: '9-11' })!;
    expect(p.basis).toBe('model');
    expect(p.ageBand).toBe('9-11');
    expect(p.tests).toBe(2000);
    expect(p.overallRate).toBeCloseTo(0.35, 3);
    const brakes = p.systems.find((s) => s.system === 'brakes')!;
    expect(brakes.rate).toBeCloseTo(0.31, 3);
    expect(brakes.fleetRate).toBeCloseTo(0.15, 3);
    expect(brakes.ratio).toBeCloseTo(2.07, 2);
    expect(p.highlights[0].system).toBe('brakes');
  });

  it('falls back to the all-ages cell, then to the fleet', () => {
    const p = buildProfile(rows, { make: 'FORD', model: 'FOCUS', kmBand: '100-120k', ageBand: '15+' })!;
    expect(p.ageBand).toBeNull();
    expect(p.tests).toBe(5000);
    const f = buildProfile(rows, { make: 'KIA', model: 'CEED', kmBand: '100-120k', ageBand: '6-8' })!;
    expect(f.basis).toBe('fleet');
    expect(f.overallRate).toBeCloseTo(250000 / 900000, 4);
  });

  it('returns null when nothing matches the band', () => {
    expect(buildProfile(rows, { make: 'FORD', model: 'FOCUS', kmBand: '200-220k', ageBand: null })).toBeNull();
  });
});
