import 'server-only';

/**
 * NHTSA (US DOT) public safety data — no key, no quota worth mentioning.
 *
 *   recalls    https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=
 *   complaints https://api.nhtsa.gov/complaints/complaintsByVehicle?make=&model=&modelYear=
 *
 * Coverage is the US market, so a French-market Peugeot returns nothing while
 * a Golf, a Corolla, a Civic or an F-150 returns a lot. We surface "no data"
 * honestly rather than pretend.
 */

export interface Recall {
  campaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  reportDate: string | null;
}

export interface ComplaintCluster {
  component: string;
  count: number;
  /** Share of all complaints for this vehicle, 0–1. */
  share: number;
  crashes: number;
  fires: number;
  /** Median odometer (km) at which owners reported the issue, if known. */
  medianOdometerKm: number | null;
  sample: string;
}

export interface NhtsaSafetyReport {
  make: string;
  model: string;
  year: number;
  recalls: Recall[];
  complaintsTotal: number;
  complaintClusters: ComplaintCluster[];
  fetchedAt: string;
}

const BASE = 'https://api.nhtsa.gov';
const MI_TO_KM = 1.609344;

/** NHTSA wants plain make/model tokens; strip trims like "Golf GTI 2.0 TSI" → "Golf". */
export function simplifyModel(model: string): string {
  const first = model.trim().split(/\s+/)[0] ?? model;
  return first.replace(/[^A-Za-z0-9-]/g, '');
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface RawRecall {
  NHTSACampaignNumber?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  ReportReceivedDate?: string;
}
interface RawComplaint {
  components?: string;
  summary?: string;
  crash?: boolean;
  fire?: boolean;
  odiNumber?: number;
  products?: { productYear?: string }[];
  /** Miles, as a number or string. */
  numberOfInjuries?: number;
  numberOfDeaths?: number;
  odometer?: number | string | null;
}

export async function fetchNhtsaSafety(
  make: string,
  model: string,
  year: number,
): Promise<NhtsaSafetyReport | null> {
  const mk = make.trim();
  const md = simplifyModel(model);
  if (!mk || !md || !year) return null;

  const q = `make=${encodeURIComponent(mk)}&model=${encodeURIComponent(md)}&modelYear=${year}`;
  const [recallsRaw, complaintsRaw] = await Promise.all([
    getJson<{ results?: RawRecall[] }>(`${BASE}/recalls/recallsByVehicle?${q}`),
    getJson<{ results?: RawComplaint[] }>(`${BASE}/complaints/complaintsByVehicle?${q}`),
  ]);
  if (!recallsRaw && !complaintsRaw) return null;

  return buildReport(mk, md, year, recallsRaw?.results ?? [], complaintsRaw?.results ?? []);
}

/** Pure — exported for tests. */
export function buildReport(
  make: string,
  model: string,
  year: number,
  recallsRaw: RawRecall[],
  complaintsRaw: RawComplaint[],
): NhtsaSafetyReport {
  const recalls: Recall[] = recallsRaw
    .map((r) => ({
      campaignNumber: r.NHTSACampaignNumber ?? '',
      component: (r.Component ?? '').trim(),
      summary: (r.Summary ?? '').trim(),
      consequence: (r.Consequence ?? '').trim(),
      remedy: (r.Remedy ?? '').trim(),
      reportDate: parseNhtsaDate(r.ReportReceivedDate),
    }))
    .filter((r) => r.campaignNumber)
    .sort((a, b) => (b.reportDate ?? '').localeCompare(a.reportDate ?? ''));

  const byComponent = new Map<string, { count: number; crashes: number; fires: number; odos: number[]; sample: string }>();
  for (const c of complaintsRaw) {
    // "ELECTRICAL SYSTEM" / "ENGINE" / "POWER TRAIN:AUTOMATIC TRANSMISSION" → take the top-level system.
    const component = (c.components ?? 'UNKNOWN').split(',')[0].split(':')[0].trim().toUpperCase() || 'UNKNOWN';
    const bucket = byComponent.get(component) ?? { count: 0, crashes: 0, fires: 0, odos: [], sample: '' };
    bucket.count += 1;
    if (c.crash) bucket.crashes += 1;
    if (c.fire) bucket.fires += 1;
    const odo = c.odometer != null ? Number(c.odometer) : NaN;
    if (Number.isFinite(odo) && odo > 0) bucket.odos.push(odo * MI_TO_KM);
    if (!bucket.sample && c.summary) bucket.sample = c.summary.trim().slice(0, 240);
    byComponent.set(component, bucket);
  }
  const total = complaintsRaw.length;
  const complaintClusters: ComplaintCluster[] = [...byComponent.entries()]
    .map(([component, b]) => ({
      component,
      count: b.count,
      share: total ? b.count / total : 0,
      crashes: b.crashes,
      fires: b.fires,
      medianOdometerKm: median(b.odos),
      sample: b.sample,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { make, model, year, recalls, complaintsTotal: total, complaintClusters, fetchedAt: new Date().toISOString() };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

/** NHTSA dates look like "/Date(1467331200000-0400)/" or ISO. */
function parseNhtsaDate(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/\/Date\((\d+)/);
  if (m) return new Date(Number(m[1])).toISOString().slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
