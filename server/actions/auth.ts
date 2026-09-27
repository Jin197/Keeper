'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { auditAuthEvent } from '@/lib/security/audit';
import { notifyNewDeviceLoginIfNeeded } from '@/lib/security/login-notifications';
import { checkPasswordBreach, BREACH_THRESHOLD } from '@/lib/security/hibp';
import {
  isCaptchaConfigured,
  verifyCaptchaToken,
  CAPTCHA_FAILURE_THRESHOLD,
} from '@/lib/security/hcaptcha';
import { peekRateLimitCount } from '@/lib/rate-limit';
import {
  isCurrentDeviceTrusted,
  rememberDevice,
} from '@/lib/security/trusted-devices';
import {
  getClientIp,
  getUserAgent,
  hashEmail,
} from '@/lib/security/request-context';
import {
  strongPasswordSchema,
  loginPasswordSchema,
} from '@/lib/validators/password';
import { err, errResult } from '@/lib/errors';

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';
const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// Brute-force / credential-stuffing protection.
// Two parallel buckets so a single attacker IP can't burn through every
// user's email-bucket, and a single targeted email can't be cracked from
// a botnet of rotating IPs.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES_PER_EMAIL = 5;
const MAX_LOGIN_FAILURES_PER_IP = 10;

// Constant-time delay applied to failed logins. Prevents timing attacks
// that try to distinguish "unknown email" (fast Supabase reply) from
// "wrong password" (slow bcrypt). 800ms is comfortably above both real-world
// branches so the side-channel disappears.
const FAILED_LOGIN_DELAY_MS = 800;

/** Deliberately vague: never reveal whether the address exists. */
const genericLoginError = () => err('badCredentials');
const rateLimitedError = () => err('tooManyAttempts');

function setLocaleCookie(locale: string) {
  cookies().set(LOCALE_COOKIE_NAME, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}

async function constantTimeDelay(start: number) {
  const elapsed = Date.now() - start;
  const remaining = FAILED_LOGIN_DELAY_MS - elapsed;
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

const credentialsSchema = z.object({
  email: z.string().email('Email invalide'),
  password: loginPasswordSchema,
});

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  // Signup uses the strong policy. Existing accounts predating the policy
  // can still log in (loginPasswordSchema is laxer) and will be nudged to
  // upgrade their password at next reset.
  password: strongPasswordSchema,
  fullName: z.string().trim().min(1, 'Nom requis').max(80),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).default('GB'),
  currency: z.string().trim().toUpperCase().length(3).default('GBP'),
  locale: z.enum(['fr', 'en', 'es', 'ar', 'pt']).default('en'),
});

export type AuthResult = {
  error?: string;
  ok?: boolean;
  /** When set, the client must collect a TOTP code and call mfaLoginChallengeAction. */
  mfaRequired?: { factorId: string };
};

export async function loginAction(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');

  // Capture request context up-front (headers() can only be read in the
  // server action body, not inside helpers called later from redirect).
  const ip = getClientIp();
  const userAgent = getUserAgent();
  const startedAt = Date.now();

  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    await constantTimeDelay(startedAt);
    return { error: await genericLoginError() };
  }

  const emailHash = hashEmail(parsed.data.email);

  // ── hCaptcha gate (feature-flagged): if this email or IP has accumulated
  // 3+ failures within the rate-limit window, require a valid hCaptcha token.
  // Disabled entirely when HCAPTCHA_SECRET_KEY is unset (returns true from
  // verifyCaptchaToken in that case).
  if (isCaptchaConfigured()) {
    const [emailFails, ipFails] = await Promise.all([
      peekRateLimitCount(`login:email:${emailHash}`),
      peekRateLimitCount(`login:ip:${ip}`),
    ]);
    const captchaRequired =
      emailFails >= CAPTCHA_FAILURE_THRESHOLD ||
      ipFails >= CAPTCHA_FAILURE_THRESHOLD;
    if (captchaRequired) {
      const token = (formData.get('hcaptcha_token') as string | null) ?? null;
      const verified = await verifyCaptchaToken(token);
      if (!verified) {
        await auditAuthEvent({
          userId: null,
          action: 'login_failed',
          ip,
          userAgent,
          emailHash,
          metadata: { reason: 'captcha_failed' },
        });
        await constantTimeDelay(startedAt);
        return { error: await genericLoginError() };
      }
    }
  }

  // ── Rate-limit BEFORE touching Supabase to make brute-force cheap to reject.
  // Two independent buckets: per-email and per-IP. A failed login increments
  // both; on success we leave them in place (legitimate users rarely hit the
  // ceiling so this is fine, and we keep the audit signal for ops).
  const [emailBucket, ipBucket] = await Promise.all([
    rateLimit(`login:email:${emailHash}`, MAX_LOGIN_FAILURES_PER_EMAIL, RATE_WINDOW_MS),
    rateLimit(`login:ip:${ip}`, MAX_LOGIN_FAILURES_PER_IP, RATE_WINDOW_MS),
  ]);

  if (!emailBucket.ok || !ipBucket.ok) {
    await auditAuthEvent({
      userId: null,
      action: 'login_rate_limited',
      ip,
      userAgent,
      emailHash,
      metadata: {
        bucket: !emailBucket.ok ? 'email' : 'ip',
        reset_in_ms: Math.max(emailBucket.resetIn, ipBucket.resetIn),
      },
    });
    await constantTimeDelay(startedAt);
    return { error: await rateLimitedError() };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    await auditAuthEvent({
      userId: null,
      action: 'login_failed',
      ip,
      userAgent,
      emailHash,
      metadata: { reason: error.message, status: error.status ?? null },
    });
    await constantTimeDelay(startedAt);
    return { error: await genericLoginError() };
  }

  // ── Password verified. Before redirecting, check whether this account
  // has a verified TOTP factor that requires an AAL2 elevation challenge.
  // If yes, we DON'T redirect — the client must show the TOTP form and call
  // mfaLoginChallengeAction with the code.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
      // Find the verified TOTP factor to challenge.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
      if (totpFactor) {
        // Don't audit login_success yet — only after MFA challenge passes.
        return { ok: true, mfaRequired: { factorId: totpFactor.id } };
      }
    }

    // No MFA required (or no factor found) — complete the login normally.
    const { data: profile } = await supabase
      .from('profiles')
      .select('locale, email, full_name')
      .eq('id', user.id)
      .single();
    if (profile?.locale) setLocaleCookie(profile.locale);

    await auditAuthEvent({
      userId: user.id,
      action: 'login_success',
      ip,
      userAgent,
      emailHash,
    });

    // Suppress "new device" email when this browser is already trusted
    // (presents a valid device cookie pointing to an active row).
    const deviceTrusted = await isCurrentDeviceTrusted(user.id);
    if (profile?.email && !deviceTrusted) {
      await notifyNewDeviceLoginIfNeeded({
        userId: user.id,
        email: profile.email,
        fullName: profile.full_name ?? null,
        locale: profile.locale ?? 'fr',
        ip,
        userAgent,
      });
    }

    // Stamp/refresh the device cookie so future logins recognize this browser.
    await rememberDevice({ userId: user.id, ip, userAgent });
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

const breachedPasswordError = () => err('breachedPassword');

export async function signupAction(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    country: formData.get('country') ?? 'GB',
    currency: formData.get('currency') ?? 'GBP',
    locale: formData.get('locale') ?? 'en',
  });
  if (!parsed.success) {
    return errResult('invalidData');
  }

  // ── HaveIBeenPwned check (k-anonymous, raw password never leaves server).
  // If the password appears in any known breach, refuse signup and audit
  // the event so we can later size the impact of this policy.
  const breachCount = await checkPasswordBreach(parsed.data.password);
  if (breachCount >= BREACH_THRESHOLD) {
    await auditAuthEvent({
      userId: null,
      action: 'signup_blocked_breach',
      ip: getClientIp(),
      userAgent: getUserAgent(),
      emailHash: hashEmail(parsed.data.email),
      metadata: { breach_count: breachCount },
    });
    return { error: await breachedPasswordError() };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        country: parsed.data.country,
        currency: parsed.data.currency,
        locale: parsed.data.locale,
      },
    },
  });
  if (error) return { error: error.message };

  // Persist the chosen locale in the cookie immediately so the new account
  // experience renders in the picked language from the very next navigation.
  setLocaleCookie(parsed.data.locale);

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const email = z.string().email().safeParse(formData.get('email'));
  if (!email.success) return { error: 'Email invalide' };
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const password = strongPasswordSchema.safeParse(formData.get('password'));
  if (!password.success) {
    return errResult('invalidData');
  }
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: password.data,
  });
  if (error) return { error: error.message };

  // Audit the password change for the user's security log.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await auditAuthEvent({
      userId: user.id,
      action: 'password_changed',
      ip: getClientIp(),
      userAgent: getUserAgent(),
    });
  }

  return { ok: true };
}


/**
 * MFA challenge completed at login time. The user has already passed
 * password verification (AAL1) — this elevates the session to AAL2 and
 * finalizes the login: locale cookie sync, audit success, redirect.
 */
export async function mfaLoginChallengeAction(
  factorId: string,
  code: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');

  const ip = getClientIp();
  const userAgent = getUserAgent();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: await genericLoginError() };

  // Rate-limit MFA attempts per user (5 / 15 min) to make brute-forcing
  // the 6-digit code economically infeasible (1e6 codes / 5 attempts ≈ 200k windows).
  const bucket = await rateLimit(
    `mfa:user:${user.id}`,
    5,
    RATE_WINDOW_MS,
  );
  if (!bucket.ok) {
    await auditAuthEvent({
      userId: user.id,
      action: 'login_rate_limited',
      ip,
      userAgent,
      metadata: { stage: 'mfa' },
    });
    return { error: await rateLimitedError() };
  }

  const startedAt = Date.now();
  const { data: challenge, error: challengeErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) {
    await constantTimeDelay(startedAt);
    return { error: await genericLoginError() };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) {
    await auditAuthEvent({
      userId: user.id,
      action: 'mfa_challenge_failed',
      ip,
      userAgent,
      metadata: { phase: 'login' },
    });
    await constantTimeDelay(startedAt);
    return { error: await genericLoginError() };
  }

  // Success — sync locale, audit, notify, redirect.
  const { data: profile } = await supabase
    .from('profiles')
    .select('locale, email, full_name')
    .eq('id', user.id)
    .single();
  if (profile?.locale) setLocaleCookie(profile.locale);

  await auditAuthEvent({
    userId: user.id,
    action: 'mfa_challenge_success',
    ip,
    userAgent,
  });
  await auditAuthEvent({
    userId: user.id,
    action: 'login_success',
    ip,
    userAgent,
    metadata: { mfa: true },
  });

  const deviceTrusted = await isCurrentDeviceTrusted(user.id);
  if (profile?.email && !deviceTrusted) {
    await notifyNewDeviceLoginIfNeeded({
      userId: user.id,
      email: profile.email,
      fullName: profile.full_name ?? null,
      locale: profile.locale ?? 'fr',
      ip,
      userAgent,
    });
  }
  await rememberDevice({ userId: user.id, ip, userAgent });

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function signInWithProvider(
  provider: 'google' | 'apple',
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
      // No `prompt` override: Google handles the flow optimally — silent
      // re-auth for known users, consent only on first login. Forcing
      // 'select_account consent' on every login was painful for returners.
      // Keep offline access so we can refresh the Google token if needed.
      queryParams:
        provider === 'google' ? { access_type: 'offline' } : undefined,
    },
  });
  if (error) return { error: error.message };
  return { url: data.url };
}
