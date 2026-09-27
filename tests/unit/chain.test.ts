import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { verifyChain, type ChainRow } from '@/lib/maintenance/chain';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

function row(i: number, prev: string, overrides: Partial<ChainRow> = {}): ChainRow {
  const base = {
    id: `id-${i}`,
    vehicle_id: 'v1',
    occurred_at: `2026-0${i}-01`,
    category: 'oil',
    description: `Service ${i}`,
    cost: 100 + i,
    currency: 'EUR',
    garage_name: 'Garage',
    mileage_km: 10000 * i,
    previous_hash: prev,
  };
  const payload = JSON.stringify({
    id: base.id, vehicleId: base.vehicle_id, occurredAt: base.occurred_at, category: base.category,
    description: base.description, cost: base.cost, currency: base.currency, garageName: base.garage_name,
    mileageKm: base.mileage_km, previousHash: prev,
  });
  return { ...base, hash: sha(payload), ...overrides };
}

describe('maintenance hash chain', () => {
  it('verifies an intact chain, link and content', () => {
    const r1 = row(1, 'genesis');
    const r2 = row(2, r1.hash);
    const r3 = row(3, r2.hash);
    const v = verifyChain([r1, r2, r3]);
    expect(v.linked).toBe(true);
    expect(v.contentVerified).toBe(3);
    expect(v.brokenLinks).toEqual([]);
  });

  it('still verifies content when Postgres returns the timestamp with a zone', () => {
    const r1 = row(1, 'genesis');
    const v = verifyChain([{ ...r1, occurred_at: '2026-01-01T00:00:00+00:00' }]);
    expect(v.contentVerified).toBe(1);
  });

  it('detects a removed or reordered entry as a broken link', () => {
    const r1 = row(1, 'genesis');
    const r2 = row(2, r1.hash);
    const r3 = row(3, r2.hash);
    const v = verifyChain([r1, r3]);
    expect(v.linked).toBe(false);
    expect(v.brokenLinks).toEqual(['id-3']);
  });

  it('reports edited content as unverified, not as broken', () => {
    const r1 = row(1, 'genesis');
    const v = verifyChain([{ ...r1, description: 'Edited' }]);
    expect(v.linked).toBe(true);
    expect(v.contentVerified).toBe(0);
  });
});
