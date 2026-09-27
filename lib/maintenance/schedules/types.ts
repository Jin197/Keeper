import type { MaintenanceCategory } from '@/lib/types';

/**
 * Per-model manufacturer service schedules — layer 1 of the forecast.
 *
 * One entry per model generation. Values are what the manufacturer's service
 * book says for the given markets; `verified` is false until someone has
 * checked the entry against the actual handbook (a PDF page, a dealer
 * schedule) and filled `source`. Unverified entries still render, but the UI
 * labels them "generic manufacturer interval — to confirm".
 *
 * Interval semantics: `km` and `months` are "whichever comes first"; `null`
 * means "not applicable / on condition only". A category absent from
 * `intervals` falls back to the generic knowledge base for the fuel type.
 */
export interface Interval {
  km: number | null;
  months: number | null;
  /** Override the generic cost estimate (EUR, independent garage). */
  estimatedCostEur?: number;
  /** Short note shown under the task ("wet belt — Ford revised to 10 yrs / 150k mi"). */
  note?: { en: string; fr: string };
}

export interface EngineVariant {
  /** Matches the free-text engine / trim / model string the lookup gave us. */
  match: RegExp;
  label: string;
  intervals?: Partial<Record<MaintenanceCategory, Interval>>;
  weakPoints?: WeakPoint[];
}

export interface WeakPoint {
  /** Category the weak point speaks to (drives which forecast card shows it). */
  category: MaintenanceCategory;
  /** Typical mileage window in km where it shows up, if known. */
  fromKm?: number;
  toKm?: number;
  en: string;
  fr: string;
  /** 'safety' raises severity when the vehicle is inside the window. */
  severity: 'info' | 'watch' | 'safety';
}

export interface ModelSchedule {
  /** Stable id, e.g. 'ford-focus-mk3'. */
  id: string;
  make: string;
  /** Regex on the normalised model family (UPPERCASE first token, e.g. "FOCUS"). */
  model: RegExp;
  /** Model years covered, inclusive. */
  years: [number, number];
  /** Fuel types this entry applies to; omit for all. */
  fuelTypes?: ('thermal' | 'hybrid' | 'electric')[];
  /** Human name shown in the UI ("Ford Focus Mk3 (2011–2018)"). */
  label: string;
  intervals: Partial<Record<MaintenanceCategory, Interval>>;
  engines?: EngineVariant[];
  weakPoints?: WeakPoint[];
  /** Where the numbers come from. Required before `verified` can be true. */
  source: string;
  verified: boolean;
  /** Markets the schedule was read for; other markets may differ slightly. */
  markets: string[];
}

export interface ResolvedSchedule {
  schedule: ModelSchedule;
  engine: EngineVariant | null;
  /** Merged intervals: engine override → model → (caller falls back to generic). */
  intervals: Partial<Record<MaintenanceCategory, Interval>>;
  weakPoints: WeakPoint[];
}
