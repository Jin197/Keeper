/**
 * Countries offered at signup. ISO-3166 alpha-2 codes; labels come from
 * `Intl.DisplayNames` in the viewer's locale so we never maintain a
 * translated list. Isomorphic.
 */
export const SIGNUP_COUNTRIES = [
  // Launch markets first
  'GB', 'US', 'FR', 'DE',
  // Europe
  'IE', 'BE', 'NL', 'LU', 'CH', 'AT', 'ES', 'PT', 'IT', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG',
  'GR', 'HR', 'SI', 'LT', 'LV', 'EE', 'UA', 'TR',
  // Americas
  'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'CR', 'PA', 'DO',
  // Middle East & Africa
  'AE', 'SA', 'IL', 'EG', 'MA', 'DZ', 'TN', 'SN', 'CI', 'CM', 'ML', 'BF', 'BJ', 'TG', 'GA', 'NG', 'GH', 'KE', 'ZA',
  // Asia-Pacific
  'IN', 'PK', 'BD', 'LK', 'ID', 'MY', 'SG', 'TH', 'VN', 'PH', 'JP', 'KR', 'HK', 'AU', 'NZ',
] as const;

export type SignupCountry = (typeof SIGNUP_COUNTRIES)[number];

export function countryLabel(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries sorted by localised label, launch markets pinned to the top. */
export function signupCountryOptions(locale: string): { code: string; label: string }[] {
  const pinned = SIGNUP_COUNTRIES.slice(0, 4).map((code) => ({ code, label: countryLabel(code, locale) }));
  const rest = SIGNUP_COUNTRIES.slice(4)
    .map((code) => ({ code, label: countryLabel(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  return [...pinned, ...rest];
}
