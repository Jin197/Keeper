import 'server-only';
import { env, isMotHistoryConfigured } from '@/lib/env';

/**
 * DVSA MOT History API (UK) — https://documentation.history.mot.api.gov.uk/
 *
 * Free for registered users. Auth is OAuth 2.0 client-credentials against
 * the DVSA tenant plus a static `X-API-Key`. The token is cached in module
 * scope for its lifetime (≈ 1 h) so a burst of lookups costs one token call.
 *
 * What it gives us that nothing else does: every MOT test since 2005 with
 * the odometer reading, pass/fail, and the exact defects and advisories the
 * tester wrote down. That is the closest thing to a free, official
 * per-vehicle health record anywhere in the world.
 */

export type MotDefectType = 'DANGEROUS' | 'MAJOR' | 'MINOR' | 'ADVISORY' | 'FAIL' | 'PRS' | 'USER ENTERED';

export interface MotDefect {
  text: string;
  type: MotDefectType;
  dangerous: boolean;
}

export interface MotTest {
  completedDate: string;
  testResult: 'PASSED' | 'FAILED';
  expiryDate: string | null;
  odometerValue: number | null;
  odometerUnit: 'MI' | 'KM' | null;
  motTestNumber: string | null;
  defects: MotDefect[];
}

export interface MotHistory {
  registration: string;
  make: string | null;
  model: string | null;
  firstUsedDate: string | null;
  fuelType: string | null;
  primaryColour: string | null;
  /** Current MOT expiry from the most recent pass, if any. */
  motExpiryDate: string | null;
  tests: MotTest[];
  /** Newest odometer reading in km (miles converted), if any. */
  latestOdometerKm: number | null;
  /** Estimated km/year from the two most recent readings ≥ 6 months apart. */
  annualMileageKm: number | null;
  /** Failure rate across tests, 0–1. */
  failRate: number;
  /** Defects + advisories from the last two tests — what a buyer or garage would ask about. */
  recentIssues: MotDefect[];
  /** Advisory texts that recur across tests (the same wording twice or more). */
  recurringAdvisories: string[];
}

const MI_TO_KM = 1.609344;

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const clientId = env.motClientId();
  const clientSecret = env.motClientSecret();
  const tokenUrl = env.motTokenUrl();
  const scope = env.motScope();
  if (!clientId || !clientSecret || !tokenUrl || !scope) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    });
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    tokenCache = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

/** Normalise "AB12 CDE" / "ab12cde" → "AB12CDE". */
export function normaliseUkPlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function fetchMotHistory(plate: string): Promise<MotHistory | null> {
  if (!isMotHistoryConfigured()) return null;
  const apiKey = env.motApiKey();
  const token = await getAccessToken();
  if (!token || !apiKey) return null;

  const reg = normaliseUkPlate(plate);
  try {
    const res = await fetch(
      `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(reg)}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'X-API-Key': apiKey, Accept: 'application/json' },
        next: { revalidate: 60 * 60 * 24 },
      },
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as RawMotVehicle;
    return summarise(reg, raw);
  } catch {
    return null;
  }
}

// ── Raw API shapes (subset) ─────────────────────────────────────
interface RawDefect {
  text?: string;
  type?: string;
  dangerous?: boolean;
}
interface RawTest {
  completedDate?: string;
  testResult?: string;
  expiryDate?: string;
  odometerValue?: string | number;
  odometerUnit?: string;
  motTestNumber?: string;
  defects?: RawDefect[];
}
interface RawMotVehicle {
  registration?: string;
  make?: string;
  model?: string;
  firstUsedDate?: string;
  fuelType?: string;
  primaryColour?: string;
  motTests?: RawTest[];
}

function toKm(value: number | null, unit: string | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return unit === 'MI' ? Math.round(value * MI_TO_KM) : Math.round(value);
}

/** Pure — exported for tests. */
export function summarise(reg: string, raw: RawMotVehicle): MotHistory {
  const tests: MotTest[] = (raw.motTests ?? [])
    .map((t) => {
      const odo = t.odometerValue != null ? Number(t.odometerValue) : null;
      const unit = (t.odometerUnit ?? '').toUpperCase();
      return {
        completedDate: t.completedDate ?? '',
        testResult: (t.testResult ?? '').toUpperCase() === 'PASSED' ? 'PASSED' : 'FAILED',
        expiryDate: t.expiryDate ?? null,
        odometerValue: odo != null && Number.isFinite(odo) ? odo : null,
        odometerUnit: unit === 'MI' || unit === 'KM' ? unit : null,
        motTestNumber: t.motTestNumber ?? null,
        defects: (t.defects ?? []).map((d) => ({
          text: (d.text ?? '').trim(),
          type: ((d.type ?? 'ADVISORY').toUpperCase() as MotDefectType),
          dangerous: Boolean(d.dangerous),
        })),
      } satisfies MotTest;
    })
    .filter((t) => t.completedDate)
    .sort((a, b) => b.completedDate.localeCompare(a.completedDate));

  const latestPass = tests.find((t) => t.testResult === 'PASSED');
  const withOdo = tests.filter((t) => t.odometerValue != null);
  const latestOdometerKm = withOdo[0] ? toKm(withOdo[0].odometerValue, withOdo[0].odometerUnit) : null;

  // Annual mileage: newest reading vs the first reading at least 180 days older.
  let annualMileageKm: number | null = null;
  if (withOdo.length >= 2) {
    const newest = withOdo[0];
    const older = withOdo.find(
      (t) => new Date(newest.completedDate).getTime() - new Date(t.completedDate).getTime() >= 180 * 86400000,
    );
    if (older) {
      const dKm = (toKm(newest.odometerValue, newest.odometerUnit) ?? 0) - (toKm(older.odometerValue, older.odometerUnit) ?? 0);
      const dDays = (new Date(newest.completedDate).getTime() - new Date(older.completedDate).getTime()) / 86400000;
      if (dKm > 0 && dDays > 0) annualMileageKm = Math.round((dKm / dDays) * 365);
    }
  }

  const failRate = tests.length ? tests.filter((t) => t.testResult === 'FAILED').length / tests.length : 0;

  // "Recent" = the last annual cycle: every test within 400 days of the newest
  // one, so a fail and its same-day retest are both included. Deduped by text.
  const newestTime = tests[0] ? new Date(tests[0].completedDate).getTime() : 0;
  const seenRecent = new Set<string>();
  const recentIssues = tests
    .filter((t) => newestTime - new Date(t.completedDate).getTime() <= 400 * 86400000)
    .flatMap((t) => t.defects)
    .filter((d) => {
      const k = d.text.toLowerCase();
      if (!d.text || seenRecent.has(k)) return false;
      seenRecent.add(k);
      return true;
    });

  // Recurring advisories: same text (case-insensitive, trimmed) in ≥ 2 tests.
  const seen = new Map<string, number>();
  for (const t of tests) {
    const uniq = new Set(t.defects.map((d) => d.text.toLowerCase()));
    for (const k of uniq) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const recurringAdvisories = [...seen.entries()]
    .filter(([, n]) => n >= 2)
    .map(([k]) => tests.flatMap((t) => t.defects).find((d) => d.text.toLowerCase() === k)?.text ?? k)
    .slice(0, 8);

  return {
    registration: raw.registration ?? reg,
    make: raw.make ?? null,
    model: raw.model ?? null,
    firstUsedDate: raw.firstUsedDate ?? null,
    fuelType: raw.fuelType ?? null,
    primaryColour: raw.primaryColour ?? null,
    motExpiryDate: latestPass?.expiryDate ?? null,
    tests,
    latestOdometerKm,
    annualMileageKm,
    failRate,
    recentIssues,
    recurringAdvisories,
  };
}
