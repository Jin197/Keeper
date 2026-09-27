import type { FuelType, MaintenanceEntry } from '@/lib/types';

export type Category = MaintenanceEntry['category'];

export type Severity = 'info' | 'warning' | 'critical';

/**
 * Generic manufacturer + industry-standard service intervals.
 *
 * Values are conservative recommendations from major OEM service books
 * (Renault, Peugeot, VW, Toyota, Tesla, Stellantis) cross-referenced with
 * FFA/FNAA guidance. `null` means "not applicable for this fuel type".
 */
export interface IntervalSpec {
  km: number | null;
  months: number | null;
  /** Rough median labour + parts cost in EUR for a French/Belgian indep. garage. */
  estimatedCostEur: number;
  /** Whether the task is safety-critical (raises severity). */
  safetyCritical: boolean;
  /** Short description displayed to the user (French). */
  description: string;
  /** Same, in English. */
  descriptionEn: string;
}

export const KNOWLEDGE_BASE: Record<Category, Record<FuelType, IntervalSpec>> = {
  oil: {
    thermal: {
      km: 15_000,
      months: 12,
      estimatedCostEur: 110,
      safetyCritical: false,
      description: 'Vidange huile moteur + filtre à huile',
      descriptionEn: 'Engine oil + oil filter change',
    },
    hybrid: {
      km: 15_000,
      months: 12,
      estimatedCostEur: 120,
      safetyCritical: false,
      description: 'Vidange moteur thermique (mode hybride)',
      descriptionEn: 'Engine oil change (hybrid)',
    },
    electric: {
      km: null,
      months: null,
      estimatedCostEur: 0,
      safetyCritical: false,
      description: 'N/A — moteur électrique',
      descriptionEn: 'N/A — electric motor',
    },
  },
  filter: {
    thermal: {
      km: 30_000,
      months: 24,
      estimatedCostEur: 80,
      safetyCritical: false,
      description: 'Filtre à air + filtre habitacle (pollen)',
      descriptionEn: 'Air filter + cabin (pollen) filter',
    },
    hybrid: {
      km: 30_000,
      months: 24,
      estimatedCostEur: 85,
      safetyCritical: false,
      description: 'Filtre à air + filtre habitacle',
      descriptionEn: 'Air filter + cabin filter',
    },
    electric: {
      km: 30_000,
      months: 24,
      estimatedCostEur: 60,
      safetyCritical: false,
      description: 'Filtre habitacle (pollen)',
      descriptionEn: 'Cabin (pollen) filter',
    },
  },
  brakes: {
    thermal: {
      km: 50_000,
      months: 48,
      estimatedCostEur: 280,
      safetyCritical: true,
      description: 'Plaquettes avant + contrôle disques',
      descriptionEn: 'Front pads + disc check',
    },
    hybrid: {
      km: 70_000,
      months: 60,
      estimatedCostEur: 280,
      safetyCritical: true,
      description: 'Plaquettes (régénératif → usure réduite)',
      descriptionEn: 'Pads (regen braking → slower wear)',
    },
    electric: {
      km: 80_000,
      months: 60,
      estimatedCostEur: 280,
      safetyCritical: true,
      description: 'Plaquettes (freinage régénératif)',
      descriptionEn: 'Pads (regenerative braking)',
    },
  },
  tires: {
    thermal: {
      km: 40_000,
      months: 60,
      estimatedCostEur: 480,
      safetyCritical: true,
      description: '4 pneus + équilibrage + parallélisme',
      descriptionEn: '4 tyres + balancing + alignment',
    },
    hybrid: {
      km: 40_000,
      months: 60,
      estimatedCostEur: 520,
      safetyCritical: true,
      description: '4 pneus (renfort charge batterie)',
      descriptionEn: '4 tyres (battery-load rated)',
    },
    electric: {
      km: 35_000,
      months: 60,
      estimatedCostEur: 600,
      safetyCritical: true,
      description: '4 pneus EV (couple instantané → usure +15%)',
      descriptionEn: '4 EV tyres (instant torque → +15% wear)',
    },
  },
  battery: {
    thermal: {
      km: null,
      months: 60,
      estimatedCostEur: 180,
      safetyCritical: false,
      description: 'Batterie 12V de démarrage',
      descriptionEn: '12 V starter battery',
    },
    hybrid: {
      km: null,
      months: 60,
      estimatedCostEur: 220,
      safetyCritical: false,
      description: 'Batterie 12V + diagnostic traction',
      descriptionEn: '12 V battery + traction diagnostic',
    },
    electric: {
      km: 30_000,
      months: 24,
      estimatedCostEur: 90,
      safetyCritical: false,
      description: 'Bilan SoH batterie traction (diagnostic OBD)',
      descriptionEn: 'Traction battery SoH check (OBD)',
    },
  },
  inspection: {
    thermal: {
      km: null,
      months: 24,
      estimatedCostEur: 78,
      safetyCritical: true,
      description: 'Contrôle technique (4 ans puis tous les 2 ans)',
      descriptionEn: 'Roadworthiness test (MOT / CT)',
    },
    hybrid: {
      km: null,
      months: 24,
      estimatedCostEur: 88,
      safetyCritical: true,
      description: 'Contrôle technique + diagnostic hybride',
      descriptionEn: 'Roadworthiness test + hybrid diagnostic',
    },
    electric: {
      km: null,
      months: 24,
      estimatedCostEur: 70,
      safetyCritical: true,
      description: 'Contrôle technique EV',
      descriptionEn: 'Roadworthiness test (EV)',
    },
  },
  belt: {
    thermal: {
      km: 120_000,
      months: 72,
      estimatedCostEur: 550,
      safetyCritical: true,
      description: 'Courroie de distribution (ou contrôle chaîne) + galets + pompe à eau',
      descriptionEn: 'Timing belt (or chain check) + tensioners + water pump',
    },
    hybrid: {
      km: 120_000,
      months: 72,
      estimatedCostEur: 550,
      safetyCritical: true,
      description: 'Courroie de distribution du moteur thermique',
      descriptionEn: 'Timing belt on the combustion engine',
    },
    electric: {
      km: null,
      months: null,
      estimatedCostEur: 0,
      safetyCritical: false,
      description: 'N/A — moteur électrique',
      descriptionEn: 'N/A — electric motor',
    },
  },
  fluid: {
    thermal: {
      km: null,
      months: 24,
      estimatedCostEur: 60,
      safetyCritical: true,
      description: 'Liquide de frein (absorbe l\'humidité, à changer tous les 2 ans)',
      descriptionEn: 'Brake fluid (absorbs moisture — every 2 years)',
    },
    hybrid: {
      km: null,
      months: 24,
      estimatedCostEur: 60,
      safetyCritical: true,
      description: 'Liquide de frein',
      descriptionEn: 'Brake fluid',
    },
    electric: {
      km: null,
      months: 24,
      estimatedCostEur: 60,
      safetyCritical: true,
      description: 'Liquide de frein',
      descriptionEn: 'Brake fluid',
    },
  },
  gearbox: {
    // Only meaningful when a model schedule says so (automatic / DSG / CVT).
    // Generic: not scheduled — a manual gearbox is lifetime-filled.
    thermal: { km: null, months: null, estimatedCostEur: 250, safetyCritical: false, description: 'Huile de boîte automatique', descriptionEn: 'Automatic gearbox oil' },
    hybrid: { km: null, months: null, estimatedCostEur: 250, safetyCritical: false, description: 'Huile de boîte (e-CVT)', descriptionEn: 'Gearbox oil (e-CVT)' },
    electric: { km: null, months: null, estimatedCostEur: 0, safetyCritical: false, description: 'N/A', descriptionEn: 'N/A' },
  },
  other: {
    thermal: {
      km: 60_000,
      months: 48,
      estimatedCostEur: 120,
      safetyCritical: false,
      description: 'Liquide de refroidissement',
      descriptionEn: 'Coolant',
    },
    hybrid: {
      km: 60_000,
      months: 48,
      estimatedCostEur: 180,
      safetyCritical: false,
      description: 'Refroidissement + circuit batterie',
      descriptionEn: 'Coolant + battery circuit',
    },
    electric: {
      km: 60_000,
      months: 48,
      estimatedCostEur: 180,
      safetyCritical: false,
      description: 'Refroidissement batterie + onduleur',
      descriptionEn: 'Battery + inverter coolant',
    },
  },
};

/**
 * Periodic roadworthiness test cadence per country: months until the first
 * test on a new car, then the repeat interval. Defaults to the EU directive
 * minimum (4 years, then every 2) when a country isn't listed.
 */
export interface InspectionCycle {
  firstMonths: number;
  everyMonths: number;
}

const INSPECTION_CYCLES: Record<string, InspectionCycle> = {
  GB: { firstMonths: 36, everyMonths: 12 }, // MOT
  IE: { firstMonths: 48, everyMonths: 24 }, // NCT (annual after 10 years — simplified)
  FR: { firstMonths: 48, everyMonths: 24 }, // Contrôle technique
  BE: { firstMonths: 48, everyMonths: 12 },
  DE: { firstMonths: 36, everyMonths: 24 }, // HU/TÜV
  NL: { firstMonths: 48, everyMonths: 24 }, // APK (annual for older cars — simplified)
  ES: { firstMonths: 48, everyMonths: 24 }, // ITV
  IT: { firstMonths: 48, everyMonths: 24 }, // Revisione
  PT: { firstMonths: 48, everyMonths: 24 },
  AT: { firstMonths: 36, everyMonths: 12 },
  CH: { firstMonths: 60, everyMonths: 36 },
  PL: { firstMonths: 36, everyMonths: 12 },
  MA: { firstMonths: 60, everyMonths: 12 },
  BR: { firstMonths: 36, everyMonths: 12 },
  IN: { firstMonths: 180, everyMonths: 60 },
  JP: { firstMonths: 36, everyMonths: 24 }, // Shaken
  AU: { firstMonths: 60, everyMonths: 12 }, // varies by state — NSW-like
};

export function inspectionCycleFor(country: string | null | undefined): InspectionCycle {
  return INSPECTION_CYCLES[(country ?? '').toUpperCase()] ?? { firstMonths: 48, everyMonths: 24 };
}

/**
 * Months until the next periodic test for a vehicle of `vehicleAgeMonths`,
 * following the given cadence (first test, then every N months).
 */
export function firstInspectionMonths(
  vehicleAgeMonths: number,
  cycle: InspectionCycle = { firstMonths: 48, everyMonths: 24 },
): number {
  if (vehicleAgeMonths < cycle.firstMonths) return cycle.firstMonths - vehicleAgeMonths;
  const monthsSinceFirst = vehicleAgeMonths - cycle.firstMonths;
  return cycle.everyMonths - (monthsSinceFirst % cycle.everyMonths);
}
