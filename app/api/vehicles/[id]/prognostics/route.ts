import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVehicle, getProfile, getMaintenanceEntries, getFuelEntries } from '@/lib/data';
import { generateMaintenancePlan } from '@/lib/maintenance/plan';
import { getKnownIssues, resolveVehicleCountry } from '@/lib/vehicle-data/known-issues';
import { resolveSchedule } from '@/lib/maintenance/schedules';

/**
 * GET /api/vehicles/:id/prognostics
 *
 * Machine-readable version of the Health page: the maintenance forecast
 * (manufacturer intervals × logged services × official MOT data when
 * available) plus the known-issues report. No simulated telemetry.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [vehicle, profile] = await Promise.all([getVehicle(params.id), getProfile()]);
    if (!vehicle || vehicle.userId !== user.id) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const [history, fuel, known] = await Promise.all([
      getMaintenanceEntries(vehicle.id),
      getFuelEntries(vehicle.id),
      getKnownIssues(vehicle, profile?.country),
    ]);
    const country = resolveVehicleCountry(vehicle, profile?.country);
    const plan = generateMaintenancePlan(
      { ...vehicle, country },
      history,
      fuel,
      new Date(),
      profile?.locale === 'fr' ? 'fr' : 'en',
      { inspectionDueDate: known.mot?.motExpiryDate, annualMileageKm: known.mot?.annualMileageKm, schedule: resolveSchedule(vehicle) },
    );

    return NextResponse.json({
      vehicle_id: vehicle.id,
      country,
      current_mileage_km: vehicle.currentMileageKm,
      annual_mileage_km: plan.annualMileageKm,
      budget_12mo: plan.budget12mo,
      schedule: plan.scheduleLabel ? { label: plan.scheduleLabel, verified: plan.scheduleVerified } : null,
      model_failure_profile: known.failureProfile,
      currency: vehicle.currency,
      tasks: plan.tasks,
      known_issues: {
        highlights: known.highlights,
        mot: known.mot
          ? {
              expiry: known.mot.motExpiryDate,
              tests: known.mot.tests.length,
              fail_rate: known.mot.failRate,
              recurring_advisories: known.mot.recurringAdvisories,
            }
          : null,
        recalls: known.nhtsa?.recalls.length ?? 0,
        complaints: known.nhtsa?.complaintsTotal ?? 0,
      },
    });
  } catch (error) {
    console.error('Prognostics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
