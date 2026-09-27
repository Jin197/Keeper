export type FuelType = 'thermal' | 'electric' | 'hybrid';
export type EnergyType = 'gasoline' | 'diesel' | 'electric' | 'e85' | 'gpl';
/** ISO-4217 code. Kept as a string alias: the app prices in ~70 currencies (see lib/pricing.ts). */
export type Currency = string;
export type Locale = 'fr' | 'en' | 'es' | 'ar' | 'pt';

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  plate: string;
  fuelType: FuelType;
  purchaseDate: string;
  purchasePrice: number;
  currency: Currency;
  currentMileageKm: number;
  imageUrl: string;
  color?: string;
  trim?: string;
  // Resale snapshot
  estimatedResaleValue: number;
  resaleTrend: 'up' | 'down' | 'stable';
  // Insurance
  insuranceProvider?: string;
  insuranceMonthly?: number;
  insuranceMode?: 'fixed' | 'variable';
  /** ISO date (YYYY-MM-DD) the current policy renews — drives the compare-before-renewal nudge. */
  insuranceRenewalDate?: string;
  registrationFormulaNumber?: string;
  /** ISO-3166 alpha-2 registration country; decides which public data sources apply. */
  country?: string;
}

export interface InsuranceRecord {
  id: string;
  vehicleId: string;
  userId: string;
  /** ISO date string YYYY-MM-01 — first day of the month the amount applies to. */
  month: string;
  amount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InfractionCategory =
  | 'speeding'
  | 'parking'
  | 'bus_lane'
  | 'red_light'
  | 'phone_driving'
  | 'seatbelt'
  | 'alcohol'
  | 'drugs'
  | 'other';

export type FineStatus =
  | 'unpaid'
  | 'paid_minored'
  | 'paid_normal'
  | 'paid_majored'
  | 'paid_late_majored'
  | 'contested'
  | 'cancelled';

export type MaintenanceTaskSource = 'plan' | 'phm' | 'manual';

export type MaintenanceTaskStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'done'
  | 'snoozed'
  | 'dismissed';

export type MaintenanceCategory =
  | 'oil'
  | 'tires'
  | 'brakes'
  | 'filter'
  | 'battery'
  | 'inspection'
  | 'belt'
  | 'fluid'
  | 'gearbox'
  | 'other';

export interface MaintenanceTaskInstructions {
  checklist: string[];
  tools: string[];
  diyDifficulty: 1 | 2 | 3 | 4 | 5;
  durationMinutes: number;
  tutorialUrl?: string;
}

export interface MaintenanceTaskRecord {
  id: string;
  userId: string;
  vehicleId: string;
  source: MaintenanceTaskSource;
  category: MaintenanceCategory;
  title: string;
  description: string | null;
  instructions: MaintenanceTaskInstructions | null;
  reasoning: string | null;
  confidence: number | null;
  estimatedCost: number | null;
  estimatedDurationMin: number | null;
  dueAtDate: string | null;
  dueAtKm: number | null;
  scheduledFor: string | null;
  reminderDaysBefore: number;
  lastReminderPhase: string | null;
  lastReminderSentAt: string | null;
  status: MaintenanceTaskStatus;
  snoozeUntil: string | null;
  garageId: string | null;
  garageName: string | null;
  notes: string | null;
  linkedEntryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InAppNotificationKind =
  | 'maintenance_reminder'
  | 'maintenance_overdue'
  | 'forecast_due'
  | 'inspection_due'
  | 'insurance_renewal'
  | 'welcome'
  | 'fine_majoration_soon'
  | 'fine_added'
  | 'mfa_required'
  | 'other';

/** Persisted on profiles.notification_prefs; read by the reminder crons. */
export interface NotificationPrefs {
  /** Channel: also send an email (in-app is always on). */
  email: boolean;
  /** Topics */
  forecast: boolean;
  inspection: boolean;
  insurance: boolean;
  fuel: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  forecast: true,
  inspection: true,
  insurance: true,
  fuel: true,
};

export interface InAppNotification {
  id: string;
  userId: string;
  kind: InAppNotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  relatedVehicleId: string | null;
  relatedTaskId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface TrafficFine {
  id: string;
  userId: string;
  vehicleId: string;
  noticeNumber: string | null;
  documentKey: string | null;
  category: InfractionCategory;
  infractionDate: string;
  notificationDate: string;
  status: FineStatus;
  pointsDeducted: number;
  amountInitial: number;
  amountPaid: number | null;
  paidAt: string | null;
  source: 'manual' | 'ocr_antai';
  rawOcrText: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  occurredAt: string;
  energyType: EnergyType;
  quantity: number; // litres or kWh
  unit: 'L' | 'kWh';
  unitPrice: number;
  totalPrice: number;
  currency: Currency;
  stationName: string;
  stationCity?: string;
  mileageKm: number;
  ocrSource?: 'manual' | 'ocr';
}

export interface MaintenanceEntry {
  id: string;
  vehicleId: string;
  occurredAt: string;
  category: MaintenanceCategory;
  description: string;
  cost: number;
  currency: Currency;
  garageName: string;
  garageId?: string;
  mileageKm: number;
  nextDueMileage?: number;
  nextDueDate?: string;
  hash: string;
}

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  category: 'tires' | 'brakes' | 'oil' | 'filter' | 'battery' | 'inspection';
  severity: 'info' | 'warning' | 'critical';
  predictedMileage: number;
  predictedDate: string;
  message: string;
  remainingKm?: number;
}

export interface Station {
  id: string;
  name: string;
  brand: string;
  type: 'gas' | 'charger';
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
  prices?: { fuelType: EnergyType; price: number; currency: Currency }[];
  available?: number;
  total?: number;
}

export interface Garage {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  isPartner: boolean;
  rating: number;
  reviewCount: number;
  services: string[];
  imageUrl?: string;
}

export interface EcoScore {
  current: number;
  trend: 'up' | 'down' | 'stable';
  delta: number;
  badges: { id: string; label: string; description: string; earned: boolean }[];
  monthly: { month: string; score: number }[];
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  locale: Locale;
  currency: Currency;
  country: string;
  planTier: 'free' | 'premium' | 'family';
  createdAt?: string;
  isTrial?: boolean;
  hasCompletedOnboarding?: boolean;
  onboardingPersona?: 'collector' | 'daily' | 'fleet';
  /** tco = "fuel costs", phm = "repairs & breakdowns", resale = "resale value". */
  onboardingObjective?: 'tco' | 'phm' | 'resale';
  onboardingMotorization?: 'hybrid' | 'electric' | 'thermal';
  notificationPrefs?: NotificationPrefs;
}

