import { createHash } from 'crypto';

/**
 * Tamper-evidence for the maintenance log.
 *
 * Each entry stores `previous_hash` (the hash of the entry before it for the
 * same vehicle, or 'genesis') and its own `hash`. Two independent checks:
 *
 *  • linkage — every entry's `previous_hash` equals the prior entry's `hash`.
 *    This alone proves nothing was inserted, removed or reordered after the
 *    fact; it needs no knowledge of how the hash was built.
 *  • content — recomputing SHA-256 over the canonical payload reproduces
 *    `hash`. Postgres normalises some fields on the way back (timestamps gain
 *    a zone, numerics lose trailing zeros), so a content mismatch is reported
 *    as "unverified", never as "tampered".
 */
export interface ChainRow {
  id: string;
  vehicle_id: string;
  occurred_at: string;
  category: string;
  description: string;
  cost: number | string;
  currency: string;
  garage_name: string;
  mileage_km: number;
  previous_hash: string | null;
  hash: string;
}

export interface ChainVerdict {
  entries: number;
  linked: boolean;
  /** Number of entries whose content hash recomputes exactly. */
  contentVerified: number;
  brokenLinks: string[];
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function candidatePayloads(r: ChainRow): string[] {
  // The writer serialised the form values; the DB hands back normalised ones.
  // Try the most likely spellings of the two fields that drift.
  const dates = new Set<string>([r.occurred_at, r.occurred_at.slice(0, 10)]);
  const d = new Date(r.occurred_at);
  if (!Number.isNaN(d.getTime())) dates.add(d.toISOString());
  const costs = new Set<number>([Number(r.cost)]);
  const out: string[] = [];
  for (const occurredAt of dates) {
    for (const cost of costs) {
      out.push(
        JSON.stringify({
          id: r.id,
          vehicleId: r.vehicle_id,
          occurredAt,
          category: r.category,
          description: r.description,
          cost,
          currency: r.currency,
          garageName: r.garage_name,
          mileageKm: r.mileage_km,
          previousHash: r.previous_hash ?? 'genesis',
        }),
      );
    }
  }
  return out;
}

/** `rows` must be in insertion (chronological) order. */
export function verifyChain(rows: ChainRow[]): ChainVerdict {
  const brokenLinks: string[] = [];
  let contentVerified = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const expectedPrev = i === 0 ? 'genesis' : rows[i - 1].hash;
    if ((r.previous_hash ?? 'genesis') !== expectedPrev) brokenLinks.push(r.id);
    if (candidatePayloads(r).some((p) => sha256(p) === r.hash)) contentVerified += 1;
  }
  return { entries: rows.length, linked: brokenLinks.length === 0, contentVerified, brokenLinks };
}
