import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Vehicle } from '@/lib/types';

/**
 * Layer 3 of the maintenance forecast: what actually fails on *this model*
 * at *this mileage*, from ~40 M anonymised MOT tests a year (DfT open data),
 * aggregated offline by `scripts/dvsa/build-failure-rates.mjs` into
 * `model_failure_rates`.
 *
 * Nothing here is a prediction about the owner's car; it is the population
 * base rate — "1 Focus in 3 fails on brakes between 100k and 120k km" — and
 * the UI says so. When the table is empty (pipeline not run yet) the whole
 * layer simply doesn't render.
 */

export const FAILURE_SYSTEMS = [
  'brakes',
  'suspension',
  'tyres',
  'steering',
  'lamps',
  'emissions',
  'body',
  'visibility',
  'seatbelts',
  'wheels',
  'other',
] as const;
export type FailureSystem = (typeof FAILURE_SYSTEMS)[number];

export interface SystemRate {
  system: FailureSystem;
  /** Share of MOT tests on this model/band with ≥ 1 failure in the system, 0–1. */
  rate: number;
  /** Same share across every make and model in the same band. */
  fleetRate: number | null;
  /** rate / fleetRate; > 1 means worse than average. Null when no baseline. */
  ratio: number | null;
  tests: number;
  failures: number;
  advisories: number;
}

export interface ModelFailureProfile {
  make: string;
  model: string;
  kmBand: string;
  ageBand: string | null;
  /** Tests behind the model cell; drives the confidence wording. */
  tests: number;
  /** Overall MOT failure rate on this model/band. */
  overallRate: number;
  fleetOverallRate: number | null;
  systems: SystemRate[];
  /** The systems most worth flagging: worst ratio first, min 5 % rate. */
  highlights: SystemRate[];
  sourceYears: string | null;
  /** 'model' when the exact make/model matched, 'fleet' when we only have the baseline. */
  basis: 'model' | 'fleet';
}

const MI_TO_KM = 1.609344;

/** Mirrors scripts/dvsa/systems.mjs — keep the two in sync. */
export function kmBandFor(km: number): string | null {
  if (!Number.isFinite(km) || km <= 0) return null;
  if (km >= 240_000) return '240k+';
  const lo = Math.floor(km / 20_000) * 20;
  return `${lo}-${lo + 20}k`;
}

export function ageBandFor(ageYears: number): string | null {
  if (!Number.isFinite(ageYears) || ageYears < 3) return null;
  if (ageYears < 6) return '3-5';
  if (ageYears < 9) return '6-8';
  if (ageYears < 12) return '9-11';
  if (ageYears < 15) return '12-14';
  return '15+';
}

const TWO_WORD_PREFIXES = new Set(['GRAND', 'MODEL', 'RANGE', 'SERIES', 'LAND', 'SANTA', 'NEW', 'CLASSE', 'CLASS']);
export function normaliseModel(raw: string): string {
  const tokens = raw.toUpperCase().replace(/[^A-Z0-9 .-]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  if (TWO_WORD_PREFIXES.has(tokens[0]) && tokens[1]) return `${tokens[0]} ${tokens[1]}`;
  return tokens[0];
}

const MAKE_ALIASES: Record<string, string> = {
  'MERCEDES-BENZ': 'MERCEDES',
  'MERCEDES BENZ': 'MERCEDES',
  VW: 'VOLKSWAGEN',
  'CITROËN': 'CITROEN',
  OPEL: 'VAUXHALL', // same cars, badged Vauxhall in the UK dataset
  'DS AUTOMOBILES': 'DS',
};
export function normaliseMake(raw: string): string {
  const m = raw.toUpperCase().trim().replace(/\s+/g, ' ');
  return MAKE_ALIASES[m] ?? m;
}

interface Row {
  make: string;
  model: string;
  age_band: string;
  km_band: string;
  system: string;
  tests: number;
  failures: number;
  advisories: number;
  fail_rate: number;
  source_years: string | null;
}

export async function getModelFailureProfile(
  vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'currentMileageKm'>,
  opts: { odometerKm?: number | null; now?: Date } = {},
): Promise<ModelFailureProfile | null> {
  const km = opts.odometerKm ?? vehicle.currentMileageKm;
  const kmBand = kmBandFor(km);
  if (!kmBand) return null;
  const now = opts.now ?? new Date();
  const ageBand = ageBandFor(now.getFullYear() - vehicle.year + 0.5);
  const make = normaliseMake(vehicle.make);
  const model = normaliseModel(vehicle.model);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('model_failure_rates')
    .select('make, model, age_band, km_band, system, tests, failures, advisories, fail_rate, source_years')
    .eq('km_band', kmBand)
    .or(`and(make.eq.${quote(make)},model.eq.${quote(model)}),and(make.eq.${quote('*')},model.eq.${quote('*')})`)
    .in('age_band', ageBand ? [ageBand, 'ALL'] : ['ALL']);
  if (error || !data || data.length === 0) return null;

  const rows = data as unknown as Row[];
  return buildProfile(rows, { make, model, kmBand, ageBand });
}

/** Pure — exported for tests. Prefers the age-specific model cell, then model/ALL, then fleet. */
export function buildProfile(
  rows: Row[],
  key: { make: string; model: string; kmBand: string; ageBand: string | null },
): ModelFailureProfile | null {
  const pick = (mk: string, md: string, age: string) =>
    rows.filter((r) => r.make === mk && r.model === md && r.age_band === age && r.km_band === key.kmBand);

  const modelRows =
    (key.ageBand && pick(key.make, key.model, key.ageBand).length >= 2 ? pick(key.make, key.model, key.ageBand) : null) ??
    pick(key.make, key.model, 'ALL');
  const fleetRows =
    (key.ageBand && pick('*', '*', key.ageBand).length >= 2 ? pick('*', '*', key.ageBand) : null) ?? pick('*', '*', 'ALL');

  const basisRows = modelRows.length ? modelRows : fleetRows;
  if (!basisRows.length) return null;
  const basis: ModelFailureProfile['basis'] = modelRows.length ? 'model' : 'fleet';

  const any = basisRows.find((r) => r.system === 'any');
  const fleetAny = fleetRows.find((r) => r.system === 'any');
  if (!any) return null;

  const fleetBySystem = new Map(fleetRows.map((r) => [r.system, r]));
  const systems: SystemRate[] = basisRows
    .filter((r): r is Row & { system: FailureSystem } => (FAILURE_SYSTEMS as readonly string[]).includes(r.system))
    .map((r) => {
      const fleet = fleetBySystem.get(r.system);
      const fleetRate = fleet ? Number(fleet.fail_rate) : null;
      return {
        system: r.system,
        rate: Number(r.fail_rate),
        fleetRate,
        ratio: fleetRate && fleetRate > 0 ? Number(r.fail_rate) / fleetRate : null,
        tests: Number(r.tests),
        failures: Number(r.failures),
        advisories: Number(r.advisories),
      };
    })
    .sort((a, b) => b.rate - a.rate);

  const highlights = systems
    .filter((s) => s.rate >= 0.05)
    .sort((a, b) => (b.ratio ?? b.rate) - (a.ratio ?? a.rate))
    .slice(0, 3);

  return {
    make: key.make,
    model: key.model,
    kmBand: key.kmBand,
    ageBand: modelRows.length && key.ageBand && modelRows[0].age_band !== 'ALL' ? key.ageBand : null,
    tests: Number(any.tests),
    overallRate: Number(any.fail_rate),
    fleetOverallRate: fleetAny ? Number(fleetAny.fail_rate) : null,
    systems,
    highlights,
    sourceYears: any.source_years ?? null,
    basis,
  };
}

/** PostgREST filter values: wrap in double quotes and escape embedded quotes. */
function quote(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}

/** Which forecast category a failure system speaks to, for the Health page cards. */
export const SYSTEM_TO_CATEGORY: Partial<Record<FailureSystem, 'brakes' | 'tires' | 'other' | 'inspection' | 'battery'>> = {
  brakes: 'brakes',
  tyres: 'tires',
  wheels: 'tires',
  suspension: 'other',
  steering: 'other',
  lamps: 'inspection',
  visibility: 'inspection',
  emissions: 'inspection',
  body: 'inspection',
  seatbelts: 'inspection',
};

/** Message key (namespace `knownIssues`) for each system's human label. */
export const SYSTEM_LABEL_KEY = {
  brakes: 'sysBrakes',
  suspension: 'sysSuspension',
  tyres: 'sysTyres',
  steering: 'sysSteering',
  lamps: 'sysLamps',
  emissions: 'sysEmissions',
  body: 'sysBody',
  visibility: 'sysVisibility',
  seatbelts: 'sysSeatbelts',
  wheels: 'sysWheels',
  other: 'sysOther',
} as const satisfies Record<FailureSystem, string>;
