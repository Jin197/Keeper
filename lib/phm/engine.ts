// lib/phm/engine.ts
// Moteur d'Intelligence de Maintenance Prédictive (Prognostics and Health Management)

export interface TelemetryData {
  rpm: number;
  engineLoad: number;
  speed: number;
  maf: number;
  iat: number;
  coolantTemp: number;
  batteryVoltage: number;
}

export interface PrognosticComponent {
  name: string;
  status: 'Excellent' | 'Usure modérée' | 'Remplacement imminent';
  rulKm: number;
  anomalyFlag: boolean;
  anomalyReason?: string;
}

// Seuils de fonctionnement normaux pour calcul des Z-scores
const COOLANT_TEMP_MEAN = 90.0;    // °C
const COOLANT_TEMP_STDDEV = 5.0;  // °C
const BATTERY_VOLT_MEAN = 14.0;   // V
const BATTERY_VOLT_STDDEV = 0.3;  // V

/**
 * Calcule le Z-score d'une valeur par rapport à une moyenne et un écart-type.
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  return (value - mean) / stdDev;
}

/**
 * 1. PHASE INTRODUCTIVE : Détection d'Anomalie (Z-Score & Limites Fixes)
 * Évalue si les paramètres OBD s'écartent significativement de la normale en calculant
 * des Z-scores.
 */
export function detectAnomaly(telemetry: TelemetryData): { flag: boolean; reason?: string } {
  const anomalies: string[] = [];

  // Z-Score Coolant Temperature (Surchauffe)
  const zCoolant = calculateZScore(telemetry.coolantTemp, COOLANT_TEMP_MEAN, COOLANT_TEMP_STDDEV);
  if (zCoolant > 3.0) {
    anomalies.push(`Surchauffe moteur détectée (Z-Score Coolant: +${zCoolant.toFixed(1)})`);
  }
  
  // Z-Score Battery Voltage (moteur tournant)
  if (telemetry.rpm > 500) {
    const zBattery = calculateZScore(telemetry.batteryVoltage, BATTERY_VOLT_MEAN, BATTERY_VOLT_STDDEV);
    if (zBattery < -3.0) {
      anomalies.push(`Tension alternateur/batterie critique (Z-Score Tension: ${zBattery.toFixed(1)})`);
    }
  }
  
  // Admission d'air (MAF anormal par rapport au RPM)
  if (telemetry.rpm > 2000 && telemetry.engineLoad > 50 && telemetry.maf < 10) {
    anomalies.push('Débit d\'air massique (MAF) anormalement bas (Filtre obstrué ou fuite)');
  }

  return {
    flag: anomalies.length > 0,
    reason: anomalies.length > 0 ? anomalies.join(', ') : undefined
  };
}

/**
 * 2. ANALYSE DE SURVIE : Distribution de Weibull (RUL)
 * Calcule la Durée de Vie Utile Restante (Remaining Useful Life) en fonction 
 * du kilométrage actuel de la pièce et de son espérance de vie.
 * Calibré avec le paramètre de forme beta (beta > 1 indique une usure progressive accrue).
 */
export function calculateWeibullRUL(currentKm: number, expectedLifetimeKm: number, beta: number = 2.0): number {
  const baseRul = expectedLifetimeKm - currentKm;
  
  // Courbe de survie de Weibull : R(t) = exp(-(t / eta)^beta)
  // On pose eta = expectedLifetimeKm
  const survivalProbability = Math.exp(-Math.pow(currentKm / expectedLifetimeKm, beta));
  
  const estimatedRul = baseRul > 0 ? Math.round(baseRul * survivalProbability) : 0;
  return Math.max(0, estimatedRul);
}

/**
 * Retourne le paramètre de forme Weibull beta adapté à la nature physique du composant.
 */
export function getWeibullBeta(compName: string): number {
  const lower = compName.toLowerCase();
  if (lower.includes('huile')) return 2.0;       // Usure linéaire standard
  if (lower.includes('frein')) return 2.2;       // Usure accélérée vers la fin
  if (lower.includes('filtre')) return 1.8;      // Colmatage exponentiel doux
  if (lower.includes('pneumatique')) return 2.5;  // Usure accélérée par friction
  return 2.0;                                   // Valeur par défaut
}

/**
 * 3. CLASSIFICATION D'ÉTAT
 * Bucket the remaining life into three plain states. This used to also emit a
 * pseudo-random "AI confidence %" — removed: there is no model behind it and
 * showing one to a buyer or an insurer would have been a misrepresentation.
 */
export function classifyComponentState(
  rulKm: number,
  expectedLifetimeKm: number,
  hasAnomaly: boolean
): { status: PrognosticComponent['status'] } {
  const lifePercentageRemaining = expectedLifetimeKm > 0 ? rulKm / expectedLifetimeKm : 0;
  if (hasAnomaly || lifePercentageRemaining < 0.15) return { status: 'Remplacement imminent' };
  if (lifePercentageRemaining < 0.6) return { status: 'Usure modérée' };
  return { status: 'Excellent' };
}

/**
 * MOTEUR GLOBAL : Évalue le véhicule entier
 */
export function evaluateVehicleHealth(
  currentMileage: number, 
  telemetry: TelemetryData | null, 
  componentsData: { name: string; lastChangedKm: number; expectedLifetimeKm: number }[]
): { overallScore: number; components: PrognosticComponent[] } {
  
  const evaluatedComponents: PrognosticComponent[] = [];
  const anomalyCheck = telemetry ? detectAnomaly(telemetry) : { flag: false };
  let totalHealthPoints = 0;

  for (const comp of componentsData) {
    const kmDrivenOnPart = currentMileage - comp.lastChangedKm;
    const beta = getWeibullBeta(comp.name);
    const rulKm = calculateWeibullRUL(kmDrivenOnPart, comp.expectedLifetimeKm, beta);
    
    // Pour le Filtre à air, on relie l'anomalie MAF ou surchauffe générale
    const isEngineAnomaly = !!(anomalyCheck.flag && (anomalyCheck.reason?.includes('Filtre') || anomalyCheck.reason?.includes('Surchauffe')));
    const compAnomaly = comp.name.includes('Filtre') ? isEngineAnomaly : false;

    const classification = classifyComponentState(rulKm, comp.expectedLifetimeKm, compAnomaly);

    evaluatedComponents.push({
      name: comp.name,
      status: classification.status,
      rulKm,
      anomalyFlag: compAnomaly,
      anomalyReason: compAnomaly ? anomalyCheck.reason : undefined
    });

    if (classification.status === 'Excellent') totalHealthPoints += 100;
    else if (classification.status === 'Usure modérée') totalHealthPoints += 70;
    else totalHealthPoints += 30;
  }

  const overallScore = componentsData.length > 0 
    ? Math.round(totalHealthPoints / componentsData.length)
    : 100;

  return {
    overallScore,
    components: evaluatedComponents
  };
}
