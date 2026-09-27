'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { auditAuthEvent } from '@/lib/security/audit';
import { getClientIp, getUserAgent } from '@/lib/security/request-context';
import { resolvePaidStatus } from '@/lib/computations/fines';
import type {
  TrafficFine,
  InfractionCategory,
  FineStatus,
} from '@/lib/types';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

const CATEGORY_VALUES = [
  'speeding',
  'parking',
  'bus_lane',
  'red_light',
  'phone_driving',
  'seatbelt',
  'alcohol',
  'drugs',
  'other',
] as const satisfies readonly InfractionCategory[];

const STATUS_VALUES = [
  'unpaid',
  'paid_minored',
  'paid_normal',
  'paid_majored',
  'paid_late_majored',
  'contested',
  'cancelled',
] as const satisfies readonly FineStatus[];

const addFineSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle'),
  category: z.enum(CATEGORY_VALUES),
  infractionDate: z.string().min(8),
  notificationDate: z.string().min(8),
  status: z.enum(STATUS_VALUES).default('unpaid'),
  pointsDeducted: z.coerce.number().int().min(0).max(6).default(0),
  amountInitial: z.coerce.number().nonnegative(),
  amountPaid: z.coerce.number().nonnegative().optional().nullable(),
  noticeNumber: z.string().trim().max(64).optional().nullable(),
  documentKey: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type AddFineInput = z.input<typeof addFineSchema>;

/** Insert a fine that the user types in manually. */
export async function addFineManuallyAction(
  input: AddFineInput,
): Promise<ActionResult & { id?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = addFineSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }

  // Ownership check on the vehicle: RLS would block the insert anyway, but
  // we want a clean error instead of a generic FK message.
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', parsed.data.vehicleId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!vehicle) {
    return errResult('vehicleNotYours');
  }

  const { data, error } = await supabase
    .from('traffic_fines' as never)
    .insert({
      user_id: user.id,
      vehicle_id: parsed.data.vehicleId,
      category: parsed.data.category,
      infraction_date: parsed.data.infractionDate,
      notification_date: parsed.data.notificationDate,
      status: parsed.data.status,
      points_deducted: parsed.data.pointsDeducted,
      amount_initial: parsed.data.amountInitial,
      amount_paid: parsed.data.amountPaid ?? null,
      notice_number: parsed.data.noticeNumber || null,
      document_key: parsed.data.documentKey || null,
      notes: parsed.data.notes || null,
      source: 'manual',
    } as never)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    if (error.code === '23505') {
      return errResult('duplicateFineNumber');
    }
    return { error: error.message };
  }

  revalidatePath('/vehicles');
  revalidatePath('/dashboard');
  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
  return { ok: true, id: data?.id };
}

const markPaidSchema = z.object({
  fineId: z.string().uuid(),
  paidAt: z.string().optional(),
  amountPaid: z.coerce.number().nonnegative(),
});

/** Mark a fine as paid; the new status is derived from the delay. */
export async function markFineAsPaidAction(
  input: z.input<typeof markPaidSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }

  const { data: row, error: fetchErr } = await supabase
    .from('traffic_fines' as never)
    .select('id, vehicle_id, notification_date, status')
    .eq('id', parsed.data.fineId)
    .eq('user_id', user.id)
    .maybeSingle<{
      id: string;
      vehicle_id: string;
      notification_date: string;
      status: FineStatus;
    }>();
  if (fetchErr) return { error: fetchErr.message };
  if (!row) return { error: 'Amende introuvable.' };
  if (row.status === 'cancelled') {
    return errResult('fineCancelled');
  }

  const paidAt = parsed.data.paidAt
    ? new Date(parsed.data.paidAt)
    : new Date();
  const newStatus = resolvePaidStatus(
    { notificationDate: row.notification_date },
    paidAt,
  );

  const { error: updateErr } = await supabase
    .from('traffic_fines' as never)
    .update({
      status: newStatus,
      amount_paid: parsed.data.amountPaid,
      paid_at: paidAt.toISOString(),
    } as never)
    .eq('id', row.id);
  if (updateErr) return { error: updateErr.message };

  revalidatePath('/vehicles');
  revalidatePath('/dashboard');
  revalidatePath(`/vehicles/${row.vehicle_id}`);
  return { ok: true };
}

const contestSchema = z.object({
  fineId: z.string().uuid(),
  reason: z.string().trim().min(10).max(2000),
});

/** Switch a fine to contested status; record the reason in audit_logs. */
export async function contestFineAction(
  input: z.input<typeof contestSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = contestSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('contestReasonRequired');
  }

  const { data: row, error: fetchErr } = await supabase
    .from('traffic_fines' as never)
    .select('id, vehicle_id, status')
    .eq('id', parsed.data.fineId)
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; vehicle_id: string; status: FineStatus }>();
  if (fetchErr) return { error: fetchErr.message };
  if (!row) return { error: 'Amende introuvable.' };

  const { error: updateErr } = await supabase
    .from('traffic_fines' as never)
    .update({ status: 'contested' } as never)
    .eq('id', row.id);
  if (updateErr) return { error: updateErr.message };

  // Trace the reason in the regular audit log so it survives a possible
  // delete of the fine row later on.
  await auditAuthEvent({
    userId: user.id,
    action: 'password_changed',
    ip: getClientIp(),
    userAgent: getUserAgent(),
    metadata: {
      event: 'fine_contested',
      fine_id: row.id,
      reason: parsed.data.reason,
    },
  });

  revalidatePath('/vehicles');
  revalidatePath('/dashboard');
  revalidatePath(`/vehicles/${row.vehicle_id}`);
  return { ok: true };
}

/**
 * Update a fine's registration formula number on the *vehicle* (not on
 * the fine itself). Called when the user fills in the missing field
 * via the "info modal" before launching a search.
 */
export async function setRegistrationFormulaNumberAction(
  vehicleId: string,
  formulaNumber: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');
  const cleaned = formulaNumber.trim();
  if (cleaned.length < 6 || cleaned.length > 32) {
    return errResult('invalidFormulaNumber');
  }
  const { error } = await supabase
    .from('vehicles')
    .update({ registration_formula_number: cleaned })
    .eq('id', vehicleId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}

/** Server-side fetcher used by RSCs. */
export async function getVehicleFines(
  vehicleId: string,
): Promise<TrafficFine[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('traffic_fines' as never)
    .select(
      'id, user_id, vehicle_id, notice_number, document_key, category, infraction_date, notification_date, status, points_deducted, amount_initial, amount_paid, paid_at, source, raw_ocr_text, notes, created_at, updated_at',
    )
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
    .order('notification_date', { ascending: false });
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(rowToFine);
}

/** Same as above but across the user's whole fleet — feeds the dashboard. */
export async function getAllUserFines(): Promise<TrafficFine[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('traffic_fines' as never)
    .select(
      'id, user_id, vehicle_id, notice_number, document_key, category, infraction_date, notification_date, status, points_deducted, amount_initial, amount_paid, paid_at, source, raw_ocr_text, notes, created_at, updated_at',
    )
    .eq('user_id', user.id)
    .order('notification_date', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Record<string, unknown>[]).map(rowToFine);
}

function rowToFine(row: Record<string, unknown>): TrafficFine {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    vehicleId: row.vehicle_id as string,
    noticeNumber: (row.notice_number as string) ?? null,
    documentKey: (row.document_key as string) ?? null,
    category: row.category as InfractionCategory,
    infractionDate: row.infraction_date as string,
    notificationDate: row.notification_date as string,
    status: row.status as FineStatus,
    pointsDeducted: Number(row.points_deducted ?? 0),
    amountInitial: Number(row.amount_initial ?? 0),
    amountPaid: row.amount_paid != null ? Number(row.amount_paid) : null,
    paidAt: (row.paid_at as string) ?? null,
    source: (row.source as 'manual' | 'ocr_antai') ?? 'manual',
    rawOcrText: (row.raw_ocr_text as string) ?? null,
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
