'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import type {
  InAppNotification,
  InAppNotificationKind,
} from '@/lib/types';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

/** Fetch the user's most recent notifications (read or unread, capped at 30). */
export async function getRecentNotifications(): Promise<InAppNotification[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('in_app_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error || !data) return [];
  return data.map(rowToNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('in_app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);
  return count ?? 0;
}

export async function markNotificationAsReadAction(
  notificationId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
}

export async function markAllNotificationsAsReadAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/**
 * Admin-side helper used by server-only flows (cron job, webhooks). Bypasses
 * RLS via the service-role client so notifications can be created on behalf
 * of any user without needing their session.
 */
export async function pushInAppNotification(args: {
  userId: string;
  kind: InAppNotificationKind;
  title: string;
  body?: string;
  link?: string;
  relatedVehicleId?: string;
  relatedTaskId?: string;
  /**
   * Idempotency key (unique per user). A second push with the same key is a
   * no-op, so daily crons can re-run safely. Returns false when deduplicated.
   */
  dedupeKey?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = createAdminClient();
  const row = {
    user_id: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body ?? null,
    link: args.link ?? null,
    related_vehicle_id: args.relatedVehicleId ?? null,
    related_task_id: args.relatedTaskId ?? null,
    dedupe_key: args.dedupeKey ?? null,
  };
  if (args.dedupeKey) {
    const { data, error } = await admin
      .from('in_app_notifications')
      .upsert(row, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
      .select('id');
    return !error && Array.isArray(data) && data.length > 0;
  }
  const { error } = await admin.from('in_app_notifications').insert(row);
  return !error;
}

function rowToNotification(row: Record<string, unknown>): InAppNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    kind: row.kind as InAppNotificationKind,
    title: row.title as string,
    body: (row.body as string) ?? null,
    link: (row.link as string) ?? null,
    relatedVehicleId: (row.related_vehicle_id as string) ?? null,
    relatedTaskId: (row.related_task_id as string) ?? null,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
