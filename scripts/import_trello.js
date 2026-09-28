// scripts/import_trello.js
// Script d'automatisation pour importer le Backlog Keeper dans Trello
// Usage : TRELLO_API_KEY=... TRELLO_TOKEN=... TRELLO_LIST_ID=... node scripts/import_trello.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Auto-load .env.local if present
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  // Silently ignore
}

const API_KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const LIST_ID = process.env.TRELLO_LIST_ID;

if (!API_KEY || !TOKEN || !LIST_ID) {
  console.error("❌ Erreur : Veuillez définir TRELLO_API_KEY, TRELLO_TOKEN et TRELLO_LIST_ID dans votre fichier .env.local ou dans votre terminal.");
  console.log("\nPour obtenir vos clés :");
  console.log("1. Allez sur https://trello.com/power-ups/admin");
  console.log("2. Créez un projet ou récupérez votre clé d'API (API Key) et générez un jeton (Token).");
  console.log("3. Pour récupérer le LIST_ID, ouvrez votre tableau Trello, ajoutez '.json' à l'URL et cherchez l'ID de votre liste Backlog.");
  process.exit(1);
}

const cards = [
  {
    "name": "🚀 [Prod] Pipeline CI/CD & Déploiement Production (Vercel)",
    "desc": "Mettre en place un déploiement continu sécurisé.\n\n### Liste de tâches :\n- [ ] Configurer les GitHub Actions pour exécuter Vitest et Playwright sur chaque Pull Request\n- [ ] Lier la branche `main` à Vercel avec le fichier vercel.json (région fra1 Frankfurt)\n- [ ] Mettre à jour l'URL Stripe Webhook avec le domaine de production réel\n- [ ] Restreindre le Token public Mapbox au domaine de production réel"
  },
  {
    "name": "📈 [SEO] Optimisation Référencement & Core Web Vitals",
    "desc": "Atteindre un score Lighthouse de 100% en SEO et Performance pour la Landing Page.\n\n### Liste de tâches :\n- [ ] Valider la structure unique H1 par page et la hiérarchie sémantique HTML5\n- [ ] Vérifier la balise `sitemap.xml` et le fichier `robots.txt` multi-langues\n- [ ] Ajouter les métadonnées OpenGraph (OG images) et Twitter Cards pour le partage social\n- [ ] Mesurer et optimiser le LCP (Largest Contentful Paint) et l'INP (Interaction to Next Paint)"
  },
  {
    "name": "🎨 [Design] Animations Fines & Finition Premium",
    "desc": "Apporter les micro-animations et la rigueur visuelle attendue d'une marque de gestion d'actifs.\n\n### Liste de tâches :\n- [ ] Appliquer un filtre CSS de grain subtil (bruit 0.04 opacité) pour une texture papier premium\n- [ ] Intégrer les animations GSAP avec ScrollTrigger pour la section Manifeste (révélation de texte)\n- [ ] Mettre en place un compteur dynamique fluide lors du scroll sur l'Indice de Revente\n- [ ] Ajouter des effets magnétiques (15px d'attraction) au survol des boutons CTA"
  },
  {
    "name": "⚖️ [Juridique] Conformité RGPD & Documents Légaux V1",
    "desc": "Valider la sécurité juridique de la plateforme avant le lancement public.\n\n### Liste de tâches :\n- [ ] Compléter les Mentions Légales avec des SIRET/RCS réels et informations d'hébergement\n- [ ] Rédiger les CGU (Conditions Générales d'Utilisation) et la Politique de Confidentialité\n- [ ] Intégrer une bannière de cookies respectueuse du RGPD bloquant les scripts tiers par défaut\n- [ ] Assurer la possibilité pour l'utilisateur de télécharger toutes ses factures et données personnelles"
  },
  {
    "name": "📊 [Monitoring] Supervision de Prod & Télémétrie",
    "desc": "Avoir une visibilité complète sur la santé de l'application en conditions réelles.\n\n### Liste de tâches :\n- [ ] Activer le DSN de Sentry en production et vérifier la remontée d'erreurs d'essai\n- [ ] Intégrer un outil d'analytics éthique (ex: Umami, Plausible ou Mixpanel sans cookies intrusifs)\n- [ ] Suivre la consommation des crédits de l'API Google Cloud Vision par utilisateur\n- [ ] Configurer des alertes de taux d'erreur élevés sur Stripe ou Supabase"
  },
  {
    "name": "💾 [Backup] Stratégie de Sauvegarde & Résilience",
    "desc": "Sécuriser les données sensibles de patrimoine de vos utilisateurs.\n\n### Liste de tâches :\n- [ ] Configurer des backups quotidiens automatisés de la base de données PostgreSQL de Supabase\n- [ ] Mettre en place une procédure claire de restauration de données validée en dev\n- [ ] Valider la synchronisation en temps réel des factures d'entretien sur le Supabase Storage privé\n- [ ] S'assurer que le script d'audit RLS (`npm run audit:rls`) renvoie un statut exit 0 à chaque build"
  }
];

function createCard(card) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: card.name,
      desc: card.desc,
      idList: LIST_ID,
      key: API_KEY,
      token: TOKEN
    });

    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path: '/1/cards',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Carte créée avec succès : ${card.name}`);
          resolve(JSON.parse(data));
        } else {
          console.error(`❌ Échec pour la carte : ${card.name} (Code: ${res.statusCode})`);
          reject(data);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Erreur réseau : ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log(`🚀 Début de l'import de ${cards.length} cartes de Backlog vers Trello...\n`);
  for (const card of cards) {
    try {
      await createCard(card);
      // Petite pause pour respecter les limites de taux de l'API Trello
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error("Une erreur est survenue lors de la création d'une carte.");
    }
  }
  console.log("\n🎉 Opération terminée !");
}

run();
