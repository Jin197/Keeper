import type { Vehicle, FuelEntry, MaintenanceEntry } from '@/lib/types';
import {
  KNOWLEDGE_BASE,
  firstInspectionMonths,
  inspectionCycleFor,
  type Category,
  type IntervalSpec,
  type Severity,
} from './knowledge-base';
import type { ResolvedSchedule, WeakPoint } from './schedules';
import { activeWeakPoints } from './schedules';

/**
 * Where a task's interval came from:
 *  generic      — knowledge-base default for the fuel type
 *  model        — the manufacturer's schedule for this exact model generation
 *  digital-twin — the owner's own logged intervals
 *  hybrid       — one logged service + a manufacturer figure
 */
export type PlanSource = 'generic' | 'model' | 'digital-twin' | 'hybrid';

export interface MaintenanceTask {
  category: Category;
  title: string;
  description: string;
  /** Next predicted mileage in km. Undefined for time-only items. */
  dueAtKm?: number;
  /** Next predicted ISO date. */
  dueAtDate: string;
  /** Days from today until this task is due (negative = overdue). */
  daysUntilDue: number;
  /** Km from current mileage until due (negative = overdue). */
  kmUntilDue?: number;
  /** Effective service interval in km (OEM or observed) — lets the UI draw "life remaining". */
  intervalKm?: number;
  severity: Severity;
  estimatedCost: number;
  /** Where this prediction came from. */
  source: PlanSource;
  /** 0–1: how confident we are in the prediction (more history = higher). */
  confidence: number;
  /** Reason text shown in UI ("Basé sur 4 vidanges historiques", etc.) */
  reasoning: string;
  /** Manufacturer note for this item (wet belt, LongLife…), when a model schedule applies. */
  note?: string;
  /** Known weak points of this model that fall on this category at the current mileage. */
  weakPoints?: WeakPoint[];
  /** Whether the manufacturer figures behind this task were checked against the handbook. */
  scheduleVerified?: boolean;
}

export interface MaintenancePlan {
  vehicleId: string;
  generatedAt: string;
  source: PlanSource;
  /** Label of the matched manufacturer schedule ("Ford Focus Mk3 (2011–2018) · 1.0 EcoBoost"), if any. */
  scheduleLabel: string | null;
  scheduleVerified: boolean;
  /** Estimated annual mileage in km/year, computed from fuel history. */
  annualMileageKm: number;
  /** Source confidence — proportion of categories with history (0–1). */
  globalConfidence: number;
  tasks: MaintenanceTask[];
  /** Total estimated 12-month maintenance budget in vehicle currency. */
  budget12mo: number;
}

export type PlanLocale = 'en' | 'fr';

const CATEGORY_LABELS: Record<PlanLocale, Record<Category, string>> = {
  fr: {
    oil: 'Vidange moteur',
    filter: 'Filtres',
    brakes: 'Freinage',
    tires: 'Pneumatiques',
    battery: 'Batterie',
    inspection: 'Contrôle technique',
    belt: 'Distribution',
    fluid: 'Liquide de frein',
    gearbox: 'Boîte de vitesses',
    other: 'Refroidissement',
  },
  en: {
    oil: 'Oil change',
    filter: 'Filters',
    brakes: 'Brakes',
    tires: 'Tyres',
    battery: 'Battery',
    inspection: 'MOT / inspection',
    belt: 'Timing belt',
    fluid: 'Brake fluid',
    gearbox: 'Gearbox oil',
    other: 'Coolant',
  },
};

const FUEL_LABEL: Record<PlanLocale, Record<Vehicle['fuelType'], string>> = {
  fr: { electric: 'EV', hybrid: 'hybride', thermal: 'thermique' },
  en: { electric: 'EV', hybrid: 'hybrid', thermal: 'petrol/diesel' },
};

/**
 * Estimate annual mileage from fuel entries over the last 12 months.
 * Falls back to manufacturer average (15,000 km/year) if insufficient data.
 */
function estimateAnnualMileage(
  vehicle: Vehicle,
  fuel: FuelEntry[],
): { km: number; confidence: number } {
  const oneYearAgo = Date.now() - 365 * 86400000;
  const recent = fuel
    .filter((f) => f.vehicleId === vehicle.id)
    .filter((f) => new Date(f.occurredAt).getTime() >= oneYearAgo)
    .map((f) => ({
      km: f.mileageKm,
      t: new Date(f.occurredAt).getTime(),
    }))
    .filter((p) => p.km > 0)
    .sort((a, b) => a.t - b.t);

  if (recent.length < 2) return { km: 15_000, confidence: 0 };

  const first = recent[0];
  const last = recent[recent.length - 1];
  const dKm = last.km - first.km;
  const dDays = (last.t - first.t) / 86400000;
  if (dDays < 30) return { km: 15_000, confidence: 0.2 };

  const annual = Math.round((dKm / dDays) * 365);
  // Confidence scales with data points (max at 12 fills/year ≈ once a month)
  const confidence = Math.min(1, recent.length / 12);
  return { km: Math.max(2_000, annual), confidence };
}

/**
 * For a given category, find the observed interval (km between consecutive
 * services) from the user's actual maintenance history.
 */
function observedInterval(
  vehicleId: string,
  category: Category,
  history: MaintenanceEntry[],
): { km: number | null; sampleSize: number; lastEntry: MaintenanceEntry | null } {
  const matching = history
    .filter((m) => m.vehicleId === vehicleId && m.category === category)
    .sort((a, b) => a.mileageKm - b.mileageKm);

  if (matching.length === 0) {
    return { km: null, sampleSize: 0, lastEntry: null };
  }
  if (matching.length === 1) {
    return { km: null, sampleSize: 1, lastEntry: matching[0] };
  }

  // Mean delta between consecutive services
  const deltas: number[] = [];
  for (let i = 1; i < matching.length; i++) {
    const delta = matching[i].mileageKm - matching[i - 1].mileageKm;
    if (delta > 0) deltas.push(delta);
  }
  if (deltas.length === 0) {
    return { km: null, sampleSize: matching.length, lastEntry: matching[matching.length - 1] };
  }

  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  return {
    km: Math.round(mean),
    sampleSize: matching.length,
    lastEntry: matching[matching.length - 1],
  };
}

/** Average cost from history for a category, or null if no data. */
function observedCost(
  vehicleId: string,
  category: Category,
  history: MaintenanceEntry[],
): number | null {
  const costs = history
    .filter((m) => m.vehicleId === vehicleId && m.category === category)
    .map((m) => m.cost)
    .filter((c) => c > 0);
  if (costs.length === 0) return null;
  return Math.round(costs.reduce((s, c) => s + c, 0) / costs.length);
}

/**
 * Build one task for a given category. Combines OEM baseline with observed
 * history when present (digital-twin mode). Returns null if not applicable
 * for this fuel type.
 */
function buildTask(
  vehicle: Vehicle,
  category: Category,
  history: MaintenanceEntry[],
  annualMileageKm: number,
  today: Date,
  locale: PlanLocale,
  opts: PlanOptions,
): MaintenanceTask | null {
  const generic: IntervalSpec = KNOWLEDGE_BASE[category][vehicle.fuelType];
  const modelInterval = opts.schedule?.intervals[category];

  // Manufacturer schedule wins over the generic table when we have one for
  // this model. `null/null` from the schedule means "not applicable on this
  // engine" (e.g. chain instead of belt) and hides the task.
  const spec: IntervalSpec = modelInterval
    ? {
        ...generic,
        km: modelInterval.km,
        months: modelInterval.months,
        estimatedCostEur: modelInterval.estimatedCostEur ?? generic.estimatedCostEur,
      }
    : generic;

  // Skip if the category doesn't apply to this fuel type / engine
  if (spec.km === null && spec.months === null) return null;

  const obs = observedInterval(vehicle.id, category, history);
  const obsCost = observedCost(vehicle.id, category, history);

  // Decide source & effective interval
  let effectiveKm = spec.km;
  let source: PlanSource = modelInterval ? 'model' : 'generic';
  let confidence = modelInterval ? 0.7 : 0.5;
  const fuelLabel = FUEL_LABEL[locale][vehicle.fuelType];
  const scheduleLabel = opts.schedule ? `${opts.schedule.schedule.label}${opts.schedule.engine ? ` · ${opts.schedule.engine.label}` : ''}` : null;
  let reasoning = modelInterval
    ? locale === 'fr'
      ? `Carnet constructeur — ${scheduleLabel}`
      : `Manufacturer schedule — ${scheduleLabel}`
    : locale === 'fr'
      ? `Intervalle générique (${fuelLabel})`
      : `Generic interval (${fuelLabel})`;

  if (obs.km !== null && obs.sampleSize >= 2 && spec.km !== null) {
    // Take the more conservative (shorter) of the two intervals — safety first
    effectiveKm = Math.min(obs.km, spec.km);
    source = 'digital-twin';
    confidence = Math.min(1, 0.5 + obs.sampleSize * 0.1);
    const obsK = Math.round(obs.km / 1000);
    const specK = Math.round(spec.km / 1000);
    reasoning =
      locale === 'fr'
        ? `D'après votre carnet — ${obs.sampleSize} interventions, intervalle moyen ${obsK}k km (${obs.km < spec.km ? 'plus court' : 'aligné'} vs reco ${specK}k km)`
        : `From your service log — ${obs.sampleSize} services, average interval ${obsK}k km (${obs.km < spec.km ? 'shorter than' : 'in line with'} the ${specK}k km recommendation)`;
  } else if (obs.sampleSize === 1) {
    source = 'hybrid';
    confidence = 0.65;
    const specK = Math.round((spec.km ?? 0) / 1000);
    reasoning =
      locale === 'fr'
        ? `1 intervention enregistrée + reco constructeur (${specK}k km)`
        : `1 logged service + manufacturer interval (${specK}k km)`;
  }

  // Compute due-at km
  const baseKm = obs.lastEntry?.mileageKm ?? vehicle.currentMileageKm;
  const dueAtKm = effectiveKm !== null ? baseKm + effectiveKm : undefined;

  // Compute due-at date
  let dueAtDate: Date;
  if (category === 'inspection') {
    // Time-based regardless of mileage. Priority: an official expiry date
    // (UK MOT from DVSA/DVLA) → the last logged test → the country's cadence
    // applied to the vehicle's age (first registration year, or purchase date).
    const cycle = inspectionCycleFor(vehicle.country);
    if (opts.inspectionDueDate) {
      dueAtDate = new Date(opts.inspectionDueDate);
    } else if (obs.lastEntry) {
      dueAtDate = new Date(obs.lastEntry.occurredAt);
      dueAtDate.setMonth(dueAtDate.getMonth() + cycle.everyMonths);
    } else {
      const firstReg = vehicle.year ? new Date(vehicle.year, 6, 1) : new Date(vehicle.purchaseDate);
      const ageMonths = Math.max(0, Math.floor((today.getTime() - firstReg.getTime()) / (30 * 86400000)));
      const monthsToNext = firstInspectionMonths(ageMonths, cycle);
      dueAtDate = new Date(today);
      dueAtDate.setMonth(dueAtDate.getMonth() + monthsToNext);
    }
  } else if (dueAtKm !== undefined && annualMileageKm > 0) {
    // Convert km to date using estimated annual mileage
    const kmRemaining = dueAtKm - vehicle.currentMileageKm;
    const daysRemaining = Math.round((kmRemaining / annualMileageKm) * 365);
    dueAtDate = new Date(today);
    dueAtDate.setDate(dueAtDate.getDate() + daysRemaining);
    // If time-based limit is shorter, take that
    if (spec.months !== null) {
      const lastDate = obs.lastEntry
        ? new Date(obs.lastEntry.occurredAt)
        : new Date(vehicle.purchaseDate);
      const timeDue = new Date(lastDate);
      timeDue.setMonth(timeDue.getMonth() + spec.months);
      if (timeDue.getTime() < dueAtDate.getTime()) dueAtDate = timeDue;
    }
  } else if (spec.months !== null) {
    // Time-only: battery, inspection
    const lastDate = obs.lastEntry
      ? new Date(obs.lastEntry.occurredAt)
      : new Date(vehicle.purchaseDate);
    dueAtDate = new Date(lastDate);
    dueAtDate.setMonth(dueAtDate.getMonth() + spec.months);
  } else {
    return null;
  }

  const daysUntilDue = Math.round(
    (dueAtDate.getTime() - today.getTime()) / 86400000,
  );
  const kmUntilDue =
    dueAtKm !== undefined ? dueAtKm - vehicle.currentMileageKm : undefined;

  // Severity
  let severity: Severity = 'info';
  if (daysUntilDue < 0 || (kmUntilDue !== undefined && kmUntilDue < 0)) {
    severity = 'critical';
  } else if (
    daysUntilDue < 30 ||
    (kmUntilDue !== undefined && kmUntilDue < 1_000)
  ) {
    severity = spec.safetyCritical ? 'critical' : 'warning';
  } else if (
    daysUntilDue < 90 ||
    (kmUntilDue !== undefined && kmUntilDue < 3_000)
  ) {
    severity = 'warning';
  }

  // A known safety weak point of this model, inside its mileage window,
  // lifts an "info" task to "warning" — worth a look even if not yet due.
  const weakPoints = activeWeakPoints(opts.schedule ?? null, vehicle.currentMileageKm).filter((w) => w.category === category);
  if (severity === 'info' && weakPoints.some((w) => w.severity === 'safety')) severity = 'warning';

  const estimatedCost = obsCost ?? spec.estimatedCostEur;

  return {
    category,
    title: CATEGORY_LABELS[locale][category],
    description: locale === 'fr' ? spec.description : spec.descriptionEn,
    dueAtKm,
    dueAtDate: dueAtDate.toISOString(),
    daysUntilDue,
    kmUntilDue,
    intervalKm: effectiveKm ?? undefined,
    severity,
    estimatedCost,
    source,
    confidence,
    reasoning,
    note: modelInterval?.note ? modelInterval.note[locale] : undefined,
    weakPoints: weakPoints.length ? weakPoints : undefined,
    scheduleVerified: modelInterval ? opts.schedule?.schedule.verified ?? false : undefined,
  };
}

/**
 * Generate a maintenance plan for a vehicle.
 *
 * - **No history** → generic OEM-based plan
 * - **With history** → digital-twin plan that learns from the driver's
 *   actual service intervals and costs
 */
export interface PlanOptions {
  /** Official next-test date (e.g. UK MOT expiry) — overrides the computed cadence. */
  inspectionDueDate?: string | null;
  /** Annual mileage from an official odometer trail — overrides the receipt-based estimate. */
  annualMileageKm?: number | null;
  /** Manufacturer schedule matched for this vehicle (lib/maintenance/schedules). */
  schedule?: ResolvedSchedule | null;
}

export function generateMaintenancePlan(
  vehicle: Vehicle,
  history: MaintenanceEntry[],
  fuel: FuelEntry[],
  today: Date = new Date(),
  locale: PlanLocale = 'en',
  opts: PlanOptions = {},
): MaintenancePlan {
  const estimated = estimateAnnualMileage(vehicle, fuel);
  const annual = opts.annualMileageKm && opts.annualMileageKm > 0
    ? { km: opts.annualMileageKm, confidence: Math.max(estimated.confidence, 0.8) }
    : estimated;

  const categories: Category[] = [
    'oil',
    'filter',
    'brakes',
    'tires',
    'battery',
    'inspection',
    'belt',
    'fluid',
    'gearbox',
    'other',
  ];

  const tasks = categories
    .map((c) => buildTask(vehicle, c, history, annual.km, today, locale, opts))
    .filter((t): t is MaintenanceTask => t !== null)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // Overall source
  const sources = new Set(tasks.map((t) => t.source));
  const source: PlanSource = sources.has('digital-twin')
    ? sources.size === 1
      ? 'digital-twin'
      : 'hybrid'
    : sources.has('model')
      ? 'model'
      : 'generic';

  // Global confidence = average task confidence weighted by data availability
  const globalConfidence =
    tasks.length > 0
      ? tasks.reduce((s, t) => s + t.confidence, 0) / tasks.length
      : 0;

  // 12-month budget: tasks due within the next year
  const oneYearFromNow = today.getTime() + 365 * 86400000;
  const budget12mo = tasks
    .filter((t) => new Date(t.dueAtDate).getTime() <= oneYearFromNow)
    .reduce((s, t) => s + t.estimatedCost, 0);

  return {
    vehicleId: vehicle.id,
    generatedAt: today.toISOString(),
    source,
    scheduleLabel: opts.schedule ? `${opts.schedule.schedule.label}${opts.schedule.engine ? ` · ${opts.schedule.engine.label}` : ''}` : null,
    scheduleVerified: opts.schedule?.schedule.verified ?? false,
    annualMileageKm: annual.km,
    globalConfidence,
    tasks,
    budget12mo,
  };
}
