# Keeper — User Cases

Mise à jour : 2026-05-28 · Stack livrée : Next.js 14, Supabase, Stripe, Resend, Google Vision, Upstash Redis.

Ce document décrit les parcours réels supportés par le code en production. Chaque use case pointe vers les routes, server actions et tables Supabase concernées. Si une fonctionnalité n'est pas citée, c'est qu'elle n'est pas encore en prod.

---

## 1. Personas — segmentation onboarding

Les trois profils sont collectés à la première connexion ([app/[locale]/onboarding/OnboardingClient.tsx](app/%5Blocale%5D/onboarding/OnboardingClient.tsx)) et persistés dans `profiles.onboarding_persona`.

| Code | Label utilisateur | Cible business |
|---|---|---|
| `collector` | **Collectionneur passionné** | Véhicules de prestige, capital auto à valoriser |
| `daily` | **Conducteur exigeant (Daily)** | Trajets quotidiens, optimisation du coût au km |
| `fleet` | **Gestionnaire de flotte (PME)** | Plusieurs véhicules, rentabilité et fiscalité |

Trois objectifs croisent les personas (`profiles.onboarding_objective`) :
- `tco` — Réduire le coût au kilomètre
- `phm` — Anticiper les pannes (Prognostics & Health Management)
- `resale` — Certifier le carnet pour la revente

Une motorisation principale est collectée (`profiles.onboarding_motorization` : hybrid/electric/thermal) et oriente les calculs aval (intervalles d'entretien, mix énergétique).

---

## 2. User cases par persona

### 2.1 Le Collectionneur (`collector`)

**Job-to-be-done :** garder une trace certifiée et complète de chaque intervention sur ses voitures pour préserver la valeur à la revente.

| ID | User case | Route / action | Tables impactées |
|---|---|---|---|
| C-1 | **Ajouter une voiture en photographiant la carte grise** afin que la marque, le modèle, l'année et le VIN soient pré-remplis | [POST /api/vehicles/scan-carte-grise](app/api/vehicles/scan-carte-grise/route.ts) + onboarding step 4 | `vehicles` |
| C-2 | **Photographier la voiture** pour avoir une vignette nette dans le dashboard | [POST /api/upload/vehicle-photo](app/api/upload/vehicle-photo) + `Storage: vehicle-photos` | `vehicles.image_url` |
| C-3 | **Enregistrer chaque entretien chez un professionnel** dans un carnet immuable (hash-chained) impossible à falsifier | [server/actions/maintenance.ts:addMaintenanceAction](server/actions/maintenance.ts) | `maintenance_entries` (trigger `prevent_maintenance_update`) |
| C-4 | **Joindre la facture PDF** à chaque intervention pour preuve à la revente | `Storage: invoices` bucket | `maintenance_entries.invoice_url` |
| C-5 | **Exporter le carnet d'entretien complet** au moment de la revente | [GET /api/maintenance-log/export](app/api/maintenance-log/export) | `maintenance_entries` |
| C-6 | **Suivre la valeur de revente estimée** par véhicule, dérivée du prix d'achat et de l'âge | [app/[locale]/(app)/vehicles/[id]/page.tsx](app/%5Blocale%5D/%28app%29/vehicles/%5Bid%5D/page.tsx) | `vehicles.estimated_resale_value` |

### 2.2 Le Daily (`daily`)

**Job-to-be-done :** minimiser le coût au kilomètre et anticiper les pannes coûteuses.

| ID | User case | Route / action | Tables impactées |
|---|---|---|---|
| D-1 | **Scanner mes tickets carburant** au lieu de les saisir à la main | [POST /api/ocr](app/api/ocr/route.ts) → Google Vision DOCUMENT_TEXT_DETECTION | `fuel_entries` |
| D-2 | **Voir mon coût au km calculé automatiquement** sur 6 mois glissants | [lib/computations.ts:computeCostPerKm](lib/computations.ts) sur le dashboard | `fuel_entries`, `maintenance_entries`, `vehicles.insurance_monthly` |
| D-3 | **Recevoir une alerte avant une majoration d'amende** sur mes voitures | Carte `RegulatoryKpiCard` + cron daily | `traffic_fines` |
| D-4 | **Trouver une station carburant ou de recharge à proximité** | [app/[locale]/(app)/map](app/%5Blocale%5D/%28app%29/map) + Mapbox | `stations` |
| D-5 | **Voir mon mix énergétique** (part électrique vs thermique) pour suivre ma transition | [components/domain/energy-mix.tsx](components/domain/energy-mix.tsx) | `fuel_entries.energy_type` |
| D-6 | **Avoir un éco-score** qui matérialise ma conduite et débloque des promos partenaires | [app/[locale]/(app)/eco-score](app/%5Blocale%5D/%28app%29/eco-score) | calcul dérivé `fuel_entries` |

### 2.3 Le Fleet (`fleet`)

**Job-to-be-done :** maintenir la rentabilité d'un parc, anticiper la maintenance et l'impact réglementaire.

| ID | User case | Route / action | Tables impactées |
|---|---|---|---|
| F-1 | **Gérer plusieurs véhicules** avec un dashboard agrégé | [app/[locale]/(app)/dashboard/page.tsx](app/%5Blocale%5D/%28app%29/dashboard/page.tsx) | `vehicles` (N rows) |
| F-2 | **Connecter une box OBD-II** pour recevoir la télémétrie temps réel | [POST /api/telemetry/ingest](app/api/telemetry/ingest) | `obd_telemetry` |
| F-3 | **Faire tourner le moteur PHM** (Z-score sur RPM/load/MAF/coolant + dégradation linéaire des composants) pour estimer la Remaining Useful Life | [app/[locale]/(app)/maintenance/prognostics/[vehicleId]](app/%5Blocale%5D/%28app%29/maintenance/prognostics/%5BvehicleId%5D) | `obd_telemetry`, `phm_components` |
| F-4 | **Planifier les entretiens de chaque véhicule** avec rappel email J-7 + notification in-app | [components/domain/schedule-task-modal.tsx](components/domain/schedule-task-modal.tsx) + cron daily | `maintenance_tasks`, `in_app_notifications` |
| F-5 | **Voir l'indice réglementaire de la flotte** (amendes + points permis) sur le dashboard | [components/domain/regulatory-kpi-card.tsx](components/domain/regulatory-kpi-card.tsx) | `traffic_fines` |
| F-6 | **Suivre les abonnements** Premium / Family pour la facturation | [app/[locale]/(app)/settings/billing](app/%5Blocale%5D/%28app%29/settings/billing) + Stripe webhook | `subscriptions`, `profiles.plan_tier` |

---

## 3. User cases transverses (tous personas)

### 3.1 Authentification & sécurité

| ID | User case | Mécanisme livré |
|---|---|---|
| A-1 | **Créer un compte** avec un mot de passe robuste | [server/actions/auth.ts:signupAction](server/actions/auth.ts) + HIBP k-anonymity (`BREACH_THRESHOLD = 1`) |
| A-2 | **Se connecter sans craindre le credential stuffing** | Rate-limit double bucket email (5/15min) + IP (10/15min), constant-time delay 800ms |
| A-3 | **Recevoir un hCaptcha** après 3 échecs | [lib/security/hcaptcha.ts](lib/security/hcaptcha.ts) feature-flag |
| A-4 | **Activer la 2FA TOTP** | [app/[locale]/(app)/settings/security](app/%5Blocale%5D/%28app%29/settings/security) + Supabase MFA |
| A-5 | **Recevoir un mail "nouveau device détecté"** sur les nouveaux navigateurs | [lib/security/login-notifications.ts](lib/security/login-notifications.ts) + Resend |
| A-6 | **Voir et révoquer mes devices de confiance** | `trusted_devices` table, cookie `velo_device` SHA-256, expiration 180j |
| A-7 | **Se connecter via Google** | `signInWithProvider('google')` + callback dédié |
| A-8 | **Forcer la 2FA après 14j de grâce** | `MfaBanner` + redirect middleware sur `/settings/security?mfa-required=1` |

### 3.2 Vie privée & GDPR

| ID | User case | Mécanisme livré |
|---|---|---|
| G-1 | **Consentir aux cookies** (CNIL symétrique : accept / refuse égaux) | [components/cookie-banner.tsx](components/cookie-banner.tsx) modale centrée |
| G-2 | **Exporter toutes mes données en JSON** | [server/actions/gdpr.ts:exportUserDataAction](server/actions/gdpr.ts) |
| G-3 | **Supprimer définitivement mon compte** avec OTP 6 chiffres + phrase de confirmation | `requestAccountDeletionAction` + `deleteAccountAction` (15min TTL, cascade Stripe + Storage + DB) |
| G-4 | **Voir les notifications de mes connexions** dans un journal d'audit append-only | `auth_audit_logs` table + RLS + trigger immuabilité |

### 3.3 Notifications & rappels

| ID | User case | Mécanisme livré |
|---|---|---|
| N-1 | **Cloche dans le topbar** avec compteur d'unread, dropdown des 30 dernières | [components/layout/notification-bell.tsx](components/layout/notification-bell.tsx) |
| N-2 | **Rappel maintenance par email + in-app** à J-7, J-1 et J+1 si pas faite | [app/api/cron/maintenance-reminders/route.ts](app/api/cron/maintenance-reminders/route.ts) cron daily 0 5 * * * |
| N-3 | **Alerte amende avant majoration** sur le dashboard | `RegulatoryKpiCard` banner urgent |

### 3.4 Préférences & internationalisation

| ID | User case | Mécanisme livré |
|---|---|---|
| P-1 | **Choisir ma langue** (FR/EN/ES/AR/PT) | next-intl + `LocaleSwitcher` + persistance cookie + DB |
| P-2 | **Choisir ma devise** (EUR/USD/XOF/XAF/MAD/CAD/CHF) | `profiles.currency` |
| P-3 | **Basculer dark / light** | next-themes + Topbar toggle |
| P-4 | **Lecture droite-à-gauche en arabe** | `rtlLocales` dans routing |

### 3.5 Plans & monétisation

| ID | User case | Mécanisme livré |
|---|---|---|
| M-1 | **Essai Premium gratuit 14 jours** automatique au signup | `profile.isTrial` calculé sur `createdAt` |
| M-2 | **Souscrire Premium ou Family** en sortie d'essai | Stripe Checkout via [app/api/stripe/checkout](app/api/stripe/checkout) |
| M-3 | **Gérer mon abonnement** depuis le portail Stripe | [app/api/stripe/portal](app/api/stripe/portal) |
| M-4 | **OCR illimité en Premium**, quota 5/mois en Free | Gate dans `app/api/ocr/route.ts` |

---

## 4. Mapping use case → écran principal

```
LANDING (/) ────────────────────────── A-1, A-7
LOGIN (/login) ─────────────────────── A-2, A-3
SIGNUP (/signup) ───────────────────── A-1
ONBOARDING (/onboarding) ───────────── C-1, persona QCM
DASHBOARD (/dashboard) ─────────────── D-2, F-1, F-5, N-1, N-3
VEHICLES LIST (/vehicles) ──────────── F-1
VEHICLE DETAIL (/vehicles/[id]) ────── C-2, C-3, C-4, C-6
VEHICLE NEW (/vehicles/new) ────────── manual add fallback
MAINTENANCE PLAN ───────────────────── D-2 (IA plan), F-4 (planifier)
MAINTENANCE AGENDA ─────────────────── F-4, N-2
MAINTENANCE PROGNOSTICS ────────────── F-3
MAINTENANCE NEW ────────────────────── C-3
MAINTENANCE LOG ────────────────────── C-5
FUEL SCAN (/fuel/scan) ─────────────── D-1
MAP (/map) ─────────────────────────── D-4
ECO-SCORE (/eco-score) ─────────────── D-5, D-6
SETTINGS PROFILE ───────────────────── P-2, G-2, G-3
SETTINGS SECURITY ──────────────────── A-4, A-6, A-8
SETTINGS PREFERENCES ───────────────── P-1, P-3, P-4
SETTINGS NOTIFICATIONS ─────────────── N-1
SETTINGS BILLING ───────────────────── M-1, M-2, M-3
HELP CENTER (/help-center) ─────────── chatbot widget
```

---

## 5. Fonctionnalités livrées hors user case explicite

Ces capacités existent dans le code mais ne sont pas encore des parcours utilisateur autonomes :

- **OCR multi-régions de carte grise** : couvre EU harmonisé (1999/37/CE), UK V5C, Maghreb (MA/DZ/TN). Confidence score ≥30% pour pré-fill auto.
- **Vehicle lookup cascade** : Cache Redis (24h) → SIV France (si `SIV_API_KEY` posée) → DVLA UK → NHTSA. Aujourd'hui aucun provider SIV configuré, donc on tombe en mode OCR ou saisie.
- **Knowledge-base maintenance** : 7 catégories × {checklist 5-8 étapes, outils, difficulté DIY 1-5, durée minutes, tutoriel URL}. Embarquée dans la modale de planification.
- **Chatbot IA** : widget flottant sur toutes les pages, route `/api/chat`, knowledge-base interne sur Keeper.
- **PHM telemetry pipeline** : ingestion OBD, calcul Z-score, dégradation linéaire des composants, anomaly detection (rpm + load + maf).
- **Audit logs auth append-only** : trigger `prevent_auth_audit_mutation` autorise uniquement le cascade `SET user_id = NULL` à la suppression de compte.

---

## 6. Ce qui n'existe pas encore (gaps connus)

À ne PAS promettre commercialement tant que ce n'est pas livré :

- ❌ **Recherche d'amendes par plaque/VIN** auprès de l'ANTAI — impossible légalement (données pénales, art. 10 RGPD, pas d'API publique). Keeper fait du suivi déclaratif uniquement.
- ❌ **Web Push** sur mobile — pas implémenté ; les rappels passent par email + cloche in-app.
- ❌ **Export ICS** (calendrier Apple/Google) — endpoint à ajouter si demandé.
- ❌ **Apple Sign In** — code prêt mais feature-flag `NEXT_PUBLIC_APPLE_ENABLED` désactivé tant que le provider n'est pas configuré.
- ❌ **i18n complet sur le module amendes et l'agenda** — strings encore en français hardcoded dans les composants livrés.
- ❌ **Vue calendrier mensuelle** sur l'agenda maintenance — seule la vue liste par bucket est disponible.
- ❌ **OCR de PDF d'avis ANTAI** — l'endpoint `importFineFromAntaiPdfAction` est annoncé dans l'audit mais pas codé.

---

## 7. Couverture par couche technique

| Couche | État |
|---|---|
| Migrations SQL | 21 fichiers, dont 4 derniers (onboarding, fines, maintenance_tasks, in_app_notifications) appliqués sur Supabase remote |
| RLS policies | Activées sur toutes les tables utilisateur ; service_role pour les chemins admin (cron, cascade delete) |
| Server actions | 14 fichiers, chacun gated par `getUser()` + Zod validation |
| Tests unitaires Vitest | 116/116 verts (10 fichiers) |
| Tests E2E Playwright | Présents sur landing, auth-pages, i18n, stripe-gdpr |
| Build Next.js production | OK, 158 pages statiques + 21 routes dynamiques |
| Stripe | Checkout + portal + webhook + 4 price IDs configurés en test mode |
| Resend | Domaine `keeperapp.app` vérifié, SPF + DKIM + MX OK |
| Cron Vercel | 1 job actif : `maintenance-reminders` daily 05:00 UTC |
| Charte design | Slate Minimal Pro, Inter + JetBrains Mono pour chiffres, dark default |
