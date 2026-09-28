'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import {
  ChevronLeft,
  BookOpen,
  MessageSquareText,
  Wrench,
  Fuel,
  Car,
  Brain,
  ScanLine,
  Mail,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GuideDetail {
  title: string;
  icon: any;
  badge: string;
  desc: string;
  sections: {
    subtitle: string;
    content: string;
    points?: string[];
  }[];
}

const GUIDE_DETAILS_LOCALIZED: Record<string, Record<string, GuideDetail>> = {
  fr: {
    add_vehicle: {
      title: 'Ajouter un véhicule',
      icon: Car,
      badge: 'Onboarding & Plaque-Driven',
      desc: 'Découvrez comment enregistrer votre actif roulant en quelques secondes grâce à notre système de lookup intelligent basé sur le fichier SIV.',
      sections: [
        {
          subtitle: '1. Saisie Simplifiée Plaque & Kilométrage',
          content: 'Notre formulaire a été optimisé pour éliminer la saisie fastidieuse de caractéristiques techniques. Renseignez uniquement la plaque d\'immatriculation et le kilométrage actuel du véhicule. Ce flux réduit les 13 champs traditionnellement requis à seulement 2.',
        },
        {
          subtitle: '2. Cascade d\'informations via SIV API',
          content: 'À la perte de focus du champ de plaque, notre système interroge de manière asynchrone l\'API SIV (France) ou DVLA (Royaume-Uni). En moins de 800ms, les caractéristiques suivantes sont injectées automatiquement :',
          points: [
            'Marque et Modèle du constructeur',
            'Motorisation précise et carburation',
            'Année de mise en circulation et code VIN',
            'Puissance fiscale et émissions de CO2',
          ],
        },
        {
          subtitle: '3. Options Avancées & Accordéon Interactif',
          content: 'Toutes les informations additionnelles requises (assureur, prix d\'achat initial, devise de gestion) sont pré-remplies avec des valeurs par défaut intelligentes et logées dans un volet expandable animé via Framer Motion. Vous pouvez les ajuster à tout moment.',
        },
      ],
    },
    scan_ocr: {
      title: 'Scanner un reçu (OCR)',
      icon: ScanLine,
      badge: 'Intelligence Artificielle Vision',
      desc: 'Automatisez la saisie de vos reçus d\'énergie et factures d\'entretien grâce à notre moteur de reconnaissance optique.',
      sections: [
        {
          subtitle: '1. Formats Acceptés et Upload Sécurisé',
          content: 'Chargez une photo, un scan de reçu ou un document PDF (jusqu\'à 5 Mo). L\'API applique immédiatement une vérification anticipée de la taille du payload (via Content-Length) pour rejeter les fichiers trop lourds sans consommer de bande passante.',
        },
        {
          subtitle: '2. Analyse en Temps Réel Google Cloud Vision',
          content: 'Le moteur OCR analyse la structure du document et extrait automatiquement les métriques critiques :',
          points: [
            'Montant total TTC et taux de taxe (TVA)',
            'Volume physique de carburant (Litres) ou électricité (kWh)',
            'Nom de l\'établissement et adresse postale',
            'Date de facturation et kilométrage mentionné',
          ],
        },
        {
          subtitle: '3. Protection RLS & Isolation',
          content: 'Chaque facture numérisée est stockée de manière chiffrée (AES-256) dans un bucket privé Supabase Storage. Les politiques RLS (Row Level Security) garantissent que seul le propriétaire authentifié peut y accéder via des liens d\'URL signés temporaires (expiration 1h).',
        },
      ],
    },
    fuel_tco: {
      title: 'Suivi des dépenses & TCO',
      icon: Fuel,
      badge: 'Performance Financière',
      desc: 'Analysez l\'efficacité financière de votre flotte grâce au calcul automatique du coût kilométrique réel.',
      sections: [
        {
          subtitle: '1. Calcul du TCO en Temps Réel',
          content: 'L\'application compile l\'ensemble de vos recharges d\'énergie (pleins d\'essence, charges électriques), de vos factures d\'entretien et de l\'assurance amortie pour calculer votre coût au kilomètre :',
          points: [
            'Formule : Coût/Km = (Dépenses Énergie + Entretien + Assurance) / Distance Parcourue',
            'Mise à jour instantanée à chaque ajout de dépenses ou de trajet',
          ],
        },
        {
          subtitle: '2. Analyse du Mix Énergétique',
          content: 'Pour les flottes hybrides ou mixtes, visualisez la balance physique (L vs kWh) et financière de vos consommations. Optimisez vos cycles de recharge électrique pour minimiser le coût d\'usage par rapport au carburant fossile.',
        },
        {
          subtitle: '3. Graphiques Interactifs Recharts',
          content: 'Des courbes et diagrammes construits avec Recharts vous comparent en temps réel aux données de dépréciation du marché de l\'occasion pour déterminer si votre actif reste rentable.',
        },
      ],
    },
    maintenance_blockchain: {
      title: 'Historique d\'entretien',
      icon: Wrench,
      badge: 'Carnet Certifié Immuable',
      desc: 'Valorisez votre véhicule sur le marché de l\'occasion grâce à un historique d\'entretien infalsifiable certifié cryptographiquement.',
      sections: [
        {
          subtitle: '1. Chaînage Cryptographique SHA-256',
          content: 'Chaque intervention validée calcule une signature numérique unique (hash SHA-256) liant l\'action actuelle à la précédente. Ce protocole assure la traçabilité absolue de l\'historique.',
        },
        {
          subtitle: '2. Inviolabilité RLS & Trigger de Base de Données',
          content: 'Les triggers PostgreSQL et politiques de sécurité RLS interdisent strictement toute modification, modification de kilométrage rétroactive ou suppression d\'intervention. En cas de tentative d\'altération directe, la validation de la chaîne échoue instantanément.',
        },
        {
          subtitle: '3. Export Certifié PDF',
          content: 'Générez un rapport PDF officiel flouté avec filigrane "Keeper Verified" et QR code unique. Un acheteur potentiel peut scanner le QR code pour confirmer instantanément l\'authenticité des factures sur notre portail de vérification publique.',
        },
      ],
    },
    ia_phm: {
      title: 'Diagnostic IA & Weibull',
      icon: Brain,
      badge: 'Maintenance Prédictive PHM',
      desc: 'Anticipez les pannes et planifiez vos entretiens au moment opportun grâce à la loi de survie industrielle de Weibull.',
      sections: [
        {
          subtitle: '1. Analyse Industrielle de Fiabilité',
          content: 'Notre moteur PHM (Prognostics & Health Management) modélise l\'usure de vos composants mécaniques critiques :',
          points: [
            'Loi de Weibull calculant le taux de défaillance prédictif',
            'Prise en compte du kilométrage réel, de l\'âge et des conditions d\'usage',
            'Calcul de la Durée de Vie Utile Restante (RUL)',
          ],
        },
        {
          subtitle: '2. Indicateurs d\'Usure Intelligents',
          content: 'Les composants (freins, pneus, courroie, batterie) sont associés à des jauges de couleur simples (Vert = Optimal, Orange = Usure modérée, Rouge = Remplacement immédiat) pour une lecture instantanée.',
        },
        {
          subtitle: '3. Recommandations Prédictives',
          content: 'L\'IA planifie automatiquement vos prochaines visites chez le réparateur et vous propose un lien direct de navigation pré-rempli vers les garages à proximité pour résoudre les alertes sans tarder.',
        },
      ],
    },
  },
  en: {
    add_vehicle: {
      title: 'Add a vehicle',
      icon: Car,
      badge: 'Onboarding & Plate-Driven',
      desc: 'Discover how to register your automotive asset in seconds with our intelligent lookup system based on regional registration records.',
      sections: [
        {
          subtitle: '1. Simplified Plate & Mileage Entry',
          content: 'Our form is streamlined to eliminate tedious manual specification. Enter only the license plate number and current mileage of your vehicle. This flow reduces traditional forms from 13 fields to just 2.',
        },
        {
          subtitle: '2. Auto-Populate via Registration API',
          content: 'Upon leaving the plate input field, our system queries the regional DMV API. Within 800ms, the following technical specifications are automatically injected:',
          points: [
            'Manufacturer Brand & exact Model',
            'Fuel Type & exact engine version',
            'Production Year & official VIN',
            'Fiscal power & specific CO2 emission values',
          ],
        },
        {
          subtitle: '3. Advanced Configurable Options',
          content: 'All secondary details (insurance carrier, purchase price, currency) are pre-filled with smart defaults in an expandable accordion. You can customize them at any time.',
        },
      ],
    },
    scan_ocr: {
      title: 'Scan a receipt (OCR)',
      icon: ScanLine,
      badge: 'Vision AI Technology',
      desc: 'Automate manual entries for fuel or charging invoices using our custom optical character recognition engine.',
      sections: [
        {
          subtitle: '1. Secure Upload & Payload Filters',
          content: 'Upload any receipt photo, desktop scan, or PDF invoice (up to 5MB). The system filters the payload at the edge using Content-Length checks to prevent unnecessary network utilization.',
        },
        {
          subtitle: '2. Real-time Google Vision API Extraction',
          content: 'The OCR engine analyzes document topology to accurately parse vital tax and accounting values:',
          points: [
            'Gross total amount & active tax rates (VAT)',
            'Physical energy volume (Litres of fuel or kWh of electricity)',
            'Merchant name & precise location',
            'Transaction timestamp & matching odometer readings',
          ],
        },
        {
          subtitle: '3. Cloud Storage RLS Isolation',
          content: 'Files are saved with AES-256 encryption in private Supabase Storage buckets. Strict Row Level Security policies ensure that only the authenticated owner can access them via temporary signed URLs (1-hour expiration).',
        },
      ],
    },
    fuel_tco: {
      title: 'Expense Tracking & TCO',
      icon: Fuel,
      badge: 'Financial Intelligence',
      desc: 'Analyze the operating efficiency of your fleet with automatic calculation of real-time cost-per-kilometer.',
      sections: [
        {
          subtitle: '1. Instant TCO Processing',
          content: 'Keeper consolidates electricity recharges, fuel fill-ups, recurring insurance, and maintenance records to calculate your true running cost:',
          points: [
            'Formula: Cost/km = (Energy + Maintenance + Insurance) / Logged Distance',
            'Recalculated instantly on any newly logged invoice or trip',
          ],
        },
        {
          subtitle: '2. Energy Mix Optimization',
          content: 'For hybrid or mixed fleets, compare physical energy usage (L vs kWh) and financial efficiency. Optimize electric charging schedules to minimize operational costs compared to fossil fuels.',
        },
        {
          subtitle: '3. Recharts Interaction Engine',
          content: 'Interactive data visualization tracks depreciation metrics against current secondhand vehicle market values, highlighting exact break-even points.',
        },
      ],
    },
    maintenance_blockchain: {
      title: 'Service History Log',
      icon: Wrench,
      badge: 'Immutable Certified Logbook',
      desc: 'Preserve and prove your vehicle value on the resale market using an unalterable cryptographically secured record.',
      sections: [
        {
          subtitle: '1. SHA-256 Cryptographic Chaining',
          content: 'Every validated service event produces a unique block signature linking it to the previous entry. This protocol creates an unbrokerable trail of historical actions.',
        },
        {
          subtitle: '2. Immutable SQL Triggers & RLS',
          content: 'Database-level PostgreSQL triggers prevent any updates, deletions, or retroactive mileage tempering. Any direct DB alterations break the hash validation instantly, alerting audit processes.',
        },
        {
          subtitle: '3. Certified PDF Export',
          content: 'Generate a watermarked "Keeper Verified" PDF statement complete with a secure verification QR code. Potential buyers scan it to authenticate matching server-side records instantly.',
        },
      ],
    },
    ia_phm: {
      title: 'AI Diagnostic & Weibull',
      icon: Brain,
      badge: 'PHM Predictive Maintenance',
      desc: 'Forecast mechanical failures and schedule service interventions optimal to component life expectancy using industrial reliability algorithms.',
      sections: [
        {
          subtitle: '1. Industrial Reliability Analysis',
          content: 'Our Prognostics & Health Management (PHM) algorithms model wear rates of critical mechanical systems:',
          points: [
            'Weibull distribution computing failure probabilities',
            'Takes into account actual mileage, vehicle age, and real driving stresses',
            'Computes precise Remaining Useful Life (RUL)',
          ],
        },
        {
          subtitle: '2. Quick-Read Wear Indicators',
          content: 'Components (brakes, tires, belts, auxiliary batteries) are monitored with direct visual heat-levels (Green = Optimal, Yellow = Moderate, Red = Immediate action required).',
        },
        {
          subtitle: '3. Predictive Recommendations',
          content: 'The AI dynamically plans required mechanical checkups, generating direct routing coordinates to top-rated nearby partner workshops.',
        },
      ],
    },
  }
};

const GUIDES_LOCALIZED: Record<string, { key: string; icon: any; title: string; desc: string }[]> = {
  fr: [
    {
      key: 'add_vehicle',
      icon: Car,
      title: 'Ajouter un véhicule',
      desc: 'Enregistrez votre véhicule via plaque, VIN ou saisie manuelle.',
    },
    {
      key: 'scan_ocr',
      icon: ScanLine,
      title: 'Scanner un reçu (OCR)',
      desc: 'Photographiez votre ticket pour un enregistrement instantané.',
    },
    {
      key: 'fuel_tco',
      icon: Fuel,
      title: 'Suivi des dépenses énergie',
      desc: 'Consultez et filtrez vos pleins et recharges.',
    },
    {
      key: 'maintenance_blockchain',
      icon: Wrench,
      title: 'Historique d\'entretien',
      desc: 'Ajoutez et suivez chaque intervention sur vos véhicules.',
    },
    {
      key: 'ia_phm',
      icon: Brain,
      title: 'Diagnostic IA & Plan prédictif',
      desc: 'Notre IA analyse l\'usure réelle pour anticiper vos révisions.',
    },
  ],
  en: [
    {
      key: 'add_vehicle',
      icon: Car,
      title: 'Add a vehicle',
      desc: 'Register your vehicle via license plate, VIN, or manual entry.',
    },
    {
      key: 'scan_ocr',
      icon: ScanLine,
      title: 'Scan a receipt (OCR)',
      desc: 'Photograph your ticket for instant ledger logging.',
    },
    {
      key: 'fuel_tco',
      icon: Fuel,
      title: 'Track energy expenses',
      desc: 'View and filter all fuel fill-ups and electric charges.',
    },
    {
      key: 'maintenance_blockchain',
      icon: Wrench,
      title: 'Service history log',
      desc: 'Add and track every maintenance event on your vehicles.',
    },
    {
      key: 'ia_phm',
      icon: Brain,
      title: 'Predictive AI Diagnostic',
      desc: 'Our AI analyzes real wear patterns to anticipate maintenance.',
    },
  ]
};

const FAQ_LOCALIZED: Record<string, { q: string; a: string }[]> = {
  fr: [
    {
      q: 'Comment fonctionne la reconnaissance OCR ?',
      a: 'Prenez en photo votre ticket de caisse. Notre algorithme extrait automatiquement le montant, le volume, le type de carburant et la station. Vérifiez et validez en un tap.',
    },
    {
      q: 'Qu\'est-ce que le Diagnostic IA ?',
      a: 'Le moteur PHM (Prognostics & Health Management) analyse le kilométrage, la fréquence d\'usage et les intervalles constructeur pour prédire l\'usure de chaque composant clé (freins, pneus, distribution…).',
    },
    {
      q: 'Mes données sont-elles en sécurité ?',
      a: 'Toutes les données sont stockées sur Supabase avec chiffrement AES-256 au repos et TLS en transit. Les politiques RLS (Row Level Security) garantissent que seul le propriétaire accède à ses véhicules.',
    },
    {
      q: 'Quelle est la différence entre Standard et Premium ?',
      a: 'Le plan Standard (gratuit) offre le suivi manuel et la carte des stations. Le Premium (4,99€/mois) débloque le scan OCR illimité, le carnet certifié, l\'export fiscal PDF et le diagnostic IA complet.',
    },
    {
      q: 'Comment exporter mon carnet d\'entretien ?',
      a: 'Depuis la page de votre véhicule, accédez au Diagnostic IA puis cliquez sur "Exporter PDF certifié". Le document généré inclut l\'historique signé et les prédictions d\'usure.',
    },
  ],
  en: [
    {
      q: 'How does OCR recognition work?',
      a: 'Simply snap a photo of your energy receipt. Our engine automatically extracts the cost, volume, energy type, and location. Verify and validate in one tap.',
    },
    {
      q: 'What is the AI Diagnostic?',
      a: 'The PHM (Prognostics & Health Management) engine analyzes mileage, usage frequency, and OEM intervals to predict the wear of every key component (brakes, tires, belt, battery…).',
    },
    {
      q: 'Is my data secure?',
      a: 'All data is stored securely on Supabase with AES-256 encryption at rest and TLS in transit. PostgreSQL Row Level Security (RLS) policies ensure only you can access your vehicles.',
    },
    {
      q: 'What is the difference between Standard and Premium?',
      a: 'The Standard plan (free) offers manual tracking and basic logs. Premium (€9.99/mo) unlocks unlimited OCR scanning, the certified digital logbook, tax PDF exports, and full AI diagnostics.',
    },
    {
      q: 'How do I export my certified service log?',
      a: 'From your vehicle dashboard, go to the AI Diagnostic section and click "Export certified PDF". The generated document includes your cryptographic-signed history and wear predictions.',
    },
  ]
};

interface HelpCenterContentProps {
  currentLocale: 'fr' | 'en';
  backUrl?: string;
}

export function HelpCenterContent({ currentLocale, backUrl }: HelpCenterContentProps) {
  const [activeGuideKey, setActiveGuideKey] = useState<string | null>(null);

  const guideDetails = GUIDE_DETAILS_LOCALIZED[currentLocale];
  const activeGuide = activeGuideKey ? guideDetails[activeGuideKey] : null;
  const guides = GUIDES_LOCALIZED[currentLocale];
  const faq = FAQ_LOCALIZED[currentLocale];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto w-full space-y-12 relative">
      <div>
        {backUrl && (
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-6 text-muted-foreground hover:text-white">
            <Link href={backUrl}>
              <ChevronLeft className="h-4 w-4" /> {currentLocale === 'fr' ? 'Retour' : 'Back'}
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-[#007AFF]/10 text-[#007AFF] h-12 w-12 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,122,255,0.2)]">
            <BookOpen className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              {currentLocale === 'fr' ? "Centre d'aide Keeper" : "Keeper Help Center"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentLocale === 'fr'
                ? "Guides d'utilisation interactifs, documentations exhaustives et réponses fréquentes"
                : "Interactive user guides, exhaustive documentation, and FAQs"}
            </p>
          </div>
        </div>
      </div>

      {/* Guides rapides */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">
          {currentLocale === 'fr' ? 'Guides rapides interactifs' : 'Interactive Quick Guides'}
        </h2>
        <p className="text-xs text-muted-foreground -mt-2">
          {currentLocale === 'fr'
            ? 'Cliquez sur un guide pour obtenir toutes les informations de manière exhaustive.'
            : 'Click on any guide to view detailed and exhaustive instructions.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.key}
                onClick={() => setActiveGuideKey(g.key)}
                className="w-full text-start focus:outline-none"
              >
                <Card className="p-5 hover:bg-white/[0.03] border-white/5 hover:border-white/10 transition-all duration-300 h-full flex items-start gap-4 bg-[#16161A]/40 backdrop-blur-md rounded-card shadow-sm">
                  <div className="rounded-btn bg-[#007AFF]/10 text-[#007AFF] p-3 shrink-0">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{g.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {g.desc}
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Guide Detailed Panel (Modal overlay) */}
      {activeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300">
          <Card className="w-full max-w-2xl bg-[#0D0D12]/95 border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar space-y-6">
            {/* Close Button */}
            <button
              onClick={() => setActiveGuideKey(null)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors"
              aria-label={currentLocale === 'fr' ? 'Fermer' : 'Close'}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header info */}
            <div className="flex items-start gap-4 pr-8">
              <div className="rounded-btn bg-[#007AFF]/10 text-[#007AFF] p-3 shrink-0">
                <activeGuide.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <Badge variant="premium" className="text-[10px] px-2 py-0">
                  {activeGuide.badge}
                </Badge>
                <h3 className="font-display text-2xl font-bold text-white mt-1.5 leading-none">
                  {activeGuide.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              {activeGuide.desc}
            </p>

            <hr className="border-white/[0.05]" />

            {/* Detailed sections */}
            <div className="space-y-6">
              {activeGuide.sections.map((s, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="font-display text-sm font-semibold text-white">
                    {s.subtitle}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {s.content}
                  </p>
                  {s.points && (
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1.5 pl-2 mt-2">
                      {s.points.map((p, pIdx) => (
                        <li key={pIdx}>
                          <span className="text-white font-medium">{p.split(' : ')[0]}</span>
                          {p.split(' : ')[1] ? ` : ${p.split(' : ')[1]}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setActiveGuideKey(null)} className="rounded-full px-6 font-semibold">
                {currentLocale === 'fr' ? "J'ai compris" : 'Got it'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">
          {currentLocale === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions'}
        </h2>
        <div className="space-y-3">
          {faq.map((item, i) => (
            <Card key={i} className="p-4 bg-[#16161A]/40 border-white/5 backdrop-blur-md rounded-card">
              <details className="group">
                <summary className="font-medium text-sm cursor-pointer list-none flex items-center justify-between gap-2 text-white">
                  <span>{item.q}</span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground -rotate-90 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {item.a}
                </p>
              </details>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">
          {currentLocale === 'fr' ? "Besoin d'aide personnalisée ?" : "Need Personalized Help?"}
        </h2>
        <Card className="p-6 bg-gradient-to-r from-[#007AFF]/10 to-transparent border border-white/5 backdrop-blur-md rounded-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="rounded-full bg-emerald-500/10 text-emerald-400 h-12 w-12 flex items-center justify-center shrink-0">
                <MessageSquareText className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  {currentLocale === 'fr' ? "Assistance Keeper" : "Keeper Support"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {currentLocale === 'fr'
                    ? "Notre équipe de conseillers financiers et support technique est disponible par email ou via le chatbot."
                    : "Our team of financial advisors and technical support is available via email or chat."}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 rounded-full border-white/10 hover:bg-white/5" asChild>
              <a href="mailto:support@keeperapp.app" className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Mail className="h-4 w-4" /> {currentLocale === 'fr' ? 'Contacter le support' : 'Contact Support'}
              </a>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
