'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { maintenanceInputSchema } from '@/lib/validators/maintenance';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function addMaintenanceAction(
  formData: FormData,
): Promise<ActionResult & { id?: string; hash?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = maintenanceInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return errResult('invalidData');
  }
  const m = parsed.data;

  // Verify vehicle ownership
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', m.vehicleId)
    .eq('user_id', user.id)
    .single();
  if (!vehicle) return errResult('vehicleNotFound');

  // Get previous hash for this vehicle (for chain)
  const { data: prev } = await supabase
    .from('maintenance_entries')
    .select('hash')
    .eq('vehicle_id', m.vehicleId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const previousHash = prev?.hash ?? 'genesis';

  // Compute hash deterministically
  const id = crypto.randomUUID();
  const payload = JSON.stringify({
    id,
    vehicleId: m.vehicleId,
    occurredAt: m.occurredAt,
    category: m.category,
    description: m.description,
    cost: m.cost,
    currency: m.currency,
    garageName: m.garageName,
    mileageKm: m.mileageKm,
    previousHash,
  });
  const hash = sha256(payload);

  const { data, error } = await supabase
    .from('maintenance_entries')
    .insert({
      id,
      vehicle_id: m.vehicleId,
      user_id: user.id,
      occurred_at: m.occurredAt,
      category: m.category,
      description: m.description,
      cost: m.cost,
      currency: m.currency,
      garage_name: m.garageName,
      mileage_km: m.mileageKm,
      next_due_mileage: m.nextDueMileage || null,
      next_due_date: m.nextDueDate || null,
      previous_hash: previousHash,
      hash,
    })
    .select('id, hash')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/maintenance');
  revalidatePath('/maintenance/log');
  revalidatePath(`/vehicles/${m.vehicleId}`);
  return { ok: true, id: data.id, hash: data.hash };
}

export async function dismissAlertAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');
  const { error } = await supabase
    .from('maintenance_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/maintenance');
  return { ok: true };
}
