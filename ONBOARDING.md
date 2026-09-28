# Keeper — Onboarding backend

Ce guide te fait passer de "code prêt" à "tout fonctionne en prod" en 4 étapes :
1. **Supabase** (auth + DB + storage)
2. **Stripe** (abonnement Premium)
3. **Google Cloud Vision** (OCR tickets)
4. **Mapbox** (carte interactive — optionnel)

Compte ~30 minutes pour Supabase + Stripe en local, +20 min pour Google + Mapbox.

---

## 1. Supabase

### 1.1 Créer le projet
1. Va sur https://supabase.com/dashboard → **New project**
2. Nom : `keeper`. Région : `Europe (Frankfurt)` ou `Europe (Paris)` (RGPD)
3. Mot de passe DB : génère-en un fort, **note-le** (tu en auras besoin pour `supabase db push`)
4. Plan Free suffit pour démarrer

### 1.2 Récupérer les clés
Une fois le projet provisionné, va dans **Settings → API** :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (révéler) → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ jamais côté client)

Crée `.env.local` à la racine et colle ces 3 valeurs.

### 1.3 Lier le projet et appliquer les migrations
```bash
npx supabase login         # ouvre le navigateur
npx supabase link --project-ref TON_PROJECT_REF
npx supabase db push       # applique les 4 migrations dans supabase/migrations/
```

`TON_PROJECT_REF` se trouve dans l'URL Supabase (ex: `abcdef` dans `https://abcdef.supabase.co`).

### 1.4 Charger le seed (stations + garages publics)
```bash
npx supabase db execute --file supabase/seed.sql
```

(Ou copie-colle le contenu dans **SQL Editor → New query** de Supabase Studio.)

### 1.5 Configurer l'auth
Dans Supabase Studio → **Authentication → Providers** :
- **Email** : activé par défaut. Désactive `Confirm email` en dev.
- **Google** (optionnel) : suis https://supabase.com/docs/guides/auth/social-login/auth-google
- **Apple** (optionnel) : https://supabase.com/docs/guides/auth/social-login/auth-apple

Dans **Authentication → URL Configuration** :
- Site URL : `http://localhost:3000` (dev) puis `https://ton-domaine.com` (prod)
- Redirect URLs : ajoute `http://localhost:3000/auth/callback` et l'équivalent prod

### 1.6 Vérifier les buckets Storage
Toujours dans Studio → **Storage**, tu dois voir 4 buckets privés :
- `receipts` (5 MB max)
- `invoices` (10 MB max)
- `vehicle-photos` (5 MB max)
- `avatars` (2 MB max)

Si manquants, ré-exécute la migration `20260509120300_storage_buckets.sql`.

### 1.7 Tester
```bash
npm run dev
```
- Ouvre http://localhost:3000/signup
- Crée un compte. Tu dois être redirigé vers `/dashboard`
- Va dans `/vehicles/new`, ajoute un véhicule, vérifie qu'il apparaît dans `/vehicles`

---

## 2. Stripe

### 2.1 Créer le compte + clés test
1. https://dashboard.stripe.com → crée un compte
2. **Reste en mode test** pour le développement (toggle en haut à droite)
3. **Developers → API keys** :
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

### 2.2 Créer le produit + prix
1. **Products → Add product**
2. Name: `Keeper Premium`, Description: `OCR illimité, carnet certifié, export fiscal`
3. Pricing :
   - Prix mensuel récurrent **4.99 EUR / mois** → note l'ID `price_...`
   - **Add another price** : annuel **45.00 EUR / year** → note l'ID `price_...`
4. Colle ces deux IDs dans `.env.local` :
   - `STRIPE_PRICE_MONTHLY=price_...`
   - `STRIPE_PRICE_YEARLY=price_...`

### 2.3 Activer Stripe Tax (TVA UE/internationale)
- **More → Tax** → active Stripe Tax
- Configure les juridictions où tu vas vendre (au minimum FR et reste EU)

### 2.4 Configurer le Customer Portal
- **Settings → Billing → Customer portal**
- Active : `Allow customers to cancel`, `Update payment methods`, `View invoices`
- Save

### 2.5 Webhook — local (Stripe CLI)
```bash
brew install stripe/stripe-cli/stripe   # macOS
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
La CLI affiche un `whsec_...` → **copie-le dans `STRIPE_WEBHOOK_SECRET`**.
Garde la commande `stripe listen` tournante dans un terminal pendant que tu développes.

### 2.6 Webhook — prod (après déploiement)
1. **Developers → Webhooks → Add endpoint**
2. URL : `https://keeperapp.app/api/stripe/webhook` (ou votre domaine de production Vercel)
3. Events à écouter :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Le `Signing secret` affiché → c'est le `STRIPE_WEBHOOK_SECRET` de prod

### 2.7 Tester le checkout
- Connecte-toi à Keeper
- Va sur `/pricing`, clique "Essai 30 jours mensuel"
- Carte de test : `4242 4242 4242 4242`, exp future, CVC `123`
- Après checkout, retour sur `/settings/billing` → tu dois voir "Premium actif"

---

## 3. Google Cloud Vision (OCR)

### 3.1 Projet GCP + activation API
1. https://console.cloud.google.com → crée un projet `keeper`
2. **APIs & Services → Library** → cherche "Cloud Vision API" → **Enable**
3. **APIs & Services → Credentials → + Create credentials → Service account**
4. Nom : `keeper-vision`, role : `Cloud Vision API User`

### 3.2 Récupérer la clé JSON
1. Sur la page du service account créé → **Keys → Add Key → Create new key → JSON**
2. Le fichier se télécharge.
3. **Copie tout le contenu JSON sur une seule ligne** (un éditeur de code peut le faire).
4. Colle-le dans `.env.local` :
   ```
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   ```

### 3.3 Quotas et facturation
- Cloud Vision : 1 000 requêtes/mois gratuites, puis ~$1.50 / 1000
- Active la facturation sur le projet (sinon les API ne marchent pas même en gratuit)

### 3.4 Tester
- Dans Keeper, va sur `/fuel/scan`
- Prends une photo de ticket OU upload un fichier
- Vérifie que le formulaire se pré-remplit avec les valeurs extraites

---

## 4. Mapbox (optionnel)

1. https://account.mapbox.com → compte gratuit (50 000 chargements/mois)
2. **Tokens → Default public token** → copie-le dans `NEXT_PUBLIC_MAPBOX_TOKEN`
3. **Pour la prod** : crée un token restreint avec `URL restrictions` pour sécuriser vos quotas :
   - `https://keeperapp.app`
   - `https://*.keeperapp.app`
   - `http://localhost:*` (pour préserver le développement local)

La carte interactive activée Phase 4. Sans token, la page `/map` affiche un placeholder.

---

## 5. Vérification finale

Après avoir rempli `.env.local` :

```bash
npm run typecheck
npm run build
npm run dev
```

Parcours de validation :
- [ ] Signup → email confirmé → dashboard
- [ ] Ajout véhicule → visible dans la liste
- [ ] Scan ticket → OCR extrait les valeurs → dépense créée
- [ ] Ajout entretien → hash chaîné visible dans `/maintenance/log`
- [ ] Tentative `UPDATE` SQL sur `maintenance_entries` (Studio) → erreur du trigger
- [ ] Souscription Premium → webhook met à jour `plan_tier`
- [ ] Export PDF carnet (Premium uniquement) → fichier téléchargé
- [ ] Logout → redirect vers /login

---

## 6. Déploiement Vercel

1. Push sur GitHub
2. https://vercel.com → Import project
3. Framework: Next.js (auto-détecté)
4. **Environment Variables** : copie toutes les valeurs de `.env.local` (sauf laisse `NEXT_PUBLIC_APP_URL=https://ton-domaine.vercel.app`)
5. Deploy
6. Reviens sur Stripe → mets à jour le webhook prod (cf. 2.6)
7. Reviens sur Supabase → ajoute l'URL prod dans `Auth → URL Configuration`

---

## 7. Tests (Phase 5)

### 7.1 Tests unitaires (Vitest)
```bash
npm test            # one-shot
npm run test:watch  # mode watch en développement
npm run test:coverage
```
Couvre `lib/computations`, `lib/validators/*`, `lib/utils`, `lib/hash`. Passe sans aucune configuration externe.

### 7.2 Tests E2E (Playwright)
```bash
npx playwright install --with-deps   # une fois
npm run test:e2e                     # headless
npm run test:e2e:ui                  # mode UI debug
```
Couvre la landing, le routing i18n (FR/EN/AR/ES/PT + RTL), les pages d'auth, les pages légales, le pricing. Tourne contre `npm run dev` (auto-démarré). Aucune connexion Supabase requise pour ces flows UI.

### 7.3 Audit RLS (script Node)
Crée deux comptes de test dans Supabase (Studio → Authentication → Users → Add user), puis :
```bash
SUPABASE_TEST_USER_A_EMAIL=...
SUPABASE_TEST_USER_A_PASSWORD=...
SUPABASE_TEST_USER_B_EMAIL=...
SUPABASE_TEST_USER_B_PASSWORD=...
npm run audit:rls
```
Vérifie automatiquement que :
- B ne peut pas SELECT/UPDATE/DELETE les véhicules, fuel, maintenance de A
- A ne peut pas UPDATE/DELETE ses propres maintenance_entries (trigger d'immutabilité)
- Tout le monde peut lire les catalogues publics (stations, garages)

À lancer après chaque modification du schéma ou des policies, idéalement en CI.

---

## 8. Sécurité

### 8.1 Headers HTTP automatiques
[next.config.mjs](next.config.mjs) applique sur toutes les routes :
- `Strict-Transport-Security` (2 ans, preload)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (caméra autorisée pour OCR, géoloc pour la carte, micro bloqué)
- `Content-Security-Policy` strict listant Supabase, Stripe, Mapbox, Sentry

### 8.2 Sentry (optionnel, monitoring d'erreurs)
1. Crée un compte gratuit https://sentry.io et un projet `Next.js`
2. Récupère le DSN → colle dans `NEXT_PUBLIC_SENTRY_DSN`
3. Crée un auth token (Settings → Auth Tokens) → `SENTRY_AUTH_TOKEN`
4. Renseigne `SENTRY_ORG` et `SENTRY_PROJECT`
5. Au prochain build, source maps uploadées et erreurs trackées
6. Sans DSN, Sentry reste désactivé silencieusement

### 8.3 Checklist avant prod
- [ ] `service_role` jamais committé (vérifie `.gitignore`)
- [ ] Stripe en mode `live` (pas test) au moment du go-live
- [ ] Webhook Stripe avec signature vérifiée (déjà fait dans le code)
- [ ] RLS active : `npm run audit:rls` doit retourner exit 0
- [ ] CSP / headers : vérifier sur https://securityheaders.com (objectif A+)
- [ ] Sentry actif et capture d'une erreur de test
- [ ] Mentions légales complétées avec SIRET/RCS réels
- [ ] CGU + politique de confidentialité revues par un juriste

---

## 9. Déploiement Vercel

### 9.1 Première fois
1. Push sur GitHub (le repo doit être public ou connecté à Vercel)
2. https://vercel.com → Add New → Project → Import repo
3. Framework auto-détecté : Next.js. Région recommandée : **Frankfurt (fra1)**, fixée dans [vercel.json](vercel.json)
4. **Environment Variables** : colle TOUT le contenu de `.env.local` (sauf change `NEXT_PUBLIC_APP_URL` à ton URL Vercel ou ton domaine)
5. Click **Deploy**. Premier build ~3 min.

### 9.2 Post-deploy
1. Stripe Dashboard → Webhooks → modifie l'endpoint pour pointer vers `https://ton-domaine.vercel.app/api/stripe/webhook`
2. Supabase Studio → Auth → URL Configuration → ajoute :
   - Site URL : `https://ton-domaine.vercel.app`
   - Redirect URL : `https://ton-domaine.vercel.app/auth/callback`
3. Mapbox → Tokens → restreins ton token public au domaine prod
4. Si domaine custom : Vercel → Domains → ajoute ton domaine, met à jour les DNS

### 9.3 CI/CD (GitHub Actions)
[.github/workflows/ci.yml](.github/workflows/ci.yml) tourne sur chaque PR :
- `lint` + `typecheck` + `build`
- `vitest` (unit)
- `playwright` (E2E sur Chromium)

Vercel build se déclenche automatiquement après merge sur `main`.

---

## 10. Smoke test post-deploy

À faire systématiquement après chaque déploiement majeur :

- [ ] Landing FR (https://ton-domaine.com/) charge < 2s, Lighthouse SEO ≥ 90
- [ ] Switch vers `/en` → texte traduit, hreflang présents
- [ ] `/ar` → page entière en RTL
- [ ] `/sitemap.xml` retourne 30 URLs avec hreflang
- [ ] `/robots.txt` retourne les disallow attendus
- [ ] Signup avec email réel → email de confirmation reçu
- [ ] Ajout véhicule depuis `/vehicles/new` → apparaît dans la liste
- [ ] Scan d'un vrai ticket → OCR pré-remplit le formulaire
- [ ] Ajout entretien → hash visible dans `/maintenance/log`
- [ ] Souscription Premium en mode **test** Stripe (carte 4242…) → `plan_tier=premium` dans `profiles`
- [ ] Export PDF carnet → fichier reçu, hash visible dans le PDF
- [ ] Bannière cookies s'affiche au premier visit puis disparaît après accept
- [ ] DevTools → Network → vérifie que CSP est appliquée et qu'aucune erreur CSP n'apparaît en console
- [ ] securityheaders.com retourne ≥ A
- [ ] Logout → retour sur `/login`

Si tout est vert, tu es en prod. Bon lancement.
