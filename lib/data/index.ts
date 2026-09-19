import { createClient } from '@/lib/supabase/server';
import { isTrialActive } from '@/lib/trial';
import type {
  Vehicle,
  FuelEntry,
  MaintenanceEntry,
  MaintenanceAlert,
  Station,
  Garage,
  UserProfile,
  EnergyType,
  FuelType,
  Currency,
  Locale,
} from '@/lib/types';

// Re-exported for the many call sites that already import it from '@/lib/data'.
export { isTrialActive };

/**
 * Convert Supabase row (snake_case) → app type (camelCase).
 */
function mapVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    make: row.make as string,
    model: row.model as string,
    year: row.year as number,
    vin: (row.vin as string) ?? undefined,
    plate: row.plate as string,
    fuelType: row.fuel_type as FuelType,
    purchaseDate: row.purchase_date as string,
    purchasePrice: Number(row.purchase_price),
    currency: row.currency as Currency,
    currentMileageKm: row.current_mileage_km as number,
    imageUrl: (row.image_url as string) ?? '',
    color: (row.color as string) ?? undefined,
    trim: (row.trim as string) ?? undefined,
    estimatedResaleValue: Number(row.estimated_resale_value),
    resaleTrend: row.resale_trend as 'up' | 'down' | 'stable',
    insuranceProvider: (row.insurance_provider as string) ?? undefined,
    insuranceMonthly: row.insurance_monthly
      ? Number(row.insurance_monthly)
      : undefined,
    insuranceMode:
      (row.insurance_mode as 'fixed' | 'variable' | undefined) ?? 'fixed',
    registrationFormulaNumber:
      (row.registration_formula_number as string) ?? undefined,
  };
}

function mapFuel(row: Record<string, unknown>): FuelEntry {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    occurredAt: row.occurred_at as string,
    energyType: row.energy_type as EnergyType,
    quantity: Number(row.quantity),
    unit: row.unit as 'L' | 'kWh',
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    currency: row.currency as Currency,
    stationName: row.station_name as string,
    stationCity: (row.station_city as string) ?? undefined,
    mileageKm: row.mileage_km as number,
    ocrSource: row.ocr_source as 'manual' | 'ocr',
  };
}

function mapMaintenance(row: Record<string, unknown>): MaintenanceEntry {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    occurredAt: row.occurred_at as string,
    category: row.category as MaintenanceEntry['category'],
    description: row.description as string,
    cost: Number(row.cost),
    currency: row.currency as Currency,
    garageName: row.garage_name as string,
    garageId: (row.garage_id as string) ?? undefined,
    mileageKm: row.mileage_km as number,
    nextDueMileage: (row.next_due_mileage as number) ?? undefined,
    nextDueDate: (row.next_due_date as string) ?? undefined,
    hash: row.hash as string,
  };
}

function mapAlert(row: Record<string, unknown>): MaintenanceAlert {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    category: row.category as MaintenanceAlert['category'],
    severity: row.severity as 'info' | 'warning' | 'critical',
    predictedMileage: row.predicted_mileage as number,
    predictedDate: row.predicted_at as string,
    message: row.message as string,
  };
}

function mapStation(row: Record<string, unknown>): Station {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string,
    type: row.type as 'gas' | 'charger',
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address as string,
    city: row.city as string,
    country: row.country as string,
    available: (row.available as number) ?? undefined,
    total: (row.total as number) ?? undefined,
  };
}

function mapGarage(row: Record<string, unknown>): Garage {
  return {
    id: row.id as string,
    name: row.name as string,
    address: row.address as string,
    city: row.city as string,
    country: row.country as string,
    lat: Number(row.lat),
    lng: Number(row.lng),
    isPartner: row.is_partner as boolean,
    rating: Number(row.rating),
    reviewCount: row.review_count as number,
    services: (row.services as string[]) ?? [],
    imageUrl: (row.image_url as string) ?? undefined,
  };
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  const planTier = row.plan_tier as 'free' | 'premium' | 'family';
  const createdAtStr = row.created_at as string;
  const isTrial = isTrialActive(createdAtStr, planTier);

  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    avatarUrl: (row.avatar_url as string) ?? undefined,
    locale: row.locale as Locale,
    currency: row.currency as Currency,
    country: row.country as string,
    planTier: planTier,
    createdAt: createdAtStr,
    isTrial,
    hasCompletedOnboarding: row.has_completed_onboarding as boolean,
    onboardingPersona: row.onboarding_persona as 'collector' | 'daily' | 'fleet' | undefined,
    onboardingObjective: row.onboarding_objective as 'tco' | 'phm' | 'resale' | undefined,
    onboardingMotorization: row.onboarding_motorization as 'hybrid' | 'electric' | 'thermal' | undefined,
  };
}

// ===== Public fetchers (server-only) =====

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data ? mapProfile(data) : null;
}

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapVehicle);
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? mapVehicle(data) : null;
}

export async function getFuelEntries(vehicleId?: string): Promise<FuelEntry[]> {
  const supabase = createClient();
  let q = supabase
    .from('fuel_entries')
    .select('*')
    .order('occurred_at', { ascending: false });
  if (vehicleId) q = q.eq('vehicle_id', vehicleId);
  const { data } = await q;
  return (data ?? []).map(mapFuel);
}

export async function getMaintenanceEntries(vehicleId?: string): Promise<MaintenanceEntry[]> {
  const supabase = createClient();
  let q = supabase
    .from('maintenance_entries')
    .select('*')
    .order('occurred_at', { ascending: false });
  if (vehicleId) q = q.eq('vehicle_id', vehicleId);
  const { data } = await q;
  return (data ?? []).map(mapMaintenance);
}

export async function getActiveAlerts(): Promise<MaintenanceAlert[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('maintenance_alerts')
    .select('*')
    .is('dismissed_at', null)
    .order('severity', { ascending: false });
  return (data ?? []).map(mapAlert);
}

export async function getStations(country?: string): Promise<Station[]> {
  const supabase = createClient();
  let q = supabase.from('stations').select('*').order('city');
  if (country) q = q.eq('country', country);
  const { data } = await q;
  return (data ?? []).map(mapStation);
}

export async function getGarages(country?: string): Promise<Garage[]> {
  const supabase = createClient();
  let q = supabase
    .from('garages')
    .select('*')
    .order('is_partner', { ascending: false })
    .order('rating', { ascending: false });
  if (country) q = q.eq('country', country);
  const { data } = await q;
  return (data ?? []).map(mapGarage);
}

export async function getDashboardData() {
  const [profile, vehicles, fuel, maintenance, alerts] = await Promise.all([
    getProfile(),
    getVehicles(),
    getFuelEntries(),
    getMaintenanceEntries(),
    getActiveAlerts(),
  ]);
  return { profile, vehicles, fuel, maintenance, alerts };
}
