import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pushInAppNotification } from '@/server/actions/notifications';
import { generateMaintenancePlan } from '@/lib/maintenance/plan';
import { resolveSchedule } from '@/lib/maintenance/schedules';
import { computeReminders, type Reminder } from '@/lib/reminders/forecast';
import { translatorFor } from '@/lib/i18n/messages';
import { DEFAULT_NOTIFICATION_PREFS, type FuelEntry, type MaintenanceEntry, type NotificationPrefs, type Vehicle } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily cron: proactive reminders from the forecast — nothing to schedule,
 * nothing to configure. For every active vehicle it rebuilds the maintenance
 * plan (manufacturer schedule × owner log × mileage), then emits:
 *   • forecast items due within 30 / 7 days or overdue
 *   • MOT / inspection due within 30 / 7 days or expired
 *   • insurance renewal within 30 / 7 days
 * In-app always; email when the user left the channel on. Idempotent through
 * `dedupe_key`, so running it twice a day sends nothing new.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://velocewealth.app';
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  let users = 0, vehicles = 0, created = 0, emailed = 0, failed = 0;
  const now = new Date();

  try {
    // Page through profiles; a few thousand users per run is fine at 300 s.
    const PAGE = 200;
    for (let offset = 0; ; offset += PAGE) {
      const { data: profiles, error } = await admin
        .from('profiles')
        .select('id, email, full_name, locale, notification_prefs')
        .eq('has_completed_onboarding', true)
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(`profiles: ${error.message}`);
      if (!profiles || profiles.length === 0) break;

      for (const profile of profiles) {
        users++;
        const prefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...((profile.notification_prefs as Partial<NotificationPrefs> | null) ?? {}) };
        if (!prefs.forecast && !prefs.inspection && !prefs.insurance) continue;

        const [{ data: vRows }, { data: fRows }, { data: mRows }] = await Promise.all([
          admin.from('vehicles').select('*').eq('user_id', profile.id).is('archived_at', null),
          admin.from('fuel_entries').select('*').eq('user_id', profile.id).order('occurred_at', { ascending: false }).limit(400),
          admin.from('maintenance_entries').select('*').eq('user_id', profile.id).order('occurred_at', { ascending: false }).limit(400),
        ]);
        const t = translatorFor(profile.locale, 'reminders');

        for (const row of vRows ?? []) {
          vehicles++;
          const vehicle = mapVehicle(row as Record<string, unknown>);
          const fuel = (fRows ?? []).filter((f) => f.vehicle_id === vehicle.id).map(mapFuel);
          const maintenance = (mRows ?? []).filter((m) => m.vehicle_id === vehicle.id).map(mapMaintenance);
          const plan = generateMaintenancePlan(vehicle, maintenance, fuel, now, profile.locale === 'fr' ? 'fr' : 'en', { schedule: resolveSchedule(vehicle) });
          const reminders = computeReminders(vehicle, plan, prefs, now);

          for (const r of reminders) {
            try {
              const title = t(r.messageKey, r.params);
              const body = t(`${r.messageKey}Body`, r.params);
              const isNew = await pushInAppNotification({
                userId: profile.id,
                kind: r.kind,
                title,
                body,
                link: r.link,
                relatedVehicleId: vehicle.id,
                dedupeKey: r.dedupeKey,
              });
              if (!isNew) continue;
              created++;
              if (r.email && prefs.email && resendKey && from && profile.email) {
                await sendEmail(resendKey, from, profile.email, title, body, `${appUrl}${r.link}`, t('emailOpen'), t('emailFooter'));
                emailed++;
              }
            } catch (err) {
              failed++;
              console.error('forecast reminder error', { userId: profile.id, vehicleId: vehicle.id, key: r.dedupeKey, err: err instanceof Error ? err.message : String(err) });
            }
          }
        }
      }
      if (profiles.length < PAGE) break;
    }

    return NextResponse.json({ ok: true, users, vehicles, created, emailed, failed, timestamp: now.toISOString() });
  } catch (err) {
    console.error('forecast-reminders fatal', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function sendEmail(apiKey: string, from: string, to: string, subject: string, body: string, link: string, cta: string, footer: string) {
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0d0d12;color:#f5f5f7;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#16161a;border:1px solid #2a2a30;border-radius:20px;padding:28px">
    <div style="font-size:11px;letter-spacing:.12em;color:#8b8b93;text-transform:uppercase">Velocewealth</div>
    <h1 style="font-size:20px;margin:12px 0 8px">${escapeHtml(subject)}</h1>
    <p style="color:#c7c7cf;line-height:1.5;margin:0 0 20px">${escapeHtml(body)}</p>
    <a href="${link}" style="display:inline-block;background:#007aff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600">${escapeHtml(cta)}</a>
    <p style="color:#6b6b73;font-size:11px;margin-top:28px">${escapeHtml(footer)}</p>
  </div></body></html>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text: `${subject}\n\n${body}\n\n${link}\n\n${footer}` }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

// ── Row mappers (admin client returns snake_case; lib/data's mappers are not exported) ──
function mapVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    make: row.make as string,
    model: row.model as string,
    year: row.year as number,
    vin: (row.vin as string) ?? undefined,
    plate: row.plate as string,
    fuelType: row.fuel_type as Vehicle['fuelType'],
    purchaseDate: row.purchase_date as string,
    purchasePrice: Number(row.purchase_price),
    currency: row.currency as string,
    currentMileageKm: row.current_mileage_km as number,
    imageUrl: (row.image_url as string) ?? '',
    trim: (row.trim as string) ?? undefined,
    estimatedResaleValue: Number(row.estimated_resale_value),
    resaleTrend: row.resale_trend as Vehicle['resaleTrend'],
    insuranceProvider: (row.insurance_provider as string) ?? undefined,
    insuranceMonthly: row.insurance_monthly ? Number(row.insurance_monthly) : undefined,
    insuranceRenewalDate: (row.insurance_renewal_date as string) ?? undefined,
    country: (row.country as string) ?? undefined,
  };
}
function mapFuel(row: Record<string, unknown>): FuelEntry {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    occurredAt: row.occurred_at as string,
    energyType: row.energy_type as FuelEntry['energyType'],
    quantity: Number(row.quantity),
    unit: row.unit as 'L' | 'kWh',
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    currency: row.currency as string,
    stationName: row.station_name as string,
    mileageKm: row.mileage_km as number,
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
    currency: row.currency as string,
    garageName: row.garage_name as string,
    mileageKm: row.mileage_km as number,
    nextDueMileage: (row.next_due_mileage as number) ?? undefined,
    nextDueDate: (row.next_due_date as string) ?? undefined,
    hash: row.hash as string,
  };
}
