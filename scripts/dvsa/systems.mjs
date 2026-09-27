/**
 * MOT "reason for rejection" → one of our 11 vehicle systems.
 *
 * The DVSA lookup files give each RfR a description and an item hierarchy
 * whose root is a section such as "Brakes" or "Suspension". Section names
 * have drifted across schema versions (2005 manual, 2018 EU-directive
 * rewrite), so we classify on keywords rather than on numeric ids. Order
 * matters: the first matching rule wins.
 */
export const SYSTEMS = [
  'brakes',
  'suspension',
  'tyres',
  'steering',
  'lamps',
  'emissions',
  'body',
  'visibility',
  'seatbelts',
  'wheels',
  'other',
];

const RULES = [
  ['brakes', /\b(brake|abs\b|servo|handbrake|parking brake|disc|drum|calliper|caliper)/i],
  ['tyres', /\b(tyre|tire|tread)/i],
  ['wheels', /\b(road wheels?|wheel bearings?|wheel nuts?|wheel hubs?|wheels?)\b/i],
  ['suspension', /\b(suspension|shock absorber|spring|anti[- ]roll|bush|ball joint|wishbone|track control|damper|strut|subframe mount)/i],
  ['steering', /\b(steering|track rod|rack|power steering|drag link|kingpin)/i],
  ['lamps', /\b(lamp|headlamp|headlight|indicator|hazard|reflector|bulb|electrical|battery|wiring|horn|registration plate lamp|stop lamp|fog lamp|beam)/i],
  ['emissions', /\b(emission|exhaust|smoke|lambda|catalyst|dpf|particulate|fuel (system|leak|cap|pipe)|obd|engine mil)/i],
  ['visibility', /\b(windscreen|wiper|washer|mirror|view|glass|visibility|driver.?s view)/i],
  ['seatbelts', /\b(seat ?belt|airbag|srs|restraint|child seat)/i],
  ['body', /\b(body|chassis|structure|corrosion|corroded|sill|floor|bumper|door|bonnet|boot|tailgate|towbar|tow bar|seat\b|prescribed area|excessive corrosion)/i],
];

/**
 * The first argument is the item-group path ("Brakes > Brake pads …"); it is
 * authoritative when it matches a rule, so an odd word in the free-text
 * description ("brake" inside a body item) cannot re-route the defect.
 */
export function classifySystem(sectionPath, ...texts) {
  const bySection = matchRules(sectionPath ?? '');
  if (bySection !== 'other') return bySection;
  return matchRules(texts.filter(Boolean).join(' | '));
}

function matchRules(hay) {
  if (!hay) return 'other';
  for (const [system, re] of RULES) {
    if (re.test(hay)) return system;
  }
  return 'other';
}

/** Vehicle age at test → band label. MOT starts at 3 years in GB. */
export function ageBand(ageYears) {
  if (ageYears == null || !Number.isFinite(ageYears)) return null;
  if (ageYears < 6) return '3-5';
  if (ageYears < 9) return '6-8';
  if (ageYears < 12) return '9-11';
  if (ageYears < 15) return '12-14';
  return '15+';
}

/** Odometer in km → 20 000 km bands up to 240k, then open. */
export function kmBand(km) {
  if (km == null || !Number.isFinite(km) || km <= 0) return null;
  if (km >= 240_000) return '240k+';
  const lo = Math.floor(km / 20_000) * 20;
  return `${lo}-${lo + 20}k`;
}

export const MI_TO_KM = 1.609344;

/**
 * DVSA `model` is a free-text variant string ("FOCUS ZETEC TDCI", "GOLF SE
 * TDI BLUEMOTION"). Collapse to the model family: first token, or the first
 * two when the first is a prefix that means nothing on its own.
 */
const TWO_WORD_PREFIXES = new Set(['GRAND', 'MODEL', 'RANGE', 'SERIES', 'LAND', 'SANTA', 'NEW', 'CLASSE', 'CLASS']);
export function normaliseModel(raw) {
  const tokens = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9 .-]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  if (TWO_WORD_PREFIXES.has(tokens[0]) && tokens[1]) return `${tokens[0]} ${tokens[1]}`;
  return tokens[0];
}

const MAKE_ALIASES = { 'MERCEDES-BENZ': 'MERCEDES', 'MERCEDES BENZ': 'MERCEDES', 'VW': 'VOLKSWAGEN', 'CITROËN': 'CITROEN', 'LAND ROVER': 'LAND ROVER', 'ROVER': 'ROVER', 'ALFA ROMEO': 'ALFA ROMEO', 'DS': 'DS' };
export function normaliseMake(raw) {
  const m = String(raw ?? '').toUpperCase().trim().replace(/\s+/g, ' ');
  return MAKE_ALIASES[m] ?? m;
}
