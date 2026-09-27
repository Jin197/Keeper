import type { Vehicle, InAppNotificationKind, NotificationPrefs } from '@/lib/types';
import type { MaintenancePlan, MaintenanceTask } from '@/lib/maintenance/plan';
import { daysUntil } from '@/lib/affiliates';

/**
 * Proactive reminders derived from the forecast — the user does nothing and
 * still gets "your MOT is in 30 days", "brake pads due in ~3 weeks",
 * "insurance renews in 7 days".
 *
 * Pure: takes a vehicle + its plan + prefs, returns the notifications that
 * should exist *today*. Idempotency comes from `dedupeKey`, which encodes the
 * (vehicle, item, due date, phase) so a reminder fires once per phase and
 * re-fires only if the due date itself moves.
 */

export type ReminderPhase = 'ahead' | 'soon' | 'overdue';

export interface Reminder {
  kind: InAppNotificationKind;
  phase: ReminderPhase;
  dedupeKey: string;
  vehicleId: string;
  /** Message-catalogue key under `reminders` plus its params; rendered by the caller in the user's language. */
  messageKey: 'forecastAhead' | 'forecastSoon' | 'forecastOverdue' | 'inspectionAhead' | 'inspectionSoon' | 'inspectionOverdue' | 'insuranceAhead' | 'insuranceSoon';
  params: Record<string, string | number>;
  link: string;
  /** Only email-worthy phases get a mail; 'ahead' stays in-app. */
  email: boolean;
}

const AHEAD_DAYS = 30;
const SOON_DAYS = 7;

function phaseFor(days: number): ReminderPhase | null {
  if (days < 0) return 'overdue';
  if (days <= SOON_DAYS) return 'soon';
  if (days <= AHEAD_DAYS) return 'ahead';
  return null;
}

export function computeReminders(
  vehicle: Pick<Vehicle, 'id' | 'make' | 'model' | 'plate' | 'insuranceRenewalDate' | 'insuranceProvider'>,
  plan: Pick<MaintenancePlan, 'tasks'>,
  prefs: NotificationPrefs,
  now: Date = new Date(),
): Reminder[] {
  const out: Reminder[] = [];
  const label = `${vehicle.make} ${vehicle.model}`;

  for (const task of plan.tasks) {
    const phase = phaseFor(task.daysUntilDue);
    if (!phase) continue;
    const isInspection = task.category === 'inspection';
    if (isInspection && !prefs.inspection) continue;
    if (!isInspection && !prefs.forecast) continue;
    // Only the more urgent forecast items deserve an "ahead" nudge: safety and
    // model-specific ones. Everything else waits for the 7-day window.
    if (!isInspection && phase === 'ahead' && task.severity === 'info') continue;

    const due = task.dueAtDate.slice(0, 10);
    out.push({
      kind: isInspection ? 'inspection_due' : 'forecast_due',
      phase,
      dedupeKey: `${isInspection ? 'inspection' : 'forecast'}:${vehicle.id}:${task.category}:${due}:${phase}`,
      vehicleId: vehicle.id,
      messageKey: isInspection ? (`inspection${cap(phase)}` as Reminder['messageKey']) : (`forecast${cap(phase)}` as Reminder['messageKey']),
      params: { vehicle: label, task: task.title, days: Math.abs(task.daysUntilDue), km: task.kmUntilDue != null ? Math.max(0, task.kmUntilDue) : '' },
      link: `/maintenance/prognostics/${vehicle.id}`,
      email: phase !== 'ahead' || isInspection,
    });
  }

  if (prefs.insurance && vehicle.insuranceRenewalDate) {
    const days = daysUntil(vehicle.insuranceRenewalDate, now);
    if (days != null && days >= 0 && days <= AHEAD_DAYS) {
      const phase: ReminderPhase = days <= SOON_DAYS ? 'soon' : 'ahead';
      out.push({
        kind: 'insurance_renewal',
        phase,
        dedupeKey: `insurance:${vehicle.id}:${vehicle.insuranceRenewalDate}:${phase}`,
        vehicleId: vehicle.id,
        messageKey: phase === 'soon' ? 'insuranceSoon' : 'insuranceAhead',
        params: { vehicle: label, days, provider: vehicle.insuranceProvider ?? '' },
        link: '/dashboard',
        email: true,
      });
    }
  }

  return out;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tasks worth surfacing on the dashboard's "next 30 days" card. */
export function upcomingWithin(tasks: MaintenanceTask[], days = 30): MaintenanceTask[] {
  return tasks.filter((t) => t.daysUntilDue <= days).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
