import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveGeoLocation, formatLocation } from './geoip';
import { translatorFor, intlTagFor } from '@/lib/i18n/messages';

interface NotifyOpts {
  userId: string;
  email: string;
  fullName: string | null;
  locale: string;
  ip: string;
  userAgent: string;
}

/**
 * Send a "new device login detected" email if:
 *   1. The Resend integration is configured (RESEND_API_KEY + EMAIL_FROM set)
 *   2. The (user_id, ip, user_agent) tuple has never been seen before, i.e.
 *      we don't notify on every login from the same device.
 *
 * Fails silently — login flow must never break because of a missing email.
 *
 * Activation: set the following Vercel env vars to turn this on in prod.
 *   - RESEND_API_KEY (Resend dashboard → API keys)
 *   - EMAIL_FROM     (e.g. "Velocewealth <security@velocewealth.app>")
 * Until both are set, this function is a no-op (returns immediately).
 */
export async function notifyNewDeviceLoginIfNeeded(
  opts: NotifyOpts,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return; // feature flag: disabled until configured
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createAdminClient();

    // Look back 90 days for any prior login_success with the same user-agent.
    // IP is deliberately excluded from the match — it changes across
    // wifi/4G/VPN on the same device and would produce false-positive alerts
    // every time the user changes network. The cookie-based isCurrentDeviceTrusted
    // check already short-circuits this branch for fully-trusted browsers.
    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: prior, error } = await admin
      .from('auth_audit_logs' as never)
      .select('id')
      .eq('user_id', opts.userId)
      .eq('action', 'login_success')
      .eq('user_agent', opts.userAgent)
      .gte('created_at', ninetyDaysAgo)
      .limit(2);

    if (error) return; // schema mismatch — fail silently
    // The current login_success was already inserted by auditAuthEvent —
    // so 1 row means this is the only/first occurrence (notify), 2+ means
    // we've seen this device before (skip).
    const matches = Array.isArray(prior) ? prior.length : 0;
    if (matches >= 2) return;

    await sendNewDeviceEmail(apiKey, from, opts);
  } catch {
    // never break the login flow
  }
}

async function sendNewDeviceEmail(
  apiKey: string,
  from: string,
  opts: NotifyOpts,
): Promise<void> {
  // GeoIP resolution is best-effort (timeout 1s, fail-open). If it fails the
  // email still goes out with only the IP — better than skipping the alert.
  const geo = await resolveGeoLocation(opts.ip);
  const subject = translatorFor(opts.locale, 'securityEmail')('newDeviceSubject');
  const html = htmlBody(opts, formatLocation(geo));
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: opts.email,
      subject,
      html,
    }),
  });
}

function htmlBody(opts: NotifyOpts, location: string | null): string {
  const t = translatorFor(opts.locale, 'securityEmail');
  const name = opts.fullName ?? opts.email.split('@')[0] ?? '';
  const when = new Date().toLocaleString(intlTagFor(opts.locale), {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(label)}</td><td>${value}</td></tr>`;
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="font-size:18px">${escapeHtml(t('hello', { name }))}</h2>
      <p>${escapeHtml(t('newDeviceBody'))}</p>
      <table style="border-collapse:collapse;margin:16px 0">
        ${row(t('when'), escapeHtml(when))}
        ${location ? row(t('location'), escapeHtml(location)) : ''}
        ${row(t('ip'), escapeHtml(opts.ip))}
        ${row(t('device'), escapeHtml(opts.userAgent))}
      </table>
      <p>${escapeHtml(t('wasYou'))}</p>
      <p><strong>${escapeHtml(t('wasNotYou'))}</strong></p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">${escapeHtml(t('automated'))}</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
