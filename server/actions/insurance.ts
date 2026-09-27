'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { InsuranceRecord } from '@/lib/types';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

const modeSchema = z.object({
  vehicleId: z.string().uuid(),
  mode: z.enum(['fixed', 'variable']),
  fixedAmount: z.coerce.number().nonnegative().optional().nullable(),
});

/**
 * Switches a vehicle's insurance accounting between a single flat amount
 * (`fixed`) and per-month rows (`variable`). When switching to `fixed` the
 * caller can also store the constant amount; for `variable` we leave the
 * flat field untouched so the user can flip back without losing data.
 */
export async function setInsuranceModeAction(
  input: z.input<typeof modeSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = modeSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }

  const update: { insurance_mode: 'fixed' | 'variable'; insurance_monthly?: number } = {
    insurance_mode: parsed.data.mode,
  };
  if (parsed.data.mode === 'fixed' && parsed.data.fixedAmount != null) {
    update.insurance_monthly = parsed.data.fixedAmount;
  }

  const { error } = await supabase
    .from('vehicles')
    .update(update)
    .eq('id', parsed.data.vehicleId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
  revalidatePath(`/vehicles/${parsed.data.vehicleId}/edit`);
  revalidatePath('/dashboard');
  return { ok: true };
}

const recordSchema = z.object({
  vehicleId: z.string().uuid(),
  /** Accept YYYY-MM or YYYY-MM-DD; we normalise to YYYY-MM-01. */
  month: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  amount: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function upsertInsuranceRecordAction(
  input: z.input<typeof recordSchema>,
): Promise<ActionResult & { id?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }

  // Normalise to first day of the month.
  const month = `${parsed.data.month.slice(0, 7)}-01`;

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, currency')
    .eq('id', parsed.data.vehicleId)
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; currency: string }>();
  if (!vehicle) return errResult('vehicleNotFound');

  // Look up an existing row for this (vehicle, month) — fall back to insert.
  const { data: existing } = await supabase
    .from('insurance_records')
    .select('id')
    .eq('vehicle_id', vehicle.id)
    .eq('month', month)
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from('insurance_records')
      .update({
        amount: parsed.data.amount,
        notes: parsed.data.notes ?? null,
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
    revalidatePath(`/vehicles/${parsed.data.vehicleId}/edit`);
    revalidatePath('/dashboard');
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from('insurance_records')
    .insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      month,
      amount: parsed.data.amount,
      currency: vehicle.currency,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single<{ id: string }>();
  if (error) return { error: error.message };

  revalidatePath(`/vehicles/${parsed.data.vehicleId}/edit`);
  revalidatePath('/dashboard');
  return { ok: true, id: data?.id };
}

export async function deleteInsuranceRecordAction(
  recordId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const { error } = await supabase
    .from('insurance_records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function getInsuranceRecords(
  vehicleId: string,
): Promise<InsuranceRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('insurance_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
    .order('month', { ascending: false });
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    userId: row.user_id as string,
    month: row.month as string,
    amount: Number(row.amount ?? 0),
    currency: row.currency as string,
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getAllUserInsuranceRecords(): Promise<InsuranceRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('insurance_records')
    .select('*')
    .eq('user_id', user.id);
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    userId: row.user_id as string,
    month: row.month as string,
    amount: Number(row.amount ?? 0),
    currency: row.currency as string,
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}
