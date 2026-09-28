export type FAQ = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

export type FAQCategory = {
  id: string;
  title: string;
  description: string;
  icon: 'settings' | 'zap' | 'shield' | 'credit-card' | 'file-text';
  faqs: FAQ[];
};

export const KNOWLEDGE_BASE: FAQCategory[] = [
  {
    id: 'tco',
    title: 'Calcul du TCO',
    description: 'Comprendre le Total Cost of Ownership',
    icon: 'zap',
    faqs: [
      {
        id: 'tco-1',
        question: 'Comment est calculé mon TCO ?',
        answer: 'Le TCO (Total Cost of Ownership) est calculé en temps réel en additionnant vos frais fixes (assurance, financement) et vos frais variables (carburant/recharge, entretien) divisés par la distance parcourue. Notre algorithme prend également en compte la dépréciation estimée du véhicule.',
        keywords: ['tco', 'calcul', 'formule', 'coût', 'kilomètre', 'dépense'],
      },
      {
        id: 'tco-2',
        question: 'Pourquoi mon coût au kilomètre varie-t-il ?',
        answer: 'Le coût au kilomètre est dynamique. Il baisse lorsque vous roulez plus (amortissement des frais fixes) ou suite à une optimisation de vos dépenses (ex: changement d\'assurance ou recharge heures creuses). L\'ajout d\'une nouvelle facture d\'entretien créera un pic temporaire.',
        keywords: ['variation', 'coût', 'kilomètre', 'fluctuation'],
      }
    ]
  },
  {
    id: 'maintenance',
    title: 'Carnet d\'Entretien',
    description: 'Gérer la maintenance de votre flotte',
    icon: 'settings',
    faqs: [
      {
        id: 'maint-1',
        question: 'Comment fonctionne le carnet d\'entretien certifié ?',
        answer: 'Chaque facture d\'entretien que vous importez est analysée par notre IA, horodatée, et enregistrée de manière immuable. Cela génère un historique infalsifiable, essentiel pour maximiser la valeur de revente de votre véhicule.',
        keywords: ['carnet', 'entretien', 'certifié', 'historique', 'facture', 'valeur de revente'],
      },
      {
        id: 'maint-2',
        question: 'Quelles sont les alertes prédictives ?',
        answer: 'Notre système analyse le modèle de votre véhicule et vos habitudes de conduite pour prédire les échéances d\'entretien (vidange, freins, pneus). Vous êtes alerté bien avant que l\'intervention ne soit critique.',
        keywords: ['alerte', 'prédictive', 'vidange', 'freins', 'échéance'],
      }
    ]
  },
  {
    id: 'ocr',
    title: 'Scan OCR',
    description: 'Traitement automatisé des factures',
    icon: 'file-text',
    faqs: [
      {
        id: 'ocr-1',
        question: 'Quels types de documents sont supportés par le scan ?',
        answer: 'Vous pouvez scanner des tickets de caisse (carburant, péage) et des factures A4 complètes (entretien, achat de pièces, assurance). Les formats supportés sont PDF, JPEG, PNG, et WebP (max 5 Mo).',
        keywords: ['scan', 'ocr', 'ticket', 'facture', 'format', 'pdf', 'image'],
      },
      {
        id: 'ocr-2',
        question: 'Que faire si le scan OCR commet une erreur ?',
        answer: 'Bien que notre algorithme ait un taux de précision de 98%, il est possible qu\'un reçu froissé soit mal interprété. Vous pouvez toujours éditer manuellement les montants et dates après l\'extraction et avant la validation finale.',
        keywords: ['erreur', 'scan', 'correction', 'manuel', 'éditer'],
      }
    ]
  },
  {
    id: 'subscription',
    title: 'Abonnements & Tarifs',
    description: 'Gérer votre compte Premium',
    icon: 'credit-card',
    faqs: [
      {
        id: 'sub-1',
        question: 'Quels sont les avantages du plan Premium ?',
        answer: 'Le plan Premium (4,99€/mois) débloque les requêtes OCR illimitées, le carnet d\'entretien certifié exportable pour la vente, et le suivi multi-véhicules (jusqu\'à 5 véhicules). Le plan gratuit est limité à l\'import manuel pour 1 véhicule.',
        keywords: ['premium', 'avantage', 'prix', 'gratuit', 'limite', 'abonnement'],
      },
      {
        id: 'sub-2',
        question: 'Puis-je annuler mon abonnement à tout moment ?',
        answer: 'Oui, l\'abonnement est sans engagement. Vous pouvez l\'annuler depuis les paramètres de votre compte (via Stripe). Votre accès Premium restera actif jusqu\'à la fin de la période facturée en cours.',
        keywords: ['annuler', 'résilier', 'engagement', 'stripe', 'désabonner'],
      }
    ]
  }
];

// Helper pour le chatbot (recherche basique)
export function searchKnowledgeBase(query: string): string {
  const normalizedQuery = query.toLowerCase();
  
  const results = [];
  for (const category of KNOWLEDGE_BASE) {
    for (const faq of category.faqs) {
      if (
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.answer.toLowerCase().includes(normalizedQuery) ||
        faq.keywords.some(k => normalizedQuery.includes(k.toLowerCase()))
      ) {
        results.push(`Q: ${faq.question}\nR: ${faq.answer}`);
      }
    }
  }

  if (results.length === 0) {
    return "Je suis désolé, je n'ai pas trouvé de réponse exacte dans ma base de connaissances. N'hésitez pas à reformuler votre question ou à contacter le support direct à contact@keeperapp.app.";
  }

  return results.slice(0, 2).join('\n\n'); // Limite à 2 réponses pertinentes
}

export const SYSTEM_PROMPT = `Tu es l'assistant de Keeper, une application qui aide un particulier à savoir ce que sa voiture va lui coûter et à payer moins : coût au kilomètre, prévision d'entretien, rappels, pannes connues du modèle.
Ton rôle est d'aider les utilisateurs avec concision, en te basant UNIQUEMENT sur la base de connaissances suivante.

BASE DE CONNAISSANCES:
${KNOWLEDGE_BASE.map(c => 
  c.faqs.map(f => `Q: ${f.question}\nR: ${f.answer}`).join('\n')
).join('\n')}

INSTRUCTIONS:
1. Réponds dans la langue du message de l'utilisateur (l'application est en anglais et en français).
2. Ton ton est clair et factuel. N'invente jamais un chiffre : si la base ne le contient pas, dis-le.
3. Si la réponse n'est pas dans la base de connaissances, dis que tu ne peux pas répondre pour le moment et propose de contacter contact@keeperapp.app.
4. Fais des phrases courtes et directes.`;
