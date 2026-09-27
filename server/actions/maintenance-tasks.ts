'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { getInstructions } from '@/lib/maintenance/instructions';
import { getLocale } from 'next-intl/server';
import type {
  MaintenanceTaskRecord,
  MaintenanceCategory,
  MaintenanceTaskStatus,
  MaintenanceTaskSource,
  MaintenanceTaskInstructions,
} from '@/lib/types';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

const CATEGORY_VALUES = [
  'oil',
  'tires',
  'brakes',
  'filter',
  'battery',
  'inspection',
  'belt',
  'fluid',
  'gearbox',
  'other',
] as const satisfies readonly MaintenanceCategory[];

// ─── Shape coming in from the in-memory plan generator ─────────────

const upsertFromPlanSchema = z.object({
  vehicleId: z.string().uuid(),
  category: z.enum(CATEGORY_VALUES),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  reasoning: z.string().max(400).optional().nullable(),
  confidence: z.coerce.number().min(0).max(1).optional().nullable(),
  estimatedCost: z.coerce.number().nonnegative().optional().nullable(),
  dueAtDate: z.string().optional().nullable(),
  dueAtKm: z.coerce.number().int().nonnegative().optional().nullable(),
  source: z.enum(['plan', 'phm', 'manual']).default('plan'),
});

export type UpsertTaskInput = z.input<typeof upsertFromPlanSchema>;

/**
 * Create a task from a generated plan entry. If an open task with the same
 * (vehicle, category) already exists, we update its prediction in place
 * instead of inserting a duplicate.
 */
export async function upsertTaskFromPlanAction(
  input: UpsertTaskInput,
): Promise<ActionResult & { id?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = upsertFromPlanSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }
  const data = parsed.data;

  // Ownership check
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', data.vehicleId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!vehicle) return errResult('vehicleNotFound');

  const locale = await getLocale().catch(() => 'en');
  const instructions = getInstructions(data.category, locale === 'fr' ? 'fr' : 'en');

  // Look for an open task on this (vehicle, category) — RLS will enforce ownership
  const { data: existing } = await supabase
    .from('maintenance_tasks')
    .select('id, status, scheduled_for')
    .eq('vehicle_id', data.vehicleId)
    .eq('category', data.category)
    .in('status', ['pending', 'scheduled', 'in_progress', 'snoozed'])
    .maybeSingle<{ id: string; status: MaintenanceTaskStatus; scheduled_for: string | null }>();

  if (existing) {
    // Refresh the IA prediction but DON'T overwrite the user's manual edits
    // (notes, garage, scheduled_for, status).
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({
        title: data.title,
        description: data.description ?? undefined,
        reasoning: data.reasoning ?? undefined,
        confidence: data.confidence ?? undefined,
        estimated_cost: data.estimatedCost ?? undefined,
        estimated_duration_min: instructions.durationMinutes,
        due_at_date: data.dueAtDate ?? undefined,
        due_at_km: data.dueAtKm ?? undefined,
        instructions: instructions as unknown as never,
        source: data.source,
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
    revalidatePath(`/maintenance/plan/${data.vehicleId}`);
    return { ok: true, id: existing.id };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('maintenance_tasks')
    .insert({
      user_id: user.id,
      vehicle_id: data.vehicleId,
      source: data.source,
      category: data.category,
      title: data.title,
      description: data.description ?? null,
      reasoning: data.reasoning ?? null,
      confidence: data.confidence ?? null,
      estimated_cost: data.estimatedCost ?? null,
      estimated_duration_min: instructions.durationMinutes,
      due_at_date: data.dueAtDate ?? null,
      due_at_km: data.dueAtKm ?? null,
      instructions: instructions as unknown as never,
    })
    .select('id')
    .single<{ id: string }>();
  if (insertErr) return { error: insertErr.message };

  revalidatePath(`/maintenance/plan/${data.vehicleId}`);
  revalidatePath('/dashboard');
  return { ok: true, id: inserted?.id };
}

// ─── Schedule / snooze / dismiss / complete ────────────────────────

const scheduleSchema = z.object({
  taskId: z.string().uuid(),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminderDaysBefore: z.coerce.number().int().min(0).max(60).default(7),
  garageName: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function scheduleTaskAction(
  input: z.input<typeof scheduleSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }

  const { data: row, error: fetchErr } = await supabase
    .from('maintenance_tasks')
    .select('id, vehicle_id')
    .eq('id', parsed.data.taskId)
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; vehicle_id: string }>();
  if (fetchErr) return { error: fetchErr.message };
  if (!row) return { error: 'Tâche introuvable.' };

  const { error } = await supabase
    .from('maintenance_tasks')
    .update({
      scheduled_for: parsed.data.scheduledFor,
      reminder_days_before: parsed.data.reminderDaysBefore,
      garage_name: parsed.data.garageName ?? null,
      notes: parsed.data.notes ?? null,
      status: 'scheduled',
      // Reset reminder phase when rescheduled so the cron can fire again.
      last_reminder_phase: null,
      last_reminder_sent_at: null,
      snooze_until: null,
    })
    .eq('id', row.id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath(`/maintenance/plan/${row.vehicle_id}`);
  revalidatePath(`/vehicles/${row.vehicle_id}`);
  revalidatePath('/maintenance/agenda');
  return { ok: true };
}

const simpleIdSchema = z.object({ taskId: z.string().uuid() });

export async function dismissTaskAction(
  input: z.input<typeof simpleIdSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = simpleIdSchema.safeParse(input);
  if (!parsed.success) return { error: 'ID invalide' };

  const { error } = await supabase
    .from('maintenance_tasks')
    .update({ status: 'dismissed' })
    .eq('id', parsed.data.taskId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/maintenance/agenda');
  return { ok: true };
}

const snoozeSchema = z.object({
  taskId: z.string().uuid(),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function snoozeTaskAction(
  input: z.input<typeof snoozeSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = snoozeSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }
  const { error } = await supabase
    .from('maintenance_tasks')
    .update({
      status: 'snoozed',
      snooze_until: parsed.data.until,
      last_reminder_phase: null,
    })
    .eq('id', parsed.data.taskId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/maintenance/agenda');
  return { ok: true };
}

const completeSchema = z.object({
  taskId: z.string().uuid(),
  occurredAt: z.string().optional(),
  mileageKm: z.coerce.number().int().nonnegative(),
  cost: z.coerce.number().nonnegative(),
  garageName: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
});

/**
 * Closes a task and pushes a corresponding row into maintenance_entries so
 * the immutable history reflects the work that was done.
 */
export async function completeTaskAction(
  input: z.input<typeof completeSchema>,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) {
    return errResult('invalidData');
  }

  const { data: task, error: fetchErr } = await supabase
    .from('maintenance_tasks')
    .select('id, vehicle_id, category')
    .eq('id', parsed.data.taskId)
    .eq('user_id', user.id)
    .maybeSingle<{
      id: string;
      vehicle_id: string;
      category: MaintenanceCategory;
    }>();
  if (fetchErr) return { error: fetchErr.message };
  if (!task) return { error: 'Tâche introuvable.' };

  // Fetch the user's currency for the maintenance_entries row.
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('currency')
    .eq('id', task.vehicle_id)
    .maybeSingle<{ currency: string }>();

  const occurredAt = parsed.data.occurredAt
    ? new Date(parsed.data.occurredAt).toISOString()
    : new Date().toISOString();

  const { data: entry, error: insertErr } = await supabase
    .from('maintenance_entries')
    .insert({
      vehicle_id: task.vehicle_id,
      user_id: user.id,
      occurred_at: occurredAt,
      category: task.category,
      description: parsed.data.description,
      cost: parsed.data.cost,
      currency: vehicle?.currency ?? 'EUR',
      garage_name: parsed.data.garageName,
      mileage_km: parsed.data.mileageKm,
    } as never)
    .select('id')
    .single<{ id: string }>();
  if (insertErr) return { error: insertErr.message };

  const { error: closeErr } = await supabase
    .from('maintenance_tasks')
    .update({
      status: 'done',
      linked_entry_id: entry?.id ?? null,
    })
    .eq('id', task.id);
  if (closeErr) return { error: closeErr.message };

  revalidatePath('/dashboard');
  revalidatePath(`/maintenance/plan/${task.vehicle_id}`);
  revalidatePath(`/vehicles/${task.vehicle_id}`);
  revalidatePath('/maintenance/agenda');
  return { ok: true };
}

// ─── Fetchers used by RSC pages ─────────────────────────────────────

export async function getVehicleTasks(
  vehicleId: string,
): Promise<MaintenanceTaskRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('due_at_date', { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return data.map(rowToTask);
}

export async function getAllUserTasks(): Promise<MaintenanceTaskRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .neq('status', 'dismissed')
    .order('scheduled_for', { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return data.map(rowToTask);
}

// ─── Admin-side helpers used by the cron ────────────────────────────

/**
 * Pull every scheduled task whose reminder window opened today or earlier
 * and that has NOT yet been notified for the current phase. Returns rows
 * joined with the user's email + locale so the cron can send the message
 * without a second round-trip.
 */
export async function listDueRemindersForCron(): Promise<
  Array<{
    task: MaintenanceTaskRecord;
    userEmail: string;
    userFullName: string | null;
    userLocale: string;
    vehicleLabel: string;
    phase: 'warning' | 'urgent' | 'overdue';
  }>
> {
  if (!isSupabaseConfigured()) return [];
  const admin = createAdminClient();

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const { data, error } = await admin
    .from('maintenance_tasks')
    .select(
      'id, user_id, vehicle_id, source, category, title, description, instructions, reasoning, confidence, estimated_cost, estimated_duration_min, due_at_date, due_at_km, scheduled_for, reminder_days_before, last_reminder_phase, last_reminder_sent_at, status, snooze_until, garage_id, garage_name, notes, linked_entry_id, created_at, updated_at, profiles:profiles!maintenance_tasks_user_id_fkey(email, full_name, locale), vehicles:vehicles!maintenance_tasks_vehicle_id_fkey(make, model, plate)',
    )
    .eq('status', 'scheduled')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', addDays(today, 30).toISOString().slice(0, 10));
  if (error || !data) return [];

  const result: Array<{
    task: MaintenanceTaskRecord;
    userEmail: string;
    userFullName: string | null;
    userLocale: string;
    vehicleLabel: string;
    phase: 'warning' | 'urgent' | 'overdue';
  }> = [];

  for (const row of data as unknown as Array<
    Record<string, unknown> & {
      profiles?: { email: string; full_name: string | null; locale: string } | null;
      vehicles?: { make: string; model: string; plate: string } | null;
    }
  >) {
    const task = rowToTask(row);
    if (!row.profiles?.email) continue;
    const phase = computeReminderPhase(task, todayISO);
    if (!phase) continue;
    if (task.lastReminderPhase === phase) continue;
    result.push({
      task,
      userEmail: row.profiles.email,
      userFullName: row.profiles.full_name ?? null,
      userLocale: row.profiles.locale ?? 'fr',
      vehicleLabel: row.vehicles
        ? `${row.vehicles.make} ${row.vehicles.model} (${row.vehicles.plate})`
        : 'Votre véhicule',
      phase,
    });
  }
  return result;
}

/**
 * Mark a task as reminded for a given phase, AFTER the email + in-app
 * notification have been dispatched by the cron. Idempotent.
 */
export async function markReminderDispatched(
  taskId: string,
  phase: 'warning' | 'urgent' | 'overdue',
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = createAdminClient();
  await admin
    .from('maintenance_tasks')
    .update({
      last_reminder_phase: phase,
      last_reminder_sent_at: new Date().toISOString(),
    })
    .eq('id', taskId);
}

// ─── Helpers ────────────────────────────────────────────────────────

function computeReminderPhase(
  task: MaintenanceTaskRecord,
  todayISO: string,
): 'warning' | 'urgent' | 'overdue' | null {
  if (!task.scheduledFor) return null;
  const today = new Date(todayISO).getTime();
  const target = new Date(task.scheduledFor).getTime();
  const days = Math.round((target - today) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days <= 1) return 'urgent';
  if (days <= task.reminderDaysBefore) return 'warning';
  return null;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function rowToTask(row: Record<string, unknown>): MaintenanceTaskRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    vehicleId: row.vehicle_id as string,
    source: (row.source as MaintenanceTaskSource) ?? 'plan',
    category: row.category as MaintenanceCategory,
    title: row.title as string,
    description: (row.description as string) ?? null,
    instructions:
      (row.instructions as MaintenanceTaskInstructions | null) ?? null,
    reasoning: (row.reasoning as string) ?? null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    estimatedCost:
      row.estimated_cost != null ? Number(row.estimated_cost) : null,
    estimatedDurationMin:
      row.estimated_duration_min != null
        ? Number(row.estimated_duration_min)
        : null,
    dueAtDate: (row.due_at_date as string) ?? null,
    dueAtKm: row.due_at_km != null ? Number(row.due_at_km) : null,
    scheduledFor: (row.scheduled_for as string) ?? null,
    reminderDaysBefore: Number(row.reminder_days_before ?? 7),
    lastReminderPhase: (row.last_reminder_phase as string) ?? null,
    lastReminderSentAt: (row.last_reminder_sent_at as string) ?? null,
    status: row.status as MaintenanceTaskStatus,
    snoozeUntil: (row.snooze_until as string) ?? null,
    garageId: (row.garage_id as string) ?? null,
    garageName: (row.garage_name as string) ?? null,
    notes: (row.notes as string) ?? null,
    linkedEntryId: (row.linked_entry_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
