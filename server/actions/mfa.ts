'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { auditAuthEvent } from '@/lib/security/audit';
import { getClientIp, getUserAgent } from '@/lib/security/request-context';
import { err, errResult } from '@/lib/errors';

export type MfaResult =
  | { ok: true }
  | { error: string };

export type MfaEnrollResult =
  | {
      ok: true;
      /** TOTP secret as `otpauth://` URI for QR code generation client-side. */
      uri: string;
      /** Raw base32 secret as fallback for manual entry. */
      secret: string;
      /** Supabase MFA factor id, required for verification. */
      factorId: string;
    }
  | { error: string };

const codeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'Six-digit code required');

/**
 * Step 1 — start TOTP enrollment. Returns the otpauth URI for QR rendering.
 * The user must then call `verifyMfaEnrollmentAction` with a code from their
 * authenticator app to finalize the enrollment.
 */
export async function enrollMfaAction(): Promise<MfaEnrollResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  // Clean up any half-enrolled (unverified) factors from previous attempts.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  const stale = existing?.all?.filter(
    (f) => f.factor_type === 'totp' && f.status !== 'verified',
  );
  if (stale && stale.length > 0) {
    await Promise.all(
      stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })),
    );
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Keeper (${new Date().toISOString().slice(0, 10)})`,
  });
  if (error) return { error: error.message };
  return {
    ok: true,
    uri: data.totp.uri,
    secret: data.totp.secret,
    factorId: data.id,
  };
}

/**
 * Step 2 — verify the 6-digit code and mark the factor as confirmed.
 * Once verified, the factor will be required at every subsequent login.
 */
export async function verifyMfaEnrollmentAction(
  factorId: string,
  code: string,
): Promise<MfaResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Code invalide' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  // Supabase requires a challenge before verify even during enrollment.
  const { data: challenge, error: challengeErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) return { error: challengeErr.message };

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: parsed.data,
  });
  if (error) {
    await auditAuthEvent({
      userId: user.id,
      action: 'mfa_challenge_failed',
      ip: getClientIp(),
      userAgent: getUserAgent(),
      metadata: { phase: 'enrollment' },
    });
    return { error: 'Code incorrect' };
  }

  await auditAuthEvent({
    userId: user.id,
    action: 'mfa_enrolled',
    ip: getClientIp(),
    userAgent: getUserAgent(),
  });
  return { ok: true };
}

/**
 * Step 3 (login-time) — submit a TOTP code for an existing verified factor
 * to elevate the session from AAL1 to AAL2.
 */
export async function challengeMfaAction(
  factorId: string,
  code: string,
): Promise<MfaResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Code invalide' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const ip = getClientIp();
  const userAgent = getUserAgent();

  const { data: challenge, error: challengeErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) return { error: challengeErr.message };

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: parsed.data,
  });
  if (error) {
    await auditAuthEvent({
      userId: user.id,
      action: 'mfa_challenge_failed',
      ip,
      userAgent,
      metadata: { phase: 'login' },
    });
    return { error: 'Code incorrect' };
  }

  await auditAuthEvent({
    userId: user.id,
    action: 'mfa_challenge_success',
    ip,
    userAgent,
  });
  return { ok: true };
}

/**
 * Disable an existing verified TOTP factor. Always requires the user to be
 * currently authenticated at AAL2 (Supabase enforces this by policy when MFA
 * is set up). Audit the action so the user can review it in their security log.
 */
export async function disableMfaAction(factorId: string): Promise<MfaResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errResult('unauthenticated');

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };

  await auditAuthEvent({
    userId: user.id,
    action: 'mfa_disabled',
    ip: getClientIp(),
    userAgent: getUserAgent(),
  });
  return { ok: true };
}

/**
 * Server-side helper: returns the user's verified TOTP factor (or null).
 * Used by the Security settings page to show "MFA enabled" state and by
 * the login flow to detect whether a challenge is required.
 */
export async function getVerifiedTotpFactor(): Promise<{
  id: string;
  friendlyName: string | null;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp?.find((f) => f.status === 'verified');
  return verified
    ? { id: verified.id, friendlyName: verified.friendly_name ?? null }
    : null;
}
