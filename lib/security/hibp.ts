import 'server-only';
import crypto from 'crypto';

/**
 * Check whether a password appears in a known breach via the HaveIBeenPwned
 * Pwned Passwords API. Uses k-anonymity: we send only the first 5 chars of
 * the SHA-1 hash, and HIBP returns all matching suffixes. The raw password
 * never leaves our server.
 *
 * Returns the number of times the password has been seen in breaches.
 * 0 → safe; >0 → user should pick another password.
 *
 * Network failures are non-blocking: we return 0 (treat as safe) rather than
 * preventing signup over a transient outage. The risk surface is small
 * because we still have signup rate-limits + strong password policy.
 *
 * Free tier — no API key required, public k-anonymity endpoint.
 */
const HIBP_ENDPOINT = 'https://api.pwnedpasswords.com/range/';
const HIBP_TIMEOUT_MS = 2500;

export async function checkPasswordBreach(password: string): Promise<number> {
  try {
    const sha1 = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

    const res = await fetch(`${HIBP_ENDPOINT}${prefix}`, {
      headers: {
        // Padded responses defeat traffic analysis on the wire.
        'Add-Padding': 'true',
        'User-Agent': 'keeper-signup',
      },
      signal: controller.signal,
      // No cookies, no caching — privacy hygiene.
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) return 0;

    const body = await res.text();
    // Body is lines of "<SUFFIX>:<COUNT>" — find ours (case-insensitive).
    const line = body
      .split(/\r?\n/)
      .find((l) => l.split(':')[0]?.toUpperCase() === suffix);
    if (!line) return 0;
    const count = parseInt(line.split(':')[1] ?? '0', 10);
    return Number.isFinite(count) ? count : 0;
  } catch {
    // Timeout, network error, abort — fail open (don't block signup).
    return 0;
  }
}

/**
 * Threshold above which we refuse a signup. Picked at 1: any appearance in
 * a known breach is enough to require a different password. The user is
 * explicitly told to pick another one.
 */
export const BREACH_THRESHOLD = 1;
