import type { Category } from './knowledge-base';

/**
 * Curated step-by-step instructions, tooling, difficulty and estimated
 * duration for each maintenance category. Used to enrich a generated
 * MaintenanceTask before it is persisted, so the user has actionable
 * guidance instead of just "Do an oil change next Tuesday".
 */
export interface MaintenanceInstructions {
  /** Short checklist shown inside the task card and the reminder email. */
  checklist: string[];
  /** Hand tools / consumables the user (or their garage) needs. */
  tools: string[];
  /** Subjective DIY difficulty on a 1–5 scale. 1 = anyone, 5 = pro only. */
  diyDifficulty: 1 | 2 | 3 | 4 | 5;
  /** Estimated wall-clock duration for the intervention, in minutes. */
  durationMinutes: number;
  /** Public tutorial worth referencing in the UI. */
  tutorialUrl?: string;
}

export const INSTRUCTIONS: Record<Category, MaintenanceInstructions> = {
  oil: {
    checklist: [
      'Faire chauffer le moteur 3-5 minutes pour fluidifier l\'huile',
      'Lever le véhicule sur cric ou pont avec chandelles de sécurité',
      'Dévisser le bouchon de vidange et laisser couler l\'huile usagée 10 min',
      'Remplacer le joint en cuivre et serrer au couple constructeur',
      'Changer le filtre à huile (vérifier le joint torique)',
      'Remplir avec la viscosité spécifiée et le volume exact',
      'Vérifier la jauge à froid puis après 5 min de chauffe',
      'Recycler l\'huile usagée en déchèterie (obligatoire)',
    ],
    tools: ['Clé bouchon vidange', 'Clé filtre', 'Bac récupérateur', 'Joint cuivre neuf', 'Filtre huile', 'Huile moteur (volume constructeur)', 'Entonnoir'],
    diyDifficulty: 2,
    durationMinutes: 45,
    tutorialUrl: 'https://www.vroomly.com/conseils/comment-faire-vidange-voiture/',
  },
  filter: {
    checklist: [
      'Identifier les filtres à changer (air, habitacle, carburant selon kilométrage)',
      'Ouvrir le boîtier de filtre à air (souvent à clips)',
      'Vérifier le sens d\'écoulement de l\'air sur le filtre neuf',
      'Aspirer le boîtier avant remontage',
      'Remplacer le filtre habitacle (sous la boîte à gants en général)',
      'Refermer les clips et redémarrer pour vérifier le ralenti',
    ],
    tools: ['Filtre à air', 'Filtre habitacle', 'Aspirateur', 'Tournevis cruciforme'],
    diyDifficulty: 1,
    durationMinutes: 20,
    tutorialUrl: 'https://www.vroomly.com/conseils/comment-changer-filtre-a-air/',
  },
  brakes: {
    checklist: [
      'Lever le véhicule et déposer les roues',
      'Inspecter visuellement l\'épaisseur des plaquettes et l\'état des disques',
      'Repousser le piston avec un repousse-piston (sans forcer)',
      'Remplacer plaquettes par paire (essieu complet)',
      'Vérifier le niveau de liquide de frein et purger si nécessaire',
      'Roder progressivement les premiers 200 km : freinages doux',
    ],
    tools: ['Cric + chandelles', 'Clé à choc ou clé en croix', 'Repousse-piston', 'Plaquettes neuves', 'Disques neufs si épaisseur < mini constructeur', 'Liquide de frein DOT 4'],
    diyDifficulty: 3,
    durationMinutes: 90,
    tutorialUrl: 'https://www.vroomly.com/conseils/comment-changer-plaquettes-de-frein/',
  },
  tires: {
    checklist: [
      'Vérifier l\'usure et l\'état des 4 pneus (témoin TWI)',
      'Choisir des pneus de même indice de charge et vitesse',
      'Faire monter, équilibrer et géométrie chez un professionnel',
      'Permuter avant/arrière à chaque entretien pour usure homogène',
      'Vérifier la pression à froid une fois par mois',
    ],
    tools: ['Manomètre', 'Clé dynamométrique', 'Cric (pour permutation maison)'],
    diyDifficulty: 4,
    durationMinutes: 60,
    tutorialUrl: 'https://www.vroomly.com/conseils/quand-changer-pneus-voiture/',
  },
  battery: {
    checklist: [
      'Couper le contact, attendre 10 min',
      'Débrancher la cosse négative (-) en premier',
      'Débrancher la cosse positive (+)',
      'Vérifier l\'ampérage CCA et la capacité de la batterie neuve',
      'Brancher d\'abord le + puis le -',
      'Réinitialiser horloge, autoradio et fenêtres impulsionnelles',
    ],
    tools: ['Clé plate 10mm', 'Batterie neuve (calibre constructeur)', 'Brosse métallique pour cosses', 'Graisse de cosse'],
    diyDifficulty: 2,
    durationMinutes: 30,
    tutorialUrl: 'https://www.vroomly.com/conseils/comment-changer-batterie-voiture/',
  },
  inspection: {
    checklist: [
      'Prendre rendez-vous dans un centre agréé UTAC OTC',
      'Vérifier état des plaques, ampoules, essuie-glaces, ceintures',
      'Contrôler la pression et l\'usure des pneus',
      'Apporter la carte grise originale (obligatoire)',
      'Prévoir 45-60 min sur place',
      'En cas de contre-visite : 2 mois pour corriger',
    ],
    tools: ['Carte grise', 'Carnet d\'entretien (recommandé)'],
    diyDifficulty: 1,
    durationMinutes: 60,
    tutorialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F19846',
  },
  belt: {
    checklist: [
      'Vérifier dans le carnet si le moteur a une courroie, une chaîne ou une courroie humide (dans l\'huile)',
      'Remplacer courroie + galets tendeur/enrouleur + pompe à eau en une seule fois',
      'Respecter le calage moteur (piges) — travail de professionnel',
      'Noter la date et le kilométrage : c\'est la première question d\'un acheteur',
    ],
    tools: ['Kit distribution complet', 'Pompe à eau', 'Liquide de refroidissement', 'Outils de calage spécifiques'],
    diyDifficulty: 5,
    durationMinutes: 240,
    tutorialUrl: 'https://www.vroomly.com/conseils/quand-changer-courroie-de-distribution/',
  },
  fluid: {
    checklist: [
      'Tester le taux d\'humidité du liquide (testeur à 10 €) — au-delà de 3 %, changer',
      'Purger roue par roue en commençant par la plus éloignée du maître-cylindre',
      'Ne jamais laisser le réservoir se vider pendant la purge',
      'Utiliser le grade indiqué sur le bouchon (DOT 4 en général)',
    ],
    tools: ['Liquide de frein DOT 4', 'Kit de purge', 'Clé de purgeur', 'Testeur d\'humidité'],
    diyDifficulty: 3,
    durationMinutes: 60,
    tutorialUrl: 'https://www.vroomly.com/conseils/quand-changer-liquide-de-frein/',
  },
  gearbox: {
    checklist: [
      'Identifier le type de boîte (automatique classique, DSG/double embrayage, CVT) — huile spécifique',
      'Vidanger à température de service, quantité exacte selon procédure constructeur',
      'Sur DSG : remplacer aussi le filtre à huile de boîte',
      'Réinitialiser l\'adaptation si la procédure l\'exige (outil diagnostic)',
    ],
    tools: ['Huile de boîte (référence constructeur)', 'Filtre de boîte si applicable', 'Pompe de remplissage', 'Outil diagnostic'],
    diyDifficulty: 4,
    durationMinutes: 90,
    tutorialUrl: 'https://www.vroomly.com/conseils/vidange-boite-automatique/',
  },
  other: {
    checklist: [
      'Vérifier le niveau et la couleur du liquide de refroidissement',
      'Inspecter les durites pour fuites ou gonflements',
      'Vidanger et remplacer si le liquide est trouble ou rouille',
      'Purger le circuit pour évacuer l\'air',
      'Faire tourner le moteur à pleine température pour vérifier',
    ],
    tools: ['Liquide de refroidissement (type constructeur)', 'Entonnoir purgeur', 'Bac récupérateur'],
    diyDifficulty: 3,
    durationMinutes: 60,
    tutorialUrl: 'https://www.vroomly.com/conseils/comment-changer-liquide-refroidissement/',
  },
};

/**
 * English set. Same structure; tutorial links point at UK-neutral sources
 * (Haynes, gov.uk) instead of French ones, and the inspection checklist is
 * the MOT, not the contrôle technique.
 */
export const INSTRUCTIONS_EN: Record<Category, MaintenanceInstructions> = {
  oil: {
    checklist: [
      'Warm the engine 3–5 minutes so the oil drains freely',
      'Raise the car on a jack with axle stands (never on the jack alone)',
      'Remove the sump plug and let the old oil drain for 10 minutes',
      'Fit a new copper washer and tighten to the manufacturer torque',
      'Replace the oil filter (check the O-ring is seated)',
      'Refill with the specified grade and exact volume',
      'Check the dipstick cold, then again after 5 minutes running',
      'Take the used oil to a recycling centre (it is illegal to pour it away)',
    ],
    tools: ['Sump plug spanner', 'Filter wrench', 'Drain pan', 'New copper washer', 'Oil filter', 'Engine oil (manufacturer volume)', 'Funnel'],
    diyDifficulty: 2,
    durationMinutes: 45,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-change-your-engine-oil',
  },
  filter: {
    checklist: [
      'Identify which filters are due (air, cabin, fuel by mileage)',
      'Open the air-filter housing (usually clipped)',
      'Check the airflow arrow on the new filter',
      'Vacuum the housing before refitting',
      'Replace the cabin filter (usually behind the glovebox)',
      'Refit the clips and start the engine to check the idle',
    ],
    tools: ['Air filter', 'Cabin filter', 'Vacuum cleaner', 'Phillips screwdriver'],
    diyDifficulty: 1,
    durationMinutes: 20,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-replace-your-cars-air-filter',
  },
  brakes: {
    checklist: [
      'Raise the car and remove the wheels',
      'Inspect pad thickness and disc condition',
      'Push the piston back with a caliper tool (do not force it)',
      'Replace pads in pairs (whole axle)',
      'Check brake-fluid level and bleed if needed',
      'Bed in gently over the first 200 km: soft braking',
    ],
    tools: ['Jack + axle stands', 'Impact wrench or wheel brace', 'Piston wind-back tool', 'New pads', 'New discs if below minimum thickness', 'DOT 4 brake fluid'],
    diyDifficulty: 3,
    durationMinutes: 90,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-change-brake-pads',
  },
  tires: {
    checklist: [
      'Check wear and condition of all 4 tyres (tread-wear indicators; UK legal minimum 1.6 mm)',
      'Choose tyres with the same load and speed rating',
      'Have them fitted, balanced and aligned by a professional',
      'Rotate front/rear at each service for even wear',
      'Check pressures cold once a month',
    ],
    tools: ['Pressure gauge', 'Torque wrench', 'Jack (for a home rotation)'],
    diyDifficulty: 4,
    durationMinutes: 60,
    tutorialUrl: 'https://www.gov.uk/guidance/tyre-safety',
  },
  battery: {
    checklist: [
      'Switch off the ignition and wait 10 minutes',
      'Disconnect the negative (−) terminal first',
      'Disconnect the positive (+) terminal',
      'Check the CCA rating and capacity of the new battery',
      'Reconnect + first, then −',
      'Reset the clock, radio and one-touch windows',
    ],
    tools: ['10 mm spanner', 'New battery (manufacturer spec)', 'Terminal brush', 'Terminal grease'],
    diyDifficulty: 2,
    durationMinutes: 30,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-change-car-battery',
  },
  inspection: {
    checklist: [
      'Book an MOT at an approved test centre (you can test up to a month early and keep the renewal date)',
      'Check number plates, bulbs, wipers, seat belts and horn',
      'Check tyre pressures and tread depth',
      'Top up washer fluid and clear the boot of heavy items',
      'Allow 45–60 minutes on site',
      'If it fails: fix and retest within 10 working days for a free/partial retest',
    ],
    tools: ['V5C not required, but bring it if unsure', 'Service history (recommended)'],
    diyDifficulty: 1,
    durationMinutes: 60,
    tutorialUrl: 'https://www.gov.uk/getting-an-mot',
  },
  belt: {
    checklist: [
      'Check the service book: timing belt, chain, or wet belt (running in oil) — they differ',
      'Replace belt + tensioner/idlers + water pump together',
      'Engine timing must be locked with the right tools — a job for a professional',
      'Record the date and mileage: it is the first thing a buyer asks',
    ],
    tools: ['Full timing kit', 'Water pump', 'Coolant', 'Engine locking tools'],
    diyDifficulty: 5,
    durationMinutes: 240,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/when-should-i-change-my-timing-belt',
  },
  fluid: {
    checklist: [
      'Test the fluid\'s moisture content (£10 tester) — above 3 %, change it',
      'Bleed wheel by wheel, starting furthest from the master cylinder',
      'Never let the reservoir run dry while bleeding',
      'Use the grade printed on the cap (usually DOT 4)',
    ],
    tools: ['DOT 4 brake fluid', 'Bleed kit', 'Bleed-nipple spanner', 'Moisture tester'],
    diyDifficulty: 3,
    durationMinutes: 60,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-change-brake-fluid',
  },
  gearbox: {
    checklist: [
      'Identify the gearbox type (torque-converter auto, DSG/dual-clutch, CVT) — each needs its own oil',
      'Drain at operating temperature; refill the exact quantity per the manufacturer procedure',
      'On DSG: replace the gearbox oil filter too',
      'Reset adaptations if the procedure requires it (diagnostic tool)',
    ],
    tools: ['Gearbox oil (manufacturer spec)', 'Gearbox filter if applicable', 'Fill pump', 'Diagnostic tool'],
    diyDifficulty: 4,
    durationMinutes: 90,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-change-automatic-transmission-fluid',
  },
  other: {
    checklist: [
      'Check the coolant level and colour',
      'Inspect hoses for leaks or swelling',
      'Drain and replace if the fluid is cloudy or rusty',
      'Bleed the system to remove air',
      'Run the engine to full temperature and re-check',
    ],
    tools: ['Coolant (manufacturer type)', 'Bleed funnel', 'Drain pan'],
    diyDifficulty: 3,
    durationMinutes: 60,
    tutorialUrl: 'https://haynes.com/en-gb/tips-tutorials/how-change-your-coolant',
  },
};

/** Convenience accessor — returns the instructions struct for one category, in the given language. */
export function getInstructions(category: Category, locale: 'en' | 'fr' = 'en'): MaintenanceInstructions {
  return (locale === 'fr' ? INSTRUCTIONS : INSTRUCTIONS_EN)[category];
}
