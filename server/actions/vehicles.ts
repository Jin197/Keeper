'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { vehicleInputSchema } from '@/lib/validators/vehicle';
import { inferCountryFromPlate } from '@/lib/vehicle-data/country';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80';

export async function createVehicleAction(
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = vehicleInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return errResult('invalidData');
  }

  const v = parsed.data;

  // Check for duplicates in active fleet (plate or VIN) in memory with normalized formatting
  const { data: activeVehicles, error: fetchError } = await supabase
    .from('vehicles')
    .select('id, plate, vin')
    .eq('user_id', user.id)
    .is('archived_at', null);

  if (fetchError) return { error: fetchError.message };

  const normalizeString = (str: string) => {
    return str.toUpperCase().replace(/[\s-]/g, '');
  };

  const cleanInputPlate = normalizeString(v.plate);
  const cleanInputVin = v.vin ? normalizeString(v.vin) : null;

  const isDuplicate = activeVehicles?.some(existing => {
    const existingPlate = normalizeString(existing.plate);
    const existingVin = existing.vin ? normalizeString(existing.vin) : null;
    return (
      existingPlate === cleanInputPlate ||
      (cleanInputVin && existingVin === cleanInputVin)
    );
  });

  if (isDuplicate) {
    return errResult('duplicateVehicle');
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      user_id: user.id,
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin || null,
      plate: v.plate,
      fuel_type: v.fuelType,
      purchase_date: v.purchaseDate,
      purchase_price: v.purchasePrice,
      currency: v.currency,
      current_mileage_km: v.currentMileageKm,
      image_url: v.imageUrl || DEFAULT_IMAGE,
      color: v.color || null,
      trim: v.trim || null,
      estimated_resale_value: Math.round(v.purchasePrice * 0.78),
      resale_trend: 'stable',
      insurance_provider: v.insuranceProvider || null,
      insurance_monthly: v.insuranceMonthly || null,
      insurance_renewal_date: v.insuranceRenewalDate || null,
      country: v.country || inferCountryFromPlate(v.plate) || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/vehicles');
  return { ok: true, id: data.id };
}

export async function updateVehicleAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = vehicleInputSchema.partial().safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return errResult('invalidData');
  }

  const v = parsed.data;
  const { error } = await supabase
    .from('vehicles')
    .update({
      ...(v.make !== undefined && { make: v.make }),
      ...(v.model !== undefined && { model: v.model }),
      ...(v.year !== undefined && { year: v.year }),
      ...(v.plate !== undefined && { plate: v.plate }),
      ...(v.fuelType !== undefined && { fuel_type: v.fuelType }),
      ...(v.currentMileageKm !== undefined && {
        current_mileage_km: v.currentMileageKm,
      }),
      ...(v.color !== undefined && { color: v.color || null }),
      ...(v.trim !== undefined && { trim: v.trim || null }),
      ...(v.imageUrl !== undefined && { image_url: v.imageUrl || null }),
      ...(v.insuranceProvider !== undefined && {
        insurance_provider: v.insuranceProvider || null,
      }),
      ...(v.insuranceMonthly !== undefined && {
        insurance_monthly: v.insuranceMonthly || null,
      }),
      ...(v.insuranceRenewalDate !== undefined && {
        insurance_renewal_date: v.insuranceRenewalDate || null,
      }),
      ...(v.country !== undefined && { country: v.country || null }),
      ...(v.vin !== undefined && { vin: v.vin || null }),
      ...(v.purchaseDate !== undefined && { purchase_date: v.purchaseDate }),
      ...(v.purchasePrice !== undefined && {
        purchase_price: v.purchasePrice,
      }),
      ...(v.currency !== undefined && { currency: v.currency }),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/vehicles');
  revalidatePath(`/vehicles/${id}`);
  return { ok: true };
}

export async function deleteVehicleAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/vehicles');
  redirect('/vehicles');
}
