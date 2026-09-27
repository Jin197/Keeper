'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';
import { getLocale } from 'next-intl/server';
import { translatorFor } from '@/lib/i18n/messages';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function generateDemoDataAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errResult('unauthenticated');

  const tDemo = translatorFor(await getLocale().catch(() => 'en'), 'demoData');

  try {
    // 1. Get user currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();
    const currency = profile?.currency ?? 'EUR';

    // Avoid duplicating demo data if they already have vehicles
    const { data: existingVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingVehicles && existingVehicles.length > 0) {
      return errResult('alreadyHasVehicles');
    }

    const now = new Date();
    const subtractMonths = (m: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      return d.toISOString().slice(0, 10);
    };

    const subtractMonthsDateTime = (m: number, dayOffset = 0) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      d.setDate(d.getDate() - dayOffset);
      return d.toISOString();
    };

    // 2. Insert Vehicle 1 (Tesla Model 3 - Electric)
    const { data: v1, error: errV1 } = await supabase
      .from('vehicles')
      .insert({
        user_id: user.id,
        make: 'Tesla',
        model: 'Model 3',
        year: 2022,
        vin: '5YJ3E1EA5NF123456',
        plate: 'EV-999-VW',
        fuel_type: 'electric',
        purchase_date: subtractMonths(12),
        purchase_price: 45000,
        currency,
        current_mileage_km: 42000,
        image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1200&q=80',
        color: 'Noir Carbone',
        trim: 'Grande Autonomie',
        estimated_resale_value: 35100,
        resale_trend: 'stable',
        insurance_provider: 'Allianz',
        insurance_monthly: 85,
      })
      .select('id')
      .single();

    if (errV1 || !v1) throw new Error(errV1?.message || 'Failed to create Vehicle 1');

    // 3. Insert Vehicle 2 (Porsche 911 - Thermal)
    const { data: v2, error: errV2 } = await supabase
      .from('vehicles')
      .insert({
        user_id: user.id,
        make: 'Porsche',
        model: '911 Carrera',
        year: 1995,
        vin: 'WP0ZZZ99ZSS398765',
        plate: '911-LUX-75',
        fuel_type: 'thermal',
        purchase_date: subtractMonths(6),
        purchase_price: 85000,
        currency,
        current_mileage_km: 185000,
        image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&q=80',
        color: 'Gris Bitume',
        trim: 'Carrera 4S',
        estimated_resale_value: 92000,
        resale_trend: 'up',
        insurance_provider: 'AXA Collection',
        insurance_monthly: 110,
      })
      .select('id')
      .single();

    if (errV2 || !v2) throw new Error(errV2?.message || 'Failed to create Vehicle 2');

    // 4. Fuel Entries (Tesla - Electric Recharges)
    const teslaFuel = [
      { km: 31200, qty: 45, price: 0.45, m: 11, day: 5 },
      { km: 32500, qty: 48, price: 0.45, m: 10, day: 12 },
      { km: 34100, qty: 50, price: 0.45, m: 8, day: 3 },
      { km: 36200, qty: 45, price: 0.48, m: 6, day: 15 },
      { km: 38000, qty: 47, price: 0.48, m: 4, day: 22 },
      { km: 40100, qty: 52, price: 0.52, m: 2, day: 10 },
      { km: 41500, qty: 44, price: 0.52, m: 1, day: 28 },
    ];

    for (const f of teslaFuel) {
      await supabase.from('fuel_entries').insert({
        vehicle_id: v1.id,
        user_id: user.id,
        occurred_at: subtractMonthsDateTime(f.m, f.day),
        energy_type: 'electric',
        quantity: f.qty,
        unit: 'kWh',
        unit_price: f.price,
        total_price: Math.round(f.qty * f.price * 100) / 100,
        currency,
        station_name: 'Tesla Supercharger',
        station_city: 'Lyon',
        mileage_km: f.km,
        ocr_source: 'manual',
      });
    }

    // 5. Fuel Entries (Porsche - Gasoline refills)
    const porscheFuel = [
      { km: 182400, qty: 62, price: 1.85, m: 5, day: 2 },
      { km: 183100, qty: 58, price: 1.88, m: 4, day: 8 },
      { km: 183800, qty: 65, price: 1.92, m: 3, day: 14 },
      { km: 184300, qty: 60, price: 1.95, m: 2, day: 20 },
      { km: 184800, qty: 64, price: 1.95, m: 1, day: 25 },
    ];

    for (const f of porscheFuel) {
      await supabase.from('fuel_entries').insert({
        vehicle_id: v2.id,
        user_id: user.id,
        occurred_at: subtractMonthsDateTime(f.m, f.day),
        energy_type: 'gasoline',
        quantity: f.qty,
        unit: 'L',
        unit_price: f.price,
        total_price: Math.round(f.qty * f.price * 100) / 100,
        currency,
        station_name: 'TotalEnergies Charenton',
        station_city: 'Paris',
        mileage_km: f.km,
        ocr_source: 'manual',
      });
    }

    // 6. Chain-hashed Maintenance Logs for Tesla (v1)
    // Log 1: Cabin filter & general inspection
    const tM1Id = crypto.randomUUID();
    const tM1Date = subtractMonthsDateTime(3, 10);
    const tM1Payload = JSON.stringify({
      id: tM1Id,
      vehicleId: v1.id,
      occurredAt: tM1Date,
      category: 'inspection',
      description: 'Contrôle technique annuel & filtres d’habitacle',
      cost: 120,
      currency,
      garageName: 'Tesla Service Center',
      mileageKm: 39800,
      previousHash: 'genesis',
    });
    const tM1Hash = sha256(tM1Payload);

    await supabase.from('maintenance_entries').insert({
      id: tM1Id,
      vehicle_id: v1.id,
      user_id: user.id,
      occurred_at: tM1Date,
      category: 'inspection',
      description: 'Contrôle technique annuel & filtres d’habitacle',
      cost: 120,
      currency,
      garage_name: 'Tesla Service Center',
      mileage_km: 39800,
      next_due_mileage: 60000,
      previous_hash: 'genesis',
      hash: tM1Hash,
    });

    // 7. Chain-hashed Maintenance Logs for Porsche (v2)
    // Log 1: Michelin Pilot Sport tires
    const pM1Id = crypto.randomUUID();
    const pM1Date = subtractMonthsDateTime(4, 15);
    const pM1Payload = JSON.stringify({
      id: pM1Id,
      vehicleId: v2.id,
      occurredAt: pM1Date,
      category: 'tires',
      description: tDemo('tyresRear'),
      cost: 580,
      currency,
      garageName: 'Station Service Porsche Lyon',
      mileageKm: 182800,
      previousHash: 'genesis',
    });
    const pM1Hash = sha256(pM1Payload);

    await supabase.from('maintenance_entries').insert({
      id: pM1Id,
      vehicle_id: v2.id,
      user_id: user.id,
      occurred_at: pM1Date,
      category: 'tires',
      description: tDemo('tyresRear'),
      cost: 580,
      currency,
      garage_name: 'Station Service Porsche Lyon',
      mileage_km: 182800,
      previous_hash: 'genesis',
      hash: pM1Hash,
    });

    // Log 2: Synthetic Oil & Filter change
    const pM2Id = crypto.randomUUID();
    const pM2Date = subtractMonthsDateTime(2, 5);
    const pM2Payload = JSON.stringify({
      id: pM2Id,
      vehicleId: v2.id,
      occurredAt: pM2Date,
      category: 'oil',
      description: tDemo('oilChange'),
      cost: 220,
      currency,
      garageName: 'Station Service Porsche Lyon',
      mileageKm: 184200,
      previousHash: pM1Hash,
    });
    const pM2Hash = sha256(pM2Payload);

    await supabase.from('maintenance_entries').insert({
      id: pM2Id,
      vehicle_id: v2.id,
      user_id: user.id,
      occurred_at: pM2Date,
      category: 'oil',
      description: tDemo('oilChange'),
      cost: 220,
      currency,
      garage_name: 'Station Service Porsche Lyon',
      mileage_km: 184200,
      previous_hash: pM1Hash,
      hash: pM2Hash,
    });

    // 8. Maintenance Alerts
    // Tesla Cabin filter soon
    await supabase.from('maintenance_alerts').insert({
      vehicle_id: v1.id,
      user_id: user.id,
      category: 'filter',
      severity: 'info',
      predicted_mileage: 60000,
      predicted_at: subtractMonthsDateTime(-6), // 6 months from now
      message: tDemo('alertFilter'),
    });

    // Porsche brakes check due soon
    await supabase.from('maintenance_alerts').insert({
      vehicle_id: v2.id,
      user_id: user.id,
      category: 'brakes',
      severity: 'warning',
      predicted_mileage: 190000,
      predicted_at: subtractMonthsDateTime(-3), // 3 months from now
      message: tDemo('alertBrakes'),
    });

    revalidatePath('/dashboard');
    revalidatePath('/vehicles');
    revalidatePath('/maintenance');
    revalidatePath('/fuel');

    return { ok: true };
  } catch (error: any) {
    console.error('Demo generation error:', error);
    return errResult('demoFailed');
  }
}
