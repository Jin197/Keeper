import { describe, it, expect, afterEach } from 'vitest';
import { partsLink, insuranceLink, daysUntil, shouldNudgeInsurance } from '@/lib/affiliates';

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe('parts links', () => {
  it('uses Autodoc in Europe and Amazon in the US, untracked without ids', () => {
    const fr = partsLink('FR', 'brakes', { make: 'Peugeot', model: '308' });
    expect(fr?.retailer).toBe('Autodoc');
    expect(fr?.url).toContain('autodoc.fr');
    expect(fr?.url).toContain('plaquettes');
    expect(fr?.tracked).toBe(false);

    const us = partsLink('US', 'battery', { make: 'Ford', model: 'Focus' });
    expect(us?.retailer).toBe('Amazon');
    expect(us?.url).toContain('amazon.com');
    expect(us?.url.includes('tag=')).toBe(false);
  });

  it('adds tracking ids when configured', () => {
    process.env.NEXT_PUBLIC_AFFILIATE_AUTODOC_ID = 'vw123';
    process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TAG = 'veloce-21';
    expect(partsLink('DE', 'oil')?.url).toContain('ref=vw123');
    expect(partsLink('DE', 'oil')?.tracked).toBe(true);
    expect(partsLink('US', 'oil')?.url).toContain('tag=veloce-21');
  });

  it('returns null for countries with no retailer', () => {
    expect(partsLink('MN', 'oil')).toBeNull();
  });
});

describe('insurance links', () => {
  it('falls back to an untracked comparison site and honours env overrides', () => {
    expect(insuranceLink('GB')?.tracked).toBe(false);
    expect(insuranceLink('GB')?.url).toContain('confused.com');
    process.env.NEXT_PUBLIC_AFFILIATE_INSURANCE_URL_GB = 'https://aff.example/gb';
    expect(insuranceLink('GB')).toEqual({ provider: 'Confused.com', url: 'https://aff.example/gb', tracked: true });
    expect(insuranceLink('AQ')).toBeNull();
  });

  it('nudges in the 45 days before renewal and 15 after', () => {
    const now = new Date('2026-09-19');
    expect(daysUntil('2026-10-01', now)).toBe(12);
    expect(shouldNudgeInsurance('2026-10-01', now)).toBe(true);
    expect(shouldNudgeInsurance('2026-12-25', now)).toBe(false);
    expect(shouldNudgeInsurance('2026-09-10', now)).toBe(true);
    expect(shouldNudgeInsurance('2026-08-01', now)).toBe(false);
    expect(shouldNudgeInsurance(null, now)).toBe(false);
  });
});
