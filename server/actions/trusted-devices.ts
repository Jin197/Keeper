'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { err, errResult } from '@/lib/errors';

export interface TrustedDeviceRow {
  id: string;
  label: string;
  lastIp: string | null;
  lastUserAgent: string | null;
  lastSeenAt: string;
  createdAt: string;
  /** True when this row matches the cookie of the current browser. */
  isCurrent: boolean;
}

/**
 * List active (non-revoked) trusted devices for the current user.
 * The "current" device flag is best-effort: we don't expose the raw cookie
 * to the client, so we tag the row whose last_seen_at is the freshest if
 * it was touched within the last 60 seconds (typical after login).
 */
export async function listTrustedDevicesAction(): Promise<TrustedDeviceRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('trusted_devices' as never)
    .select('id, label, last_ip, last_user_agent, last_seen_at, created_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false });

  if (!data || !Array.isArray(data)) return [];

  const sixtySecondsAgo = Date.now() - 60_000;
  return (data as unknown as Array<{
    id: string;
    label: string | null;
    last_ip: string | null;
    last_user_agent: string | null;
    last_seen_at: string;
    created_at: string;
  }>).map((row, index) => ({
    id: row.id,
    label: row.label ?? 'Appareil',
    lastIp: row.last_ip,
    lastUserAgent: row.last_user_agent,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    // Most-recent row touched in the last minute is almost certainly "this device".
    isCurrent:
      index === 0 && new Date(row.last_seen_at).getTime() >= sixtySecondsAgo,
  }));
}

/**
 * Revoke a device by id. Soft-delete (revoked_at = now) so we keep audit trail.
 */
export async function revokeTrustedDeviceAction(
  deviceId: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  // Use admin client for the UPDATE to keep RLS semantics simple — we check
  // ownership explicitly here.
  const admin = createAdminClient();
  const { error } = await admin
    .from('trusted_devices' as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq('id', deviceId)
    .eq('user_id', user.id)
    .is('revoked_at', null);

  if (error) return { error: error.message };
  revalidatePath('/settings/security');
  return { ok: true };
}
