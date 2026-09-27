import { describe, it, expect } from 'vitest';
import { computeReminders, upcomingWithin } from '@/lib/reminders/forecast';
import { DEFAULT_NOTIFICATION_PREFS } from '@/lib/types';
import type { MaintenanceTask } from '@/lib/maintenance/plan';

const now = new Date('2026-09-20T08:00:00Z');
const vehicle = { id: 'v1', make: 'Ford', model: 'Focus', plate: 'DE15 MOX', insuranceRenewalDate: '2026-10-05', insuranceProvider: 'Admiral' };

const task = (over: Partial<MaintenanceTask>): MaintenanceTask => ({
  category: 'brakes', title: 'Brakes', description: '', dueAtDate: '2026-10-10', daysUntilDue: 20, kmUntilDue: 800,
  severity: 'warning', estimatedCost: 280, source: 'model', confidence: 0.7, reasoning: '', ...over,
});

describe('computeReminders', () => {
  it('emits ahead / soon / overdue phases with stable dedupe keys', () => {
    const rs = computeReminders(vehicle, { tasks: [
      task({ daysUntilDue: 20 }),
      task({ category: 'oil', title: 'Oil', daysUntilDue: 5, dueAtDate: '2026-09-25' }),
      task({ category: 'belt', title: 'Belt', daysUntilDue: -3, dueAtDate: '2026-09-17', severity: 'critical' }),
    ] }, DEFAULT_NOTIFICATION_PREFS, now);
    const keys = rs.map((r) => r.dedupeKey);
    expect(keys).toContain('forecast:v1:brakes:2026-10-10:ahead');
    expect(keys).toContain('forecast:v1:oil:2026-09-25:soon');
    expect(keys).toContain('forecast:v1:belt:2026-09-17:overdue');
    expect(rs.find((r) => r.phase === 'ahead')?.email).toBe(false);
    expect(rs.find((r) => r.phase === 'overdue')?.email).toBe(true);
  });

  it('does not nag about low-severity items a month ahead, but does for inspections', () => {
    const rs = computeReminders(vehicle, { tasks: [
      task({ category: 'filter', title: 'Filters', daysUntilDue: 25, severity: 'info' }),
      task({ category: 'inspection', title: 'MOT', daysUntilDue: 25, severity: 'info', dueAtDate: '2026-10-15' }),
    ] }, DEFAULT_NOTIFICATION_PREFS, now);
    expect(rs.some((r) => r.dedupeKey.includes(':filter:'))).toBe(false);
    const mot = rs.find((r) => r.kind === 'inspection_due')!;
    expect(mot.messageKey).toBe('inspectionAhead');
    expect(mot.email).toBe(true);
  });

  it('adds the insurance renewal and respects preferences', () => {
    const all = computeReminders(vehicle, { tasks: [] }, DEFAULT_NOTIFICATION_PREFS, now);
    expect(all).toHaveLength(1);
    expect(all[0].kind).toBe('insurance_renewal');
    expect(all[0].params.days).toBe(15);
    expect(all[0].dedupeKey).toBe('insurance:v1:2026-10-05:ahead');

    const muted = computeReminders(vehicle, { tasks: [task({ daysUntilDue: 3 })] }, { ...DEFAULT_NOTIFICATION_PREFS, forecast: false, insurance: false }, now);
    expect(muted).toHaveLength(0);
  });

  it('ignores things more than 30 days out', () => {
    expect(computeReminders({ ...vehicle, insuranceRenewalDate: '2027-01-01' }, { tasks: [task({ daysUntilDue: 45 })] }, DEFAULT_NOTIFICATION_PREFS, now)).toHaveLength(0);
  });

  it('upcomingWithin sorts soonest first', () => {
    const list = upcomingWithin([task({ daysUntilDue: 20 }), task({ category: 'oil', daysUntilDue: -1 }), task({ category: 'tires', daysUntilDue: 60 })]);
    expect(list.map((t) => t.category)).toEqual(['oil', 'brakes']);
  });
});
