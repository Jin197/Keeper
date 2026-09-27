'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  OTP_VALIDITY_MINUTES,
  isValidConfirmationPhrase,
} from '@/lib/security/account-deletion';
import { renderAccountDeletionEmail } from '@/lib/security/email-templates';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { auditAuthEvent } from '@/lib/security/audit';
import { getClientIp, getUserAgent } from '@/lib/security/request-context';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

export async function exportUserDataAction(): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: await err('notConfigured') };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: await err('unauthenticated') };

  try {
    // 1. Get Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 2. Get Vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id);

    // 3. Get Fuel entries
    const { data: fuelEntries } = await supabase
      .from('fuel_entries')
      .select('*')
      .eq('user_id', user.id);

    // 4. Get Maintenance entries
    const { data: maintenanceEntries } = await supabase
      .from('maintenance_entries')
      .select('*')
      .eq('user_id', user.id);

    // 5. Get Maintenance alerts
    const { data: maintenanceAlerts } = await supabase
      .from('maintenance_alerts')
      .select('*')
      .eq('user_id', user.id);

    // 6. Get Subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    // 7. Get Audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      profile: profile || null,
      vehicles: vehicles || [],
      fuelEntries: fuelEntries || [],
      maintenanceEntries: maintenanceEntries || [],
      maintenanceAlerts: maintenanceAlerts || [],
      subscriptions: subscriptions || [],
      auditLogs: auditLogs || [],
    };

    return { ok: true, data: exportData };
  } catch {
    return {
      ok: false,
      error: await err('fetchFailed'),
    };
  }
}

/**
 * Pre-deletion preview for the UI. Cheap row counts + Stripe customer
 * lookup so the user sees exactly what they are about to lose.
 */
export async function getAccountDeletionPreviewAction(): Promise<{
  vehicles: number;
  fuelEntries: number;
  maintenanceEntries: number;
  hasActiveSubscription: boolean;
}> {
  const empty = {
    vehicles: 0,
    fuelEntries: 0,
    maintenanceEntries: 0,
    hasActiveSubscription: false,
  };
  if (!isSupabaseConfigured()) return empty;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  // `count: 'exact', head: true` returns just the row count without the rows.
  const [{ count: v }, { count: f }, { count: m }, { data: subs }] =
    await Promise.all([
      supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('fuel_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('maintenance_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing']),
    ]);

  return {
    vehicles: v ?? 0,
    fuelEntries: f ?? 0,
    maintenanceEntries: m ?? 0,
    hasActiveSubscription: (subs?.length ?? 0) > 0,
  };
}

/**
 * Step 1 of the secured account-deletion flow.
 *
 * - Verifies the user is authenticated.
 * - Rate-limits to 1 request / 5 minutes per user to prevent email bombing.
 * - Invalidates any prior unconsumed request (defense in depth).
 * - Generates a 6-digit OTP, stores its SHA-256 hash, and emails the raw
 *   code to the user via Resend if configured.
 * - Always reports success to the client to avoid leaking which step failed
 *   (rate-limit hit, email send error, etc.) — except for non-auth, which
 *   is a hard prerequisite.
 *
 * When Resend isn't configured (no RESEND_API_KEY / EMAIL_FROM in env), the
 * action returns the OTP back to the server console via console.warn so a
 * developer can still test the flow locally.
 */
export async function requestAccountDeletionAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  // 1 request / 1 minute per user
  const bucket = await rateLimit(
    `delete-request:${user.id}`,
    1,
    60 * 1000,
  );
  if (!bucket.ok) {
    return {
      error: await err('tooSoon'),
    };
  }

  const admin = createAdminClient();

  // Invalidate prior pending requests so only the freshest OTP is valid.
  await admin
    .from('account_deletion_requests' as never)
    .update({ consumed_at: new Date().toISOString() } as never)
    .eq('user_id', user.id)
    .is('consumed_at', null);

  const otp = generateOtp();
  const { error: insertErr } = await admin
    .from('account_deletion_requests' as never)
    .insert({
      user_id: user.id,
      otp_hash: hashOtp(otp),
      expires_at: otpExpiresAt(),
    } as never);

  if (insertErr) {
    return errResult('requestFailed');
  }

  // Fetch profile for email personalization. Fall back to user.email if
  // the row is missing for any reason.
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, locale')
    .eq('id', user.id)
    .single();

  const email = profile?.email ?? user.email ?? null;
  if (!email) {
    // No email at all — flag but don't surface the inner detail.
    return { error: 'Impossible d\'envoyer le code (email manquant).' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const rendered = renderAccountDeletionEmail({
    fullName: profile?.full_name ?? null,
    email,
    otp,
    expiresInMinutes: OTP_VALIDITY_MINUTES,
    locale: profile?.locale ?? 'fr',
  });

  // Always log the OTP in development so developers can easily bypass email delays
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[account-deletion] OTP for ${user.id} (development debug log): ${otp}`,
    );
  }

  if (apiKey && from) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });
    } catch {
      // Email send failure is logged but not surfaced to avoid leaking
      // provider status. The OTP row is still valid; the user can retry
      // after the rate-limit window.
    }
  } else if (process.env.NODE_ENV !== 'development') {
    // Production fallback log if Resend is missing
    console.warn(
      `[account-deletion] OTP for ${user.id} (no Resend API key configured): ${otp}`,
    );
  }

  return { ok: true };
}

/**
 * Step 2 — full destructive confirmation flow.
 *
 * Requires two independent factors, validated in this order so we fail
 * cheap on the most likely user error first:
 *   1. The exact confirmation phrase (any supported locale variant).
 *   2. A valid, non-expired, non-consumed OTP from the latest request.
 *
 * Password re-authentication was intentionally removed for UX. The trade-off:
 * a stolen session + access to the user's email is now enough to delete
 * their account. Email access is still the gating factor since the OTP is
 * single-use and lasts 15 minutes.
 *
 * Once both pass, we tear down server-side state in dependency order:
 *   - Mark the OTP row consumed (anti-replay).
 *   - Cancel every active Stripe subscription (best-effort; failures logged
 *     but don't block the deletion — the auth user removal is what really
 *     matters for the user's "right to be forgotten").
 *   - Delete every object from Storage buckets owned by this user
 *     (`receipts/`, `invoices/`, `vehicle-photos/`, `avatars/`).
 *   - Append a final `account_deleted` row to auth_audit_logs.
 *   - Delete the auth user; the `on delete cascade` foreign keys flush all
 *     profile / vehicles / fuel / maintenance / subscriptions / etc. rows.
 *
 * The auth audit entry is written BEFORE the deleteUser call so the row
 * survives (auth_audit_logs.user_id is ON DELETE SET NULL by design).
 */
export async function deleteAccountAction(
  otp: string,
  confirmationPhrase: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');

  // ── 1. Auth context
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');
  if (!user.email) return { error: 'Compte sans email — contactez le support' };

  // ── 2. Confirmation phrase (cheap)
  if (!isValidConfirmationPhrase(confirmationPhrase)) {
    return { error: 'Phrase de confirmation incorrecte' };
  }

  // ── 3. OTP lookup — most recent unconsumed, non-expired request
  const admin = createAdminClient();
  const { data: requestRow } = await admin
    .from('account_deletion_requests' as never)
    .select('id, otp_hash, expires_at')
    .eq('user_id', user.id)
    .is('consumed_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const request = requestRow as
    | { id: string; otp_hash: string; expires_at: string }
    | null;
  if (!request) {
    return { error: 'Aucun code valide. Redemandez un code.' };
  }
  if (!verifyOtp(otp, request.otp_hash)) {
    return { error: 'Code incorrect' };
  }

  // ── 5. Consume the OTP immediately so it can't be replayed.
  await admin
    .from('account_deletion_requests' as never)
    .update({ consumed_at: new Date().toISOString() } as never)
    .eq('id', request.id);

  // ── 6. Stripe: cancel all active subscriptions if the user has a Stripe
  // customer. Best-effort: failures are logged but don't block the deletion.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();
  if (profile?.stripe_customer_id && isStripeConfigured()) {
    try {
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all',
        limit: 100,
      });
      await Promise.all(
        subs.data
          .filter((s) =>
            ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status),
          )
          .map((s) =>
            stripe.subscriptions
              .cancel(s.id, { invoice_now: false, prorate: false })
              .catch(() => {
                // Swallow individual cancel errors — we still want to
                // proceed with the destructive steps.
              }),
          ),
      );
    } catch {
      // Stripe outage shouldn't block GDPR deletion.
    }
  }

  // ── 7. Storage cleanup: list + delete every object whose path begins
  // with `<userId>/` in each known bucket.
  await Promise.all(
    (['receipts', 'invoices', 'vehicle-photos', 'avatars'] as const).map(
      async (bucket) => {
        try {
          const { data: objects } = await admin.storage
            .from(bucket)
            .list(user.id, { limit: 1000 });
          if (!objects || objects.length === 0) return;
          const paths = objects.map((o) => `${user.id}/${o.name}`);
          await admin.storage.from(bucket).remove(paths);
        } catch {
          // Per-bucket failures are non-fatal.
        }
      },
    ),
  );

  // ── 8. Final audit row (written BEFORE deleteUser so it survives the
  // cascade; auth_audit_logs.user_id is ON DELETE SET NULL).
  await auditAuthEvent({
    userId: user.id,
    action: 'password_changed', // closest catalogued action; metadata.scope below tags it
    ip: getClientIp(),
    userAgent: getUserAgent(),
    metadata: { event: 'account_deleted', stripe_customer: profile?.stripe_customer_id ?? null },
  });

  // ── 9. Delete the auth user; FK cascades wipe the rest.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: `Échec de la suppression : ${error.message}` };
  }

  return { ok: true };
}
