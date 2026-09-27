import { describe, it, expect } from 'vitest';
import { MODEL_SCHEDULES, resolveSchedule, activeWeakPoints, scheduleCoverage } from '@/lib/maintenance/schedules';
import { generateMaintenancePlan } from '@/lib/maintenance/plan';
import { KNOWLEDGE_BASE } from '@/lib/maintenance/knowledge-base';
import type { Vehicle } from '@/lib/types';

const focus: Vehicle = {
  id: 'v1', userId: 'u1', make: 'Ford', model: 'Focus Zetec 1.0 EcoBoost', year: 2015, plate: 'DE15 MOX', fuelType: 'thermal',
  purchaseDate: '2021-05-01', purchasePrice: 8000, currency: 'GBP', currentMileageKm: 112_480, imageUrl: '',
  estimatedResaleValue: 5000, resaleTrend: 'stable', country: 'GB',
};

describe('manufacturer schedules — data integrity', () => {
  it('every entry is well-formed', () => {
    const ids = new Set<string>();
    for (const s of MODEL_SCHEDULES) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.years[0]).toBeLessThanOrEqual(s.years[1]);
      expect(s.source.length).toBeGreaterThan(10);
      expect(s.markets.length).toBeGreaterThan(0);
      if (s.verified) expect(s.source).not.toMatch(/to confirm/i);
      for (const [cat, iv] of Object.entries(s.intervals)) {
        expect(cat in KNOWLEDGE_BASE).toBe(true);
        if (iv.km != null) expect(iv.km).toBeGreaterThan(1000);
        if (iv.months != null) expect(iv.months).toBeGreaterThan(0);
        if (iv.note) expect(iv.note.en && iv.note.fr).toBeTruthy();
      }
      for (const w of [...(s.weakPoints ?? []), ...(s.engines ?? []).flatMap((e) => e.weakPoints ?? [])]) {
        expect(w.en && w.fr).toBeTruthy();
        if (w.fromKm != null && w.toKm != null) expect(w.fromKm).toBeLessThan(w.toKm);
      }
    }
  });

  it('starts with ten unverified entries (flip verified only with a handbook reference)', () => {
    const c = scheduleCoverage();
    expect(c.total).toBe(10);
    expect(c.verified).toBe(0);
  });
});

describe('resolveSchedule', () => {
  it('matches make, model family, year and engine variant', () => {
    const r = resolveSchedule(focus)!;
    expect(r.schedule.id).toBe('ford-focus-mk3');
    expect(r.engine?.label).toBe('1.0 EcoBoost');
    expect(r.intervals.belt?.km).toBe(160_000); // engine override beats model default
    expect(r.intervals.oil?.km).toBe(20_000);
  });
  it('maps Opel to the Vauxhall entry and ignores out-of-range years', () => {
    expect(resolveSchedule({ make: 'Opel', model: 'Corsa', year: 2012, fuelType: 'thermal' })?.schedule.id).toBe('vauxhall-corsa-d-e');
    expect(resolveSchedule({ make: 'Ford', model: 'Focus', year: 2020, fuelType: 'thermal' })).toBeNull();
    expect(resolveSchedule({ make: 'Kia', model: 'Ceed', year: 2016, fuelType: 'thermal' })).toBeNull();
  });
  it('reports weak points inside the mileage window only', () => {
    const r = resolveSchedule(focus);
    expect(activeWeakPoints(r, 112_480).map((w) => w.category)).toContain('belt');
    expect(activeWeakPoints(r, 20_000).map((w) => w.category)).not.toContain('belt');
  });
});

describe('plan × schedule', () => {
  it('uses manufacturer intervals, marks the source and raises safety weak points', () => {
    const schedule = resolveSchedule(focus);
    const plan = generateMaintenancePlan(focus, [], [], new Date('2026-09-20'), 'en', { schedule });
    expect(plan.source).toBe('model');
    expect(plan.scheduleLabel).toContain('Focus Mk3');
    const belt = plan.tasks.find((t) => t.category === 'belt')!;
    expect(belt.source).toBe('model');
    expect(belt.intervalKm).toBe(160_000);
    expect(belt.note).toMatch(/Wet belt/);
    expect(belt.weakPoints?.[0].severity).toBe('safety');
    expect(['warning', 'critical']).toContain(belt.severity);
    expect(belt.scheduleVerified).toBe(false);
    // Generic categories still present (no gearbox on a manual with no schedule entry)
    expect(plan.tasks.some((t) => t.category === 'gearbox')).toBe(false);
    expect(plan.tasks.some((t) => t.category === 'fluid')).toBe(true);
  });
  it('hides a category the schedule marks as not applicable', () => {
    const corsa: Vehicle = { ...focus, make: 'Vauxhall', model: 'Corsa 1.2', year: 2013, currentMileageKm: 60_000 };
    const plan = generateMaintenancePlan(corsa, [], [], new Date('2026-09-20'), 'en', { schedule: resolveSchedule(corsa) });
    expect(plan.tasks.some((t) => t.category === 'belt')).toBe(false); // chain engine
  });
  it('falls back to generic intervals without a schedule', () => {
    const plan = generateMaintenancePlan(focus, [], [], new Date('2026-09-20'), 'en');
    expect(plan.source).toBe('generic');
    expect(plan.tasks.find((t) => t.category === 'belt')?.intervalKm).toBe(120_000);
  });
});
