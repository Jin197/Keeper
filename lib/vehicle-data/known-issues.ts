import 'server-only';
import type { Vehicle } from '@/lib/types';
import { fetchMotHistory, type MotHistory } from './mot-history';
import { fetchNhtsaSafety, type NhtsaSafetyReport } from './nhtsa-safety';
import { inferCountryFromPlate, NHTSA_PRIMARY_COUNTRIES } from './country';
import { getModelFailureProfile, type ModelFailureProfile } from './failure-rates';
import { isMotHistoryConfigured } from '@/lib/env';

/**
 * Everything public we can find out about *this* car, from official sources,
 * without the owner typing anything. Each block is independent and nullable:
 * a French car gets no MOT block, a car NHTSA never saw gets an empty US block.
 */
export interface KnownIssuesReport {
  country: string;
  /** UK only — per-vehicle official test history. */
  mot: MotHistory | null;
  motAvailable: boolean;
  /** Model-level recalls + owner complaints (US corpus). */
  nhtsa: NhtsaSafetyReport | null;
  /** Whether NHTSA is the primary source for this market (US/CA/MX) or a proxy. */
  nhtsaIsPrimary: boolean;
  /** Population MOT failure rates for this model at this mileage (DVSA open data), when loaded. */
  failureProfile: ModelFailureProfile | null;
  /** Plain-language headline items, ordered by what a garage would flag first. */
  highlights: KnownIssueHighlight[];
}

export interface KnownIssueHighlight {
  severity: 'critical' | 'warning' | 'info';
  kind: 'mot-defect' | 'mot-advisory' | 'recall' | 'complaint-cluster' | 'mot-expiry' | 'model-stat';
  title: string;
  detail?: string;
}

export function resolveVehicleCountry(vehicle: Pick<Vehicle, 'plate' | 'country'>, profileCountry?: string | null): string {
  return (
    vehicle.country?.toUpperCase() ||
    inferCountryFromPlate(vehicle.plate) ||
    (profileCountry ?? '').toUpperCase() ||
    'GB'
  );
}

export async function getKnownIssues(
  vehicle: Vehicle,
  profileCountry?: string | null,
): Promise<KnownIssuesReport> {
  const country = resolveVehicleCountry(vehicle, profileCountry);
  const motAvailable = country === 'GB' && isMotHistoryConfigured();

  const [mot, nhtsa] = await Promise.all([
    motAvailable ? fetchMotHistory(vehicle.plate) : Promise.resolve(null),
    fetchNhtsaSafety(vehicle.make, vehicle.model, vehicle.year),
  ]);
  // The official odometer beats the owner's typed mileage when we have it.
  const failureProfile = await getModelFailureProfile(vehicle, { odometerKm: mot?.latestOdometerKm ?? null }).catch(() => null);

  return {
    country,
    mot,
    motAvailable,
    nhtsa,
    nhtsaIsPrimary: NHTSA_PRIMARY_COUNTRIES.has(country),
    failureProfile,
    highlights: buildHighlights(mot, nhtsa, failureProfile),
  };
}

/** Pure — exported for tests. */
export function buildHighlights(
  mot: MotHistory | null,
  nhtsa: NhtsaSafetyReport | null,
  profile: ModelFailureProfile | null = null,
): KnownIssueHighlight[] {
  const out: KnownIssueHighlight[] = [];

  // Population base rates: only the systems where this model is clearly worse
  // than the fleet, so the list stays about *this* car's weak points.
  if (profile && profile.basis === 'model') {
    for (const s of profile.highlights) {
      if ((s.ratio ?? 0) < 1.3 || s.rate < 0.08) continue;
      out.push({
        severity: s.rate >= 0.2 ? 'warning' : 'info',
        kind: 'model-stat',
        title: `${Math.round(s.rate * 100)}% of ${profile.model} fail MOT on ${s.system} at ${profile.kmBand} km`,
        detail: s.fleetRate != null ? `Fleet average ${Math.round(s.fleetRate * 100)}% · ${profile.tests.toLocaleString()} tests` : undefined,
      });
    }
  }

  if (mot) {
    if (mot.motExpiryDate) {
      const days = Math.round((new Date(mot.motExpiryDate).getTime() - Date.now()) / 86400000);
      if (days < 0) {
        out.push({ severity: 'critical', kind: 'mot-expiry', title: 'MOT expired', detail: `Expired ${-days} days ago (${mot.motExpiryDate}).` });
      } else if (days <= 45) {
        out.push({ severity: 'warning', kind: 'mot-expiry', title: 'MOT due soon', detail: `Expires in ${days} days (${mot.motExpiryDate}).` });
      }
    }
    for (const d of mot.recentIssues) {
      if (d.type === 'DANGEROUS' || d.type === 'MAJOR' || d.type === 'FAIL' || d.dangerous) {
        out.push({ severity: 'critical', kind: 'mot-defect', title: d.text });
      }
    }
    for (const a of mot.recurringAdvisories) {
      out.push({ severity: 'warning', kind: 'mot-advisory', title: a, detail: 'Flagged at two or more MOTs — it will not fix itself.' });
    }
  }

  if (nhtsa) {
    for (const r of nhtsa.recalls.slice(0, 5)) {
      out.push({
        severity: 'critical',
        kind: 'recall',
        title: `Recall · ${r.component || r.campaignNumber}`,
        detail: r.summary || r.consequence,
      });
    }
    for (const c of nhtsa.complaintClusters.slice(0, 3)) {
      if (c.count < 5) continue;
      out.push({
        severity: c.crashes + c.fires > 0 ? 'warning' : 'info',
        kind: 'complaint-cluster',
        title: `${c.component} · ${c.count} owner reports`,
        detail: c.medianOdometerKm ? `Typically around ${Math.round(c.medianOdometerKm / 1000)}k km.` : undefined,
      });
    }
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 12);
}
