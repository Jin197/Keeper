import type { ModelSchedule } from './types';

/**
 * The first ten model generations — together roughly a quarter of the used
 * cars on UK and French roads. Every entry is `verified: false` until it has
 * been checked against the manufacturer's own service book; see
 * lib/maintenance/schedules/VALIDATION.md for the checklist.
 *
 * Numbers are the manufacturer's published intervals for EU/UK markets as
 * generally documented; where the manufacturer later *revised* an interval
 * after field failures (Ford / PSA wet belts) the revised, shorter figure is
 * used and the note says why.
 */

const WET_BELT_FORD = {
  en: 'Wet belt (runs in oil). Ford cut the interval from 15 yrs/150k mi to 10 yrs/100k mi (≈160k km) after premature-wear reports; specialists often advise 100–130k km. Check the oil pickup for rubber debris at every service.',
  fr: 'Courroie humide (dans l\'huile). Ford a ramené l\'intervalle de 15 ans/150k mi à 10 ans/100k mi (≈160k km) après des usures prématurées ; les spécialistes conseillent souvent 100–130k km. Contrôler la crépine d\'huile à chaque vidange.',
};
const WET_BELT_PSA = {
  en: 'PureTech wet belt. PSA cut the interval to 6 years / 100,000 km in 2022 after belt-shredding failures. Use only the specified oil grade.',
  fr: 'Courroie humide PureTech. PSA a ramené l\'intervalle à 6 ans / 100 000 km en 2022 après des ruptures. Utiliser uniquement le grade d\'huile prescrit.',
};

export const MODEL_SCHEDULES: ModelSchedule[] = [
  // ── Ford ────────────────────────────────────────────────────────────
  {
    id: 'ford-focus-mk3',
    make: 'FORD',
    model: /^FOCUS$/,
    years: [2011, 2018],
    fuelTypes: ['thermal'],
    label: 'Ford Focus Mk3 (2011–2018)',
    markets: ['GB', 'FR', 'DE'],
    source: 'Ford UK minor service 12,500 mi / 12 months (garage.wiki, whocanfixmycar 2026); EcoBoost wet belt 10 yrs / 100k mi per UK specialist guides (mendcost.com, timingchaingatwick.co.uk). Handbook PDF check still to do → verified stays false.',
    verified: false,
    intervals: {
      oil: { km: 20_000, months: 12 },
      filter: { km: 40_000, months: 24 },
      fluid: { km: null, months: 24 },
      belt: { km: 200_000, months: 120, estimatedCostEur: 650 },
      other: { km: 160_000, months: 120 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /1\.0|ecoboost/i,
        label: '1.0 EcoBoost',
        intervals: { belt: { km: 160_000, months: 120, estimatedCostEur: 900, note: WET_BELT_FORD } },
        weakPoints: [
          { category: 'belt', fromKm: 90_000, toKm: 170_000, severity: 'safety', en: 'Wet timing belt degrades and sheds rubber into the oil pickup — engine failure if ignored.', fr: 'La courroie humide se délite dans l\'huile et bouche la crépine — casse moteur si ignoré.' },
          { category: 'other', fromKm: 60_000, toKm: 140_000, severity: 'watch', en: 'Coolant loss from the degas hose / cylinder head on early engines (2012–2014).', fr: 'Pertes de liquide de refroidissement (durite de dégazage / culasse) sur les premiers moteurs (2012–2014).' },
        ],
      },
      {
        match: /tdci|1\.5|1\.6 d|2\.0 d|diesel/i,
        label: '1.5 / 1.6 / 2.0 TDCi',
        intervals: { belt: { km: 200_000, months: 120, estimatedCostEur: 650 }, oil: { km: 20_000, months: 12 } },
        weakPoints: [
          { category: 'other', fromKm: 100_000, toKm: 200_000, severity: 'watch', en: 'DPF and EGR clogging on short-trip use; injector seals on 1.6 TDCi.', fr: 'Colmatage FAP/EGR en usage urbain ; joints d\'injecteurs sur 1.6 TDCi.' },
        ],
      },
      {
        match: /powershift|auto|automatic|dct/i,
        label: 'PowerShift automatic',
        intervals: { gearbox: { km: 60_000, months: 60, estimatedCostEur: 300 } },
        weakPoints: [
          { category: 'gearbox', fromKm: 60_000, toKm: 150_000, severity: 'safety', en: 'PowerShift dry-clutch (6DCT250, 1.6 petrol) shudder and clutch/TCM failures — Ford ran extended warranties.', fr: 'Boîte PowerShift à embrayage sec (6DCT250, 1.6 essence) : broutage et pannes embrayage/calculateur — garanties étendues Ford.' },
        ],
      },
    ],
    weakPoints: [
      { category: 'brakes', fromKm: 60_000, toKm: 200_000, severity: 'watch', en: 'Rear brake discs corrode and score early (light rear braking).', fr: 'Disques arrière qui se corrodent et se rayent tôt (freinage arrière peu sollicité).' },
    ],
  },
  {
    id: 'ford-fiesta-mk7',
    make: 'FORD',
    model: /^FIESTA$/,
    years: [2008, 2017],
    fuelTypes: ['thermal'],
    label: 'Ford Fiesta Mk7 (2008–2017)',
    markets: ['GB', 'FR', 'DE'],
    source: 'Ford UK 12,500 mi / 12 months schedule (same as Focus Mk3, whocanfixmycar 2026); EcoBoost wet belt 10 yrs / 100k mi (UK specialist guides). Handbook check to do.',
    verified: false,
    intervals: {
      oil: { km: 20_000, months: 12 },
      filter: { km: 40_000, months: 24 },
      fluid: { km: null, months: 24 },
      belt: { km: 160_000, months: 120, estimatedCostEur: 550, note: { en: '1.25 / 1.4 / 1.6 Duratec (Sigma): dry timing belt.', fr: '1.25 / 1.4 / 1.6 Duratec (Sigma) : courroie sèche.' } },
      other: { km: 160_000, months: 120 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /1\.0|ecoboost/i,
        label: '1.0 EcoBoost (2013+)',
        intervals: { belt: { km: 160_000, months: 120, estimatedCostEur: 900, note: WET_BELT_FORD } },
        weakPoints: [{ category: 'belt', fromKm: 90_000, toKm: 170_000, severity: 'safety', en: 'Wet timing belt degradation — see Focus 1.0 EcoBoost.', fr: 'Dégradation de la courroie humide — voir Focus 1.0 EcoBoost.' }],
      },
      {
        match: /tdci|1\.4 d|1\.5 d|1\.6 d|diesel/i,
        label: '1.4 / 1.5 / 1.6 TDCi',
        intervals: { belt: { km: 200_000, months: 120, estimatedCostEur: 650 } },
      },
      {
        match: /powershift|auto|automatic/i,
        label: 'PowerShift automatic (1.6, 2011–2016)',
        intervals: { gearbox: { km: 60_000, months: 60, estimatedCostEur: 300 } },
        weakPoints: [{ category: 'gearbox', fromKm: 40_000, toKm: 150_000, severity: 'safety', en: 'Dry-clutch PowerShift shudder / clutch and TCM failures.', fr: 'Boîte PowerShift à embrayage sec : broutage, pannes embrayage/calculateur.' }],
      },
    ],
    weakPoints: [
      { category: 'other', fromKm: 80_000, toKm: 200_000, severity: 'watch', en: 'Front coil springs snap from corrosion (UK) — check at MOT time.', fr: 'Ressorts avant qui cassent par corrosion — à contrôler au CT.' },
    ],
  },

  // ── Vauxhall / Opel ─────────────────────────────────────────────────
  {
    id: 'vauxhall-corsa-d-e',
    make: 'VAUXHALL',
    model: /^CORSA$/,
    years: [2006, 2019],
    fuelTypes: ['thermal'],
    label: 'Vauxhall/Opel Corsa D & E (2006–2019)',
    markets: ['GB', 'FR', 'DE'],
    source: 'Vauxhall UK: 20,000 mi / 12 months (2016 Corsa handbook via whocanfixmycar; corsaeforums). Opel EU flexible up to 30k km. Handbook check to do.',
    verified: false,
    intervals: {
      oil: { km: 30_000, months: 12, note: { en: 'Flexible service: shorter under urban use — many garages advise 15k km.', fr: 'Entretien flexible : plus court en urbain — beaucoup de garages conseillent 15k km.' } },
      filter: { km: 60_000, months: 48 },
      fluid: { km: null, months: 24 },
      belt: { km: null, months: null, note: { en: '1.0 / 1.2 / 1.4 petrol: timing chain — no scheduled change, but listen for cold-start rattle.', fr: '1.0 / 1.2 / 1.4 essence : chaîne — pas de remplacement planifié, mais écouter le cliquetis à froid.' } },
      other: { km: 150_000, months: 120 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /1\.7|cdti 1\.7|1\.3|cdti|diesel/i,
        label: '1.3 / 1.7 CDTi',
        intervals: { belt: { km: 150_000, months: 120, estimatedCostEur: 600, note: { en: '1.7 CDTi: belt. 1.3 CDTi: chain.', fr: '1.7 CDTi : courroie. 1.3 CDTi : chaîne.' } } },
      },
      {
        match: /easytronic|auto|automatic/i,
        label: 'Easytronic automated manual',
        weakPoints: [{ category: 'gearbox', fromKm: 60_000, toKm: 160_000, severity: 'watch', en: 'Easytronic clutch actuator failures.', fr: 'Pannes d\'actionneur d\'embrayage Easytronic.' }],
      },
    ],
    weakPoints: [
      { category: 'belt', fromKm: 70_000, toKm: 160_000, severity: 'safety', en: 'Petrol 1.0/1.2/1.4 timing chain stretch and tensioner wear — cold-start rattle is the warning.', fr: 'Chaîne de distribution essence 1.0/1.2/1.4 : allongement et tendeur usé — le cliquetis à froid est l\'alerte.' },
      { category: 'other', fromKm: 60_000, toKm: 160_000, severity: 'watch', en: 'Thermostat housing coolant leaks.', fr: 'Fuites du boîtier de thermostat.' },
    ],
  },

  // ── Volkswagen ──────────────────────────────────────────────────────
  {
    id: 'vw-golf-mk7',
    make: 'VOLKSWAGEN',
    model: /^GOLF$/,
    years: [2012, 2020],
    fuelTypes: ['thermal', 'hybrid'],
    label: 'Volkswagen Golf Mk7 (2012–2020)',
    markets: ['GB', 'FR', 'DE'],
    source: 'VW LongLife (variable, up to 2 yrs) vs fixed 15k km / 1 yr; EA211 belt officially "inspect from ~210–240k km" in EU, UK VAG dealers advise 4–5 yrs / 200k km (honestjohn, golfmk7.com). We schedule 150k km / 8 yrs as the prudent middle. Handbook check to do.',
    verified: false,
    intervals: {
      oil: { km: 30_000, months: 24, note: { en: 'LongLife (variable) schedule. Fixed schedule 15,000 km / 12 months is safer for short trips.', fr: 'Entretien LongLife (variable). Le plan fixe 15 000 km / 12 mois est plus sûr en trajets courts.' } },
      filter: { km: 60_000, months: 48 },
      fluid: { km: null, months: 24 },
      belt: { km: 150_000, months: 96, estimatedCostEur: 600, note: { en: 'EA211 TSI / EA288 TDI: belt. VW EU says inspect from ~210k km ("lifetime"); UK dealers advise replacing at 4–5 yrs or 200k km. We plan 150k km / 8 yrs — the prudent middle.', fr: 'EA211 TSI / EA288 TDI : courroie. VW Europe dit contrôler à partir de ~210k km ("à vie") ; les concessions UK conseillent 4–5 ans ou 200k km. On planifie 150k km / 8 ans — le juste milieu prudent.' } },
      other: { km: 180_000, months: 144 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /dsg|dq250|dq381|auto|automatic/i,
        label: 'DSG automatic',
        intervals: { gearbox: { km: 60_000, months: 60, estimatedCostEur: 350, note: { en: '6-speed DQ250 (wet): oil + filter every 60k km. 7-speed DQ200 (dry): no oil change, but mechatronic unit is the weak point.', fr: 'DQ250 6 rapports (humide) : huile + filtre tous les 60k km. DQ200 7 rapports (sec) : pas de vidange, mais mécatronique fragile.' } } },
        weakPoints: [{ category: 'gearbox', fromKm: 60_000, toKm: 150_000, severity: 'watch', en: 'DQ200 7-speed DSG mechatronic failures and clutch pack wear.', fr: 'DSG 7 DQ200 : pannes de mécatronique et usure des embrayages.' }],
      },
      {
        match: /tdi|diesel|1\.6 d|2\.0 d/i,
        label: '1.6 / 2.0 TDI (EA288)',
        weakPoints: [{ category: 'other', fromKm: 100_000, toKm: 220_000, severity: 'watch', en: 'EGR cooler / valve faults and DPF on short trips.', fr: 'Défauts vanne/refroidisseur EGR et FAP en trajets courts.' }],
      },
    ],
    weakPoints: [
      { category: 'other', fromKm: 80_000, toKm: 160_000, severity: 'watch', en: 'EA211 TSI water pump / thermostat housing coolant leaks.', fr: 'TSI EA211 : fuites pompe à eau / boîtier de thermostat.' },
    ],
  },
  {
    id: 'vw-polo-6r-6c',
    make: 'VOLKSWAGEN',
    model: /^POLO$/,
    years: [2009, 2017],
    fuelTypes: ['thermal'],
    label: 'Volkswagen Polo 6R/6C (2009–2017)',
    markets: ['GB', 'FR', 'DE'],
    source: 'VW service schedule (owner handbook) — to confirm',
    verified: false,
    intervals: {
      oil: { km: 15_000, months: 12 },
      filter: { km: 60_000, months: 48 },
      fluid: { km: null, months: 24 },
      belt: { km: 150_000, months: 96, estimatedCostEur: 550 },
      other: { km: 180_000, months: 144 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /1\.2 tsi|tsi 1\.2|105|ea111/i,
        label: '1.2 TSI EA111 (2009–2014)',
        intervals: { belt: { km: null, months: null, note: { en: 'Timing chain — no scheduled change but a known weak point.', fr: 'Chaîne de distribution — pas de remplacement planifié mais point faible connu.' } } },
        weakPoints: [{ category: 'belt', fromKm: 60_000, toKm: 140_000, severity: 'safety', en: 'EA111 1.2 TSI timing chain stretch / tensioner failure (pre-2011 especially) — rattle on start, can jump a tooth.', fr: 'Chaîne 1.2 TSI EA111 : allongement / tendeur (surtout avant 2011) — cliquetis au démarrage, peut sauter une dent.' }],
      },
      {
        match: /dsg|auto|automatic/i,
        label: 'DSG DQ200',
        weakPoints: [{ category: 'gearbox', fromKm: 60_000, toKm: 150_000, severity: 'watch', en: 'DQ200 mechatronic failures.', fr: 'Pannes de mécatronique DQ200.' }],
      },
    ],
  },

  // ── Peugeot ─────────────────────────────────────────────────────────
  {
    id: 'peugeot-208-i',
    make: 'PEUGEOT',
    model: /^208$/,
    years: [2012, 2019],
    fuelTypes: ['thermal'],
    label: 'Peugeot 208 I (2012–2019)',
    markets: ['FR', 'GB', 'ES'],
    source: 'PureTech wet belt: Stellantis cut the interval from 10 yrs / 175k km to 6 yrs / 100k km (L\'argus, largus.fr, confirming the 2022 bulletin). Rest of the carnet d\'entretien still to check.',
    verified: false,
    intervals: {
      oil: { km: 20_000, months: 12 },
      filter: { km: 40_000, months: 24 },
      fluid: { km: null, months: 24 },
      belt: { km: 240_000, months: 120, estimatedCostEur: 600, note: { en: 'HDi/BlueHDi: dry belt 240k km / 10 yrs.', fr: 'HDi/BlueHDi : courroie sèche 240k km / 10 ans.' } },
      other: { km: 160_000, months: 120 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /puretech|1\.2 t|110|130|eb2dt/i,
        label: '1.2 PureTech turbo (2014+)',
        intervals: { belt: { km: 100_000, months: 72, estimatedCostEur: 700, note: WET_BELT_PSA }, oil: { km: 15_000, months: 12 } },
        weakPoints: [
          { category: 'belt', fromKm: 60_000, toKm: 130_000, severity: 'safety', en: 'Wet belt shredding blocks the oil pickup and vacuum pump — engine damage.', fr: 'Courroie humide qui se délite, bouche la crépine et la pompe à vide — casse moteur.' },
          { category: 'oil', fromKm: 50_000, toKm: 150_000, severity: 'watch', en: 'Oil consumption on 2014–2018 PureTech 110/130 — check level monthly.', fr: 'Consommation d\'huile sur PureTech 110/130 2014–2018 — vérifier le niveau chaque mois.' },
        ],
      },
      {
        match: /bluehdi|hdi|diesel|1\.6 d|1\.4 d|1\.5 d/i,
        label: '1.4 / 1.5 / 1.6 HDi & BlueHDi',
        weakPoints: [{ category: 'other', fromKm: 80_000, toKm: 200_000, severity: 'watch', en: 'BlueHDi (2015+): AdBlue tank / injector faults; DPF on short trips.', fr: 'BlueHDi (2015+) : pannes réservoir/injecteur AdBlue ; FAP en trajets courts.' }],
      },
      {
        match: /etg|automatis|auto|automatic/i,
        label: 'ETG5 automated manual',
        weakPoints: [{ category: 'gearbox', fromKm: 50_000, toKm: 150_000, severity: 'watch', en: 'ETG5 clutch actuator and jerky shifts.', fr: 'ETG5 : actionneur d\'embrayage et passages saccadés.' }],
      },
    ],
  },
  {
    id: 'peugeot-308-ii',
    make: 'PEUGEOT',
    model: /^308$/,
    years: [2013, 2021],
    fuelTypes: ['thermal'],
    label: 'Peugeot 308 II (2013–2021)',
    markets: ['FR', 'GB', 'ES'],
    source: 'PureTech wet belt 6 yrs / 100k km per Stellantis (L\'argus). Rest of the carnet d\'entretien still to check.',
    verified: false,
    intervals: {
      oil: { km: 20_000, months: 12 },
      filter: { km: 40_000, months: 24 },
      fluid: { km: null, months: 24 },
      belt: { km: 240_000, months: 120, estimatedCostEur: 650 },
      other: { km: 160_000, months: 120 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /puretech|1\.2 t|110|130|eb2dt/i,
        label: '1.2 PureTech turbo',
        intervals: { belt: { km: 100_000, months: 72, estimatedCostEur: 700, note: WET_BELT_PSA }, oil: { km: 15_000, months: 12 } },
        weakPoints: [{ category: 'belt', fromKm: 60_000, toKm: 130_000, severity: 'safety', en: 'Wet belt shredding — see 208 PureTech.', fr: 'Courroie humide qui se délite — voir 208 PureTech.' }],
      },
      {
        match: /eat6|eat8|auto|automatic/i,
        label: 'EAT6 / EAT8 automatic',
        intervals: { gearbox: { km: 60_000, months: 60, estimatedCostEur: 300, note: { en: 'Aisin "lifetime" fill — specialists advise 60k km.', fr: 'Remplissage Aisin "à vie" — les spécialistes conseillent 60k km.' } } },
      },
      {
        match: /bluehdi|hdi|diesel|1\.6 d|2\.0 d|1\.5 d/i,
        label: '1.5 / 1.6 / 2.0 BlueHDi',
        weakPoints: [{ category: 'other', fromKm: 80_000, toKm: 200_000, severity: 'watch', en: 'AdBlue system faults (tank heater, pump, injector).', fr: 'Pannes du système AdBlue (réchauffeur, pompe, injecteur).' }],
      },
    ],
  },

  // ── Renault ─────────────────────────────────────────────────────────
  {
    id: 'renault-clio-iv',
    make: 'RENAULT',
    model: /^CLIO$/,
    years: [2012, 2019],
    fuelTypes: ['thermal'],
    label: 'Renault Clio IV (2012–2019)',
    markets: ['FR', 'GB', 'ES'],
    source: 'Renault: TCe 30,000 km / 24 months, dCi 20,000 km / 12 months or 30k / 24 depending on spec (auto-abc.eu, getgaragehub). We use 20k / 12 as the safe figure. Carnet check to do.',
    verified: false,
    intervals: {
      oil: { km: 20_000, months: 12, note: { en: 'Renault allows 30k km / 2 yrs on TCe petrols and some dCi; 20k / 1 yr is the safe figure for urban use.', fr: 'Renault autorise 30k km / 2 ans sur les TCe et certains dCi ; 20k / 1 an est la valeur sûre en urbain.' } },
      filter: { km: 40_000, months: 24 },
      fluid: { km: null, months: 24 },
      belt: { km: 160_000, months: 72, estimatedCostEur: 550, note: { en: '1.5 dCi (K9K) and 1.2 16v: belt 160k km / 6 yrs. 0.9 TCe / 1.2 TCe: chain.', fr: '1.5 dCi (K9K) et 1.2 16v : courroie 160k km / 6 ans. 0.9 TCe / 1.2 TCe : chaîne.' } },
      other: { km: 120_000, months: 72 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /1\.2 tce|tce 115|tce 120|h5ft/i,
        label: '1.2 TCe (H5Ft)',
        intervals: { belt: { km: null, months: null } },
        weakPoints: [{ category: 'oil', fromKm: 40_000, toKm: 150_000, severity: 'safety', en: '2012–2016 1.2 TCe: severe oil consumption leading to engine failure — check level every 1,000 km.', fr: '1.2 TCe 2012–2016 : forte consommation d\'huile menant à la casse — vérifier le niveau tous les 1 000 km.' }],
      },
      {
        match: /0\.9|tce 90|h4bt/i,
        label: '0.9 TCe (H4Bt)',
        intervals: { belt: { km: null, months: null } },
        weakPoints: [{ category: 'belt', fromKm: 80_000, toKm: 180_000, severity: 'watch', en: 'Timing chain noise / stretch.', fr: 'Bruit / allongement de la chaîne de distribution.' }],
      },
      {
        match: /dci|diesel|1\.5 d|k9k/i,
        label: '1.5 dCi (K9K)',
        weakPoints: [{ category: 'other', fromKm: 100_000, toKm: 220_000, severity: 'watch', en: 'Injectors, EGR and DPF on short trips.', fr: 'Injecteurs, EGR et FAP en trajets courts.' }],
      },
      {
        match: /edc|auto|automatic/i,
        label: 'EDC dual-clutch',
        intervals: { gearbox: { km: 60_000, months: 60, estimatedCostEur: 300 } },
        weakPoints: [{ category: 'gearbox', fromKm: 60_000, toKm: 160_000, severity: 'watch', en: 'EDC (DC4) mechatronic / clutch failures.', fr: 'EDC (DC4) : pannes mécatronique / embrayage.' }],
      },
    ],
  },

  // ── Toyota ──────────────────────────────────────────────────────────
  {
    id: 'toyota-yaris-iii-hybrid',
    make: 'TOYOTA',
    model: /^YARIS$/,
    years: [2012, 2020],
    fuelTypes: ['hybrid'],
    label: 'Toyota Yaris III Hybrid (2012–2020)',
    markets: ['GB', 'FR', 'DE'],
    source: 'Toyota UK: service every 10,000 mi / 12 months (mag.toyota.co.uk "Yaris service intervals"); EU 15,000 km / 12 months. Handbook check to do.',
    verified: false,
    intervals: {
      oil: { km: 15_000, months: 12 },
      filter: { km: 45_000, months: 36 },
      fluid: { km: null, months: 24 },
      belt: { km: null, months: null, note: { en: '1.5 VVT-i (1NZ-FXE): timing chain, no scheduled change.', fr: '1.5 VVT-i (1NZ-FXE) : chaîne, pas de remplacement planifié.' } },
      gearbox: { km: 100_000, months: 96, estimatedCostEur: 200, note: { en: 'e-CVT (planetary) oil — Toyota says no service; specialists advise 100k km.', fr: 'Huile de l\'e-CVT — Toyota ne prévoit rien ; les spécialistes conseillent 100k km.' } },
      battery: { km: null, months: 12, estimatedCostEur: 60, note: { en: 'Annual Hybrid Health Check at a Toyota dealer extends the traction-battery warranty to 10 years.', fr: 'Le Hybrid Health Check annuel chez Toyota prolonge la garantie batterie de traction à 10 ans.' } },
      other: { km: 160_000, months: 120 },
      brakes: { km: 80_000, months: 60, note: { en: 'Regenerative braking spares the pads but rear discs corrode from under-use.', fr: 'Le freinage régénératif épargne les plaquettes mais les disques arrière se corrodent faute d\'usage.' } },
    },
    weakPoints: [
      { category: 'battery', fromKm: 0, toKm: 400_000, severity: 'watch', en: 'Small 12 V auxiliary battery fails around 5–6 years — car will not "start" (boot up).', fr: 'Petite batterie 12 V auxiliaire qui lâche vers 5–6 ans — la voiture ne "démarre" plus.' },
      { category: 'brakes', fromKm: 40_000, toKm: 200_000, severity: 'watch', en: 'Rear brake corrosion / sticking from little use.', fr: 'Corrosion / grippage des freins arrière peu sollicités.' },
    ],
  },

  // ── Nissan ──────────────────────────────────────────────────────────
  {
    id: 'nissan-qashqai-j11',
    make: 'NISSAN',
    model: /^QASHQAI$/,
    years: [2013, 2021],
    fuelTypes: ['thermal'],
    label: 'Nissan Qashqai J11 (2013–2021)',
    markets: ['GB', 'FR', 'DE'],
    source: 'Nissan UK: petrol 12,500 mi / 12 months, diesel 18,000 mi / 12 months (qashqaiforums dealer quotes). Handbook check to do.',
    verified: false,
    intervals: {
      oil: { km: 20_000, months: 12 },
      filter: { km: 40_000, months: 24 },
      fluid: { km: null, months: 24 },
      belt: { km: null, months: null, note: { en: '1.2 DIG-T, 1.3 DIG-T and 1.6 dCi: chain. 1.5 dCi: belt (see engine).', fr: '1.2 DIG-T, 1.3 DIG-T et 1.6 dCi : chaîne. 1.5 dCi : courroie (voir moteur).' } },
      other: { km: 150_000, months: 120 },
      battery: { km: null, months: 60 },
    },
    engines: [
      {
        match: /1\.5 dci|dci 110|dci 115|k9k/i,
        label: '1.5 dCi (K9K)',
        intervals: { belt: { km: 150_000, months: 72, estimatedCostEur: 550 }, oil: { km: 29_000, months: 12, note: { en: 'Nissan UK diesel schedule: 18,000 mi / 12 months.', fr: 'Plan Nissan UK diesel : 18 000 mi / 12 mois.' } } },
        weakPoints: [{ category: 'other', fromKm: 100_000, toKm: 220_000, severity: 'watch', en: 'DPF / EGR on short trips; AdBlue faults on 2018+ units.', fr: 'FAP / EGR en trajets courts ; défauts AdBlue sur les 2018+.' }],
      },
      {
        match: /1\.2 dig|dig-t 115|hra2/i,
        label: '1.2 DIG-T',
        weakPoints: [
          { category: 'oil', fromKm: 40_000, toKm: 150_000, severity: 'safety', en: 'Oil consumption and timing-chain wear on 1.2 DIG-T — check level every 1,000 km.', fr: 'Consommation d\'huile et usure de chaîne sur 1.2 DIG-T — vérifier le niveau tous les 1 000 km.' },
        ],
      },
      {
        match: /xtronic|cvt|auto|automatic/i,
        label: 'Xtronic CVT',
        intervals: { gearbox: { km: 60_000, months: 48, estimatedCostEur: 300, note: { en: 'CVT fluid (NS-3) every 60k km — skipping it is the main cause of CVT failure.', fr: 'Huile CVT (NS-3) tous les 60k km — la sauter est la première cause de casse de CVT.' } } },
        weakPoints: [{ category: 'gearbox', fromKm: 80_000, toKm: 180_000, severity: 'safety', en: 'Xtronic CVT judder and failure — oil changes matter.', fr: 'CVT Xtronic : broutage et casse — les vidanges comptent.' }],
      },
    ],
    weakPoints: [
      { category: 'other', fromKm: 60_000, toKm: 160_000, severity: 'watch', en: 'Rear suspension knocks (bushes / top mounts).', fr: 'Claquements de suspension arrière (silentblocs / coupelles).' },
    ],
  },
];
