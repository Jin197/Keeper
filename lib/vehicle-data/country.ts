/**
 * Infer a vehicle's registration country from its plate format. Isomorphic.
 * Only formats we can tell apart reliably; everything else returns null and
 * the caller falls back to the owner's profile country.
 */
export function inferCountryFromPlate(plate: string): string | null {
  const p = plate.toUpperCase().replace(/[\s-]/g, '');
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(p)) return 'FR'; // AA-123-AA (SIV; Italy shares the shape — FR wins)
  if (/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(p)) return 'GB'; // AB12 CDE
  if (/^[A-Z]\d{1,3}[A-Z]{3}$/.test(p)) return 'GB'; // A123 BCD (prefix)
  if (/^\d{4}[B-DF-HJ-NP-TV-Z]{3}$/.test(p)) return 'ES'; // 1234 BCD
  if (/^\d[A-Z]{3}\d{3}$/.test(p)) return 'BE'; // 1-ABC-123 (checked before the FR FNI shape it overlaps)
  if (/^\d{1,4}[A-Z]{1,3}\d{2,3}$/.test(p)) return 'FR'; // 1234 AB 75 (FNI, pre-2009)
  if (/^[A-Z]{2}\d{2}[A-Z]{2}\d{1,4}$/.test(p)) return 'IN';
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(p) || /^[A-Z]{3}\d{4}$/.test(p)) return 'BR';
  return null;
}

/** Countries where we have a per-vehicle official history source. */
export const VEHICLE_HISTORY_COUNTRIES = new Set(['GB']);
/** Countries where the NHTSA recall/complaint corpus is most relevant. */
export const NHTSA_PRIMARY_COUNTRIES = new Set(['US', 'CA', 'MX']);
