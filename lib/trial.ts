/**
 * Single source of truth for the free-trial length.
 *
 * This number is user-visible in three independent places — the landing page
 * copy, the in-app countdown banners, and the `trial_period_days` we hand to
 * Stripe Checkout. It used to be hard-coded separately in each of them, which
 * let the marketing promise drift away from what the app actually enforced,
 * so a subscriber saw one countdown after being sold another.
 *
 * Shortened from 30 to 14 on 11 Oct 2026: 30 was arbitrary, 14 is the usual
 * SaaS length, and with a 30-day trial nobody signing up in October could
 * reach a first payment before November.
 * Import it; don't re-inline the arithmetic.
 */
export const TRIAL_DAYS = 14;

export const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Whether the reverse trial is still running. Paid tiers never count as
 * trialling — they get their entitlements from the subscription itself.
 */
export function isTrialActive(
  createdAt: string | Date | undefined,
  planTier: string,
): boolean {
  if (planTier !== 'free' || !createdAt) return false;
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const elapsedMs = Date.now() - date.getTime();
  return elapsedMs >= 0 && elapsedMs < TRIAL_DURATION_MS;
}

/**
 * Whole days left in the trial, floored at 0 so an expired trial renders as
 * "0 days" rather than a negative count.
 */
export function trialDaysRemaining(createdAt: string | Date | undefined): number {
  if (!createdAt) return TRIAL_DAYS;
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const elapsedMs = Date.now() - date.getTime();
  return Math.max(0, Math.ceil((TRIAL_DURATION_MS - elapsedMs) / (24 * 60 * 60 * 1000)));
}
