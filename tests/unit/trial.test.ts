import { describe, it, expect } from 'vitest';
import { isTrialActive } from '@/lib/data';
import { TRIAL_DAYS, trialDaysRemaining } from '@/lib/trial';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('isTrialActive (free reverse trial)', () => {
  it('should return true for a user who signed up 1 day ago', () => {
    expect(isTrialActive(daysAgo(1), 'free')).toBe(true);
    expect(isTrialActive(daysAgo(1).toISOString(), 'free')).toBe(true);
  });

  it('should return true one day before the trial ends', () => {
    expect(isTrialActive(daysAgo(TRIAL_DAYS - 1), 'free')).toBe(true);
  });

  it('should return false on the exact day the trial ends', () => {
    expect(isTrialActive(daysAgo(TRIAL_DAYS), 'free')).toBe(false);
    expect(isTrialActive(daysAgo(TRIAL_DAYS).toISOString(), 'free')).toBe(false);
  });

  it('should return false after the trial has ended', () => {
    expect(isTrialActive(daysAgo(TRIAL_DAYS + 1), 'free')).toBe(false);
  });

  it('should return false if plan tier is already premium or family', () => {
    expect(isTrialActive(daysAgo(1), 'premium')).toBe(false);
    expect(isTrialActive(daysAgo(1), 'family')).toBe(false);
  });

  it('should return false if createdAt date is missing', () => {
    expect(isTrialActive(undefined, 'free')).toBe(false);
  });
});

describe('trialDaysRemaining', () => {
  it('should count down from the full trial length', () => {
    expect(trialDaysRemaining(daysAgo(0))).toBe(TRIAL_DAYS);
    expect(trialDaysRemaining(daysAgo(1))).toBe(TRIAL_DAYS - 1);
  });

  it('should floor at zero once the trial has expired', () => {
    expect(trialDaysRemaining(daysAgo(TRIAL_DAYS))).toBe(0);
    expect(trialDaysRemaining(daysAgo(TRIAL_DAYS + 10))).toBe(0);
  });

  it('should assume a full trial when createdAt is missing', () => {
    expect(trialDaysRemaining(undefined)).toBe(TRIAL_DAYS);
  });
});
