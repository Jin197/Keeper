import type { Vehicle, MaintenanceCategory } from '@/lib/types';
import { MODEL_SCHEDULES } from './models';
import type { Interval, ModelSchedule, ResolvedSchedule, WeakPoint } from './types';

export type { Interval, ModelSchedule, ResolvedSchedule, WeakPoint } from './types';
export { MODEL_SCHEDULES } from './models';

/** Same family normalisation as the DVSA layer, so both key on the same string. */
function modelFamily(raw: string): string {
  const tokens = raw.toUpperCase().replace(/[^A-Z0-9 .-]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  const two = new Set(['GRAND', 'MODEL', 'RANGE', 'SERIES', 'LAND', 'SANTA', 'NEW', 'CLASSE', 'CLASS']);
  return two.has(tokens[0]) && tokens[1] ? `${tokens[0]} ${tokens[1]}` : tokens[0];
}

const MAKE_ALIASES: Record<string, string> = { OPEL: 'VAUXHALL', 'MERCEDES-BENZ': 'MERCEDES', VW: 'VOLKSWAGEN', 'CITROËN': 'CITROEN' };
function makeKey(raw: string): string {
  const m = raw.toUpperCase().trim();
  return MAKE_ALIASES[m] ?? m;
}

/**
 * Find the manufacturer schedule for a vehicle, merging the engine variant
 * that best matches its model/trim string. Returns null when we have no
 * entry — the plan then uses the generic knowledge base and says so.
 */
export function resolveSchedule(
  vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'fuelType' | 'trim'>,
  schedules: ModelSchedule[] = MODEL_SCHEDULES,
): ResolvedSchedule | null {
  const make = makeKey(vehicle.make);
  const family = modelFamily(vehicle.model);
  const schedule = schedules.find(
    (s) =>
      s.make === make &&
      s.model.test(family) &&
      vehicle.year >= s.years[0] &&
      vehicle.year <= s.years[1] &&
      (!s.fuelTypes || s.fuelTypes.includes(vehicle.fuelType)),
  );
  if (!schedule) return null;

  const haystack = `${vehicle.model} ${vehicle.trim ?? ''}`.trim();
  const engine = schedule.engines?.find((e) => e.match.test(haystack)) ?? null;

  const intervals: Partial<Record<MaintenanceCategory, Interval>> = { ...schedule.intervals, ...(engine?.intervals ?? {}) };
  const weakPoints = [...(schedule.weakPoints ?? []), ...(engine?.weakPoints ?? [])];
  return { schedule, engine, intervals, weakPoints };
}

/** Weak points that apply at the vehicle's current mileage (± a 20 % margin before the window opens). */
export function activeWeakPoints(resolved: ResolvedSchedule | null, currentKm: number): WeakPoint[] {
  if (!resolved) return [];
  return resolved.weakPoints.filter((w) => {
    const from = (w.fromKm ?? 0) * 0.8;
    const to = w.toKm ?? Number.POSITIVE_INFINITY;
    return currentKm >= from && currentKm <= to;
  });
}

/** Coverage summary for docs/tests: how many entries are verified. */
export function scheduleCoverage(schedules: ModelSchedule[] = MODEL_SCHEDULES) {
  return { total: schedules.length, verified: schedules.filter((s) => s.verified).length };
}
