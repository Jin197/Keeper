# 📖 Guide d'Utilisation & Cas d'Usage (Use Cases) · Keeper

Ce document détaille le fonctionnement opérationnel de **Keeper** (l'instrument financier de gestion de patrimoine automobile) et formalise les cas d'utilisation clés permettant d'extraire la rentabilité maximale de votre capital roulant.

---

## 🏎️ 1. Introduction à Keeper

**Keeper** n'est pas une simple application de suivi de factures ou d'essence. C'est un **tableau de bord analytique et décisionnel** qui aborde votre véhicule comme un actif financier de valeur. 

Sa mission est double :
1. **Minimiser le TCO** (*Total Cost of Ownership* / Coût Total de Possession) par l'analyse et la prédiction.
2. **Maximiser la valeur de revente** par la preuve cryptographique et l'immutabilité du suivi.

---

## 🛠️ 2. Guide d'Utilisation Pas-à-Pas

### Étape 1 : Création de compte et Démarrage
1. Rendez-vous sur la Landing Page (aux couleurs de la charte **Preset A — L'Atelier Carbone**).
2. Cliquez sur le bouton principal **"Optimiser mon Patrimoine"** ou **"Démarrer gratuitement"**.
3. Saisissez votre Nom Complet, Email et Mot de passe. Choisissez votre **Pays** et votre **Devise**.
4. **Période d'Essai Inversée (Reverse Trial 14j sans CB)** : À la création de votre compte, vous bénéficiez **automatiquement de 14 jours d'accès complet et gratuit à toutes les fonctionnalités Premium** (scan OCR illimité, Chat IA, etc.) sans entrer de coordonnées bancaires.
5. Un compteur dynamique dans votre barre latérale indique le nombre de jours restants. Si vous approchez de la fin de la période (J-2 ou moins), un bandeau d'alerte orange visible en haut de l'écran vous guidera pour activer votre abonnement Stripe définitif sans interruption.
6. **Réinitialisation en cas d'oubli** : Si vous perdez votre mot de passe, cliquez sur **"Mot de passe oublié ?"** sur la page de connexion. Renseignez votre email pour recevoir un lien de réinitialisation sécurisé par email. En cliquant sur le lien reçu, vous serez automatiquement connecté et redirigé vers l'écran premium dédié `/reset-password` pour enregistrer un nouveau mot de passe robuste et accéder instantanément à votre tableau de bord.


### Étape 2 : Enregistrement d'un véhicule (Plaque-Driven ou Mode Démo)
1. **Saisie Ultra-Rapide (Plaque + Kilométrage)** : Allez dans l'onglet **Véhicules** et cliquez sur **Ajouter un véhicule**. Au lieu de remplir 13 champs fastidieux, saisissez uniquement **votre Plaque d'immatriculation** (FR/UK/etc.) et **votre Kilométrage actuel**.
2. **Cascade intelligente et SIV** : En perdant le focus ou en validant la saisie, l'API de lookup officielle SIV/DVLA (ou NHTSA en repli) est interrogée en tâche de fond pour auto-remplir la Marque, le Modèle, le VIN, l'Année et la motorisation. Les autres champs optionnels sont configurés avec des valeurs par défaut intelligentes dans un volet expandable animé avec Framer Motion.
3. **Mode Démo Instantané (Aha Moment < 2s)** : Si vous n'avez pas de véhicule sous la main, cliquez simplement sur le bouton **"Activer le Mode Démo"** dans le tableau de bord vide. Une action serveur génère instantanément :
   - Une **Tesla Model 3** et une **Porsche 911** classiques dans votre garage.
   - **12 factures de recharges/carburants** sur l'année écoulée.
   - **3 interventions de maintenance certifiées** chaînées via hash **SHA-256**.
   - **2 alertes prédictives PHM** (Weibull) actives pour tester immédiatement la plateforme.


### Étape 3 : Suivi automatisé des dépenses par OCR
1. Lorsque vous effectuez un plein de carburant, une recharge électrique ou recevez une facture d'entretien, rendez-vous dans le module **Scanner**.
2. Chargez une photo, un scan de reçu ou un document **PDF** (jusqu'à 5 Mo).
3. L'API **Google Cloud Vision** extrait en temps réel :
   - Le montant TTC et le taux de taxe (TVA).
   - Le volume physique de carburant (L) ou la quantité d'électricité (kWh).
   - Le nom de l'établissement et sa localisation géographique.
   - La date et le kilométrage actuel du véhicule.
4. Validez le formulaire pré-rempli. Vos calculs de TCO et mix énergétiques sont mis à jour instantanément.

### Étape 4 : Suivi du TCO & Mix Énergétique
1. Consultez le **Tableau de bord financier**.
2. La formule de TCO au kilomètre analyse vos dépenses réelles en temps réel :
   $$\text{Coût/Km} = \frac{\text{Dépenses Énergétiques} + \text{Frais de Maintenance} + \text{Assurance Amortie}}{\text{Distance Parcourue}}$$
3. Visualisez les graphiques dynamiques interactifs (construits avec *Recharts*) comparant votre coût d'usage réel par rapport aux moyennes de dépréciation du marché.
4. Si vous possédez un véhicule hybride, analysez votre **Mix Énergétique** physique et financier pour optimiser vos cycles de recharge électrique par rapport au carburant fossile.

### Étape 5 : Certification cryptographique du Carnet
1. Chaque fois qu'une intervention d'entretien est validée, le protocole de **Carnet Certifié** s'active.
2. L'application calcule une signature numérique unique **SHA-256** qui lie de manière immuable l'intervention actuelle à la précédente.
3. Les verrous de sécurité **RLS** PostgreSQL et les triggers serveurs interdisent toute modification ou suppression ultérieure de l'historique d'entretien (impossibilité de frauder sur le kilométrage ou de masquer un sinistre).
4. Lors de la revente, téléchargez en un clic l'**Export Certifié PDF** avec filigrane officiel et signature cryptographique à présenter à l'acheteur ou à votre assureur.

### Étape 6 : Télémétrie, Maintenance Prédictive (PHM) & Itinéraires de Proximité
1. Si votre véhicule est lié par télémétrie ou OBD, le module **PHM** (*Prognostics and Health Management*) surveille l'usure mécanique en temps réel.
2. Il utilise des modèles de survie industrielle de **Weibull** pour évaluer la Durée de Vie Utile Restante (*RUL*) des composants critiques (Freins, Pneus, Fluides, Batterie).
3. Un code couleur clair (Vert = Excellent, Orange = Usure modérée, Rouge = Remplacement imminant) vous indique l'état d'usure calculé.
4. En cas de besoin d'entretien ou d'usure prononcée, vous pouvez générer en un clic des **itinéraires de guidage précis vers les professionnels de l'automobile à proximité immédiate** (garages, réparateurs, stations-service et bornes de recharge) directement redirigés vers Google Maps.
5. Pas besoin de partenariats : vous visualisez de manière neutre et transparente tous les professionnels autour de vous et êtes guidé instantanément.


---

## 📊 3. Cas d'Utilisation Structurés (Use Cases)

```mermaid
usecaseDiagram
    actor Conducteur as "Conducteur / Investisseur"
    actor Admin as "Système / Admin"
    actor Stripe as "Stripe Billing"
    actor GCPVision as "Google Cloud Vision"

    Conducteur --> (UC-1: Enregistrer un Actif Roulant)
    Conducteur --> (UC-2: Scanner un Reçu via OCR)
    Conducteur --> (UC-3: Consulter le Dashboard TCO)
    Conducteur --> (UC-4: Générer un Carnet Certifié)
    Conducteur --> (UC-5: Gérer l'Abonnement Stripe)

    (UC-1: Enregistrer un Actif Roulant) ..> (Lookup Plaque) : <<include>>
    (UC-2: Scanner un Reçu via OCR) --> GCPVision : Utilise
    (UC-5: Gérer l'Abonnement Stripe) --> Stripe : Traite
```

### 📋 UC-1 : Enregistrement d'un nouvel actif roulant (Véhicule)
* **Acteur Principal** : Conducteur / Investisseur
* **Description** : Permet à l'utilisateur d'ajouter un véhicule à son portefeuille d'actifs en saisissant uniquement sa plaque d'immatriculation.
* **Préconditions** : 
  - L'utilisateur est authentifié sur son compte Keeper.
  - Le plan d'abonnement actuel de l'utilisateur autorise l'ajout d'un véhicule supplémentaire (Standard = 1, Premium = Illimité).
* **Flux Principal (Nominal)** :
  1. L'utilisateur clique sur "Ajouter un véhicule".
  2. L'utilisateur saisit le numéro d'immatriculation (ex: `AA-123-AA`) et sélectionne le pays d'immatriculation.
  3. Le système interroge le cache Redis local (données déjà recherchées).
  4. Le système interroge l'API officielle SIV/DVLA et récupère le modèle, le VIN, la motorisation, et l'année.
  5. Le système pré-remplit instantanément la fiche technique du véhicule à l'écran.
  6. L'utilisateur vérifie et clique sur "Valider".
  7. Le véhicule est enregistré en base de données avec application immédiate des règles d'isolation **RLS** (visible uniquement par son propriétaire).
* **Flux Alternatifs** :
  - *Flux A (Cache manquant & API externe ok)* : Les données ne sont pas dans Redis. L'API externe répond avec succès, le système met en cache les résultats dans Redis pour 30 jours, puis pré-remplit la fiche.
  - *Flux B (API externe indisponible ou plaque non trouvée)* : L'API ne répond pas. Le système affiche un formulaire vierge. L'utilisateur saisit manuellement les caractéristiques techniques du véhicule et valide.
* **Postconditions** : Le véhicule est associé de manière permanente au compte de l'utilisateur. Le tableau de bord analytique initialise les métriques de TCO spécifiques à ce modèle.

---

### 📋 UC-2 : Saisie automatisée et intelligente des dépenses (OCR)
* **Acteur Principal** : Conducteur / Investisseur
* **Acteurs Secondaires** : API Google Cloud Vision (GCP)
* **Description** : Automatisation de la saisie d'un ticket de carburant ou d'une recharge électrique par reconnaissance d'image pour alimenter le TCO.
* **Préconditions** :
  - Le véhicule cible est déjà enregistré dans le compte.
  - L'utilisateur dispose de crédits de scan (plan Standard = 3 restants / Premium = illimité).
* **Flux Principal (Nominal)** :
  1. L'utilisateur clique sur "Saisir une dépense" puis sélectionne "Scanner un ticket/PDF".
  2. L'utilisateur télécharge ou prend en photo le reçu.
  3. Le système détecte le format du fichier (JPG/PNG ou PDF).
  4. Le système envoie le document à l'API Google Cloud Vision (méthode synchrone pour les images, batch synchrone pour les PDF).
  5. Le système extrait les mots-clés financiers : Total TTC, Volume (Litres), Énergie (kWh), Nom de la station, Code Postal (Ville) et Date.
  6. Le système affiche à l'utilisateur un formulaire pré-rempli avec les données extraites.
  7. L'utilisateur vérifie les informations, associe la dépense au véhicule et clique sur "Confirmer".
  8. L'entrée de dépense est validée, stockée en base de données chiffrée, et la facture est archivée de manière sécurisée dans le compartiment de stockage Supabase.
* **Flux Alternatifs** :
  - *Flux A (Scan illisible)* : L'OCR ne parvient pas à lire les chiffres financiers. Le système remonte un message d'avertissement et invite l'utilisateur à remplir manuellement le formulaire pré-rempli vide.
  - *Flux B (Limite de crédit atteinte)* : L'utilisateur est en plan Standard et a consommé ses 3 scans mensuels. Le système bloque le scan et affiche une fenêtre d'incitation à l'upgrade vers le plan Premium.
* **Postconditions** : La dépense est loggée. L'historique d'audit immuable (`audit_logs`) enregistre l'usage du scan OCR. Le TCO au kilomètre et le mix énergétique du véhicule sont recalculés en arrière-plan.

---

### 📋 UC-3 : Revente optimisée avec Carnet d'Entretien Certifié immuable
* **Acteur Principal** : Conducteur / Investisseur (Vendeur)
* **Acteurs Secondaires** : Acheteur potentiel
* **Description** : Génération d'un rapport de suivi historique certifié cryptographiquement pour prouver l'entretien réel d'un véhicule et justifier un prix de vente supérieur sur le marché de l'occasion.
* **Préconditions** :
  - Le véhicule possède des entrées de maintenance préalablement enregistrées.
  - L'utilisateur possède un abonnement Premium ou Family/Pro actif.
* **Flux Principal (Nominal)** :
  1. L'utilisateur se rend dans la section "Carnet d'entretien" de son véhicule de collection ou premium.
  2. L'utilisateur clique sur "Générer le Carnet Certifié PDF".
  3. Le système vérifie l'intégrité de la chaîne cryptographique (vérification que chaque hash SHA-256 d'intervention correspond bien aux données réelles et que la chaîne n'a subie aucune altération manuelle en base de données).
  4. Le système compile l'ensemble de l'historique d'entretien (dates, kilométrages, natures des travaux, montants) dans un document PDF premium avec filigrane officiel "Keeper Verified".
  5. Le système signe numériquement le PDF et génère un QR Code de validation publique.
  6. L'utilisateur télécharge le rapport et le transmet à l'acheteur potentiel.
  7. L'acheteur scanne le QR Code et accède à la page de validation publique hébergée par Keeper, confirmant l'authenticité absolue des factures présentées.
* **Flux Alternatifs** :
  - *Flux A (Détection de fraude ou de rupture d'intégrité)* : Si une modification directe a été tentée sur la base de données sans passer par le protocole sécurisé, le calcul de validation SHA-256 échoue. Le système refuse la génération du carnet et lève une alerte de sécurité critique de priorité maximale vers le système d'audit.
* **Postconditions** : L'utilisateur dispose d'un document légal et irréfutable attestant de la qualité de suivi de son actif, augmentant sa valeur de revente de 10% à 15% par rapport aux véhicules sans traçabilité claire.

---

### 📋 UC-4 : Auto-gestion de l'abonnement et facturation conforme (Stripe & GDPR)
* **Acteur Principal** : Conducteur / Investisseur
* **Acteurs Secondaires** : Stripe Billing API, Supabase Admin (GDPR)
* **Description** : Permet à l'utilisateur de gérer de façon totalement autonome ses informations bancaires, de modifier sa formule d'abonnement, de télécharger ses reçus conformes à la TVA locale, ou de faire valoir ses droits RGPD d'accès et de suppression de données.
* **Préconditions** :
  - L'utilisateur possède un compte actif.
* **Flux Principal (Nominal)** :
  1. L'utilisateur se rend dans l'onglet **Paramètres** puis clique sur **Sécurité & Données** ou **Abonnement**.
  2. *Pour l'abonnement* : L'utilisateur clique sur "Gérer mon abonnement". Il est redirigé de manière sécurisée vers le portail client hébergé de **Stripe**.
  3. L'utilisateur télécharge les factures avec calcul de TVA (*Stripe Tax*) ou change son plan mensuel en plan annuel pour profiter de la remise de -25%.
  4. *Pour ses données (RGPD)* : L'utilisateur clique sur **"Exporter mes données"**. Le système compile instantanément toutes ses données de profil, véhicules, scans, dépenses et logs d'audit dans un fichier JSON structuré téléchargeable en local.
  5. *Pour la suppression (Droit à l'oubli)* : L'utilisateur clique sur **"Supprimer mon compte"**. Une modale d'avertissement s'affiche. Après confirmation, le système appelle l'action serveur administrative, supprime l'utilisateur de Supabase Auth, et propage la suppression en cascade sur l'ensemble de ses données associées (profil, véhicules, factures de stockage).
* **Flux Alternatifs** :
  - *Flux A (Résiliation d'abonnement)* : L'utilisateur annule son abonnement Pro sur le portail Stripe. L'abonnement reste actif jusqu'à la fin de la période de facturation en cours, puis le compte repasse automatiquement au niveau standard.
* **Postconditions** : Les droits RGPD et de facturation de l'utilisateur sont respectés de manière autonome, transparente et sécurisée.

---

## 🔒 4. Rigueur Fiscale & Conformité Légale

> [!IMPORTANT]
> [!IMPORTANT]
> **Bannière cookies CNIL et conformité RGPD**
> La `CookieBanner` de Keeper respecte scrupuleusement les exigences de la CNIL française et du RGPD. Les boutons **"Tout accepter"** et **"Refuser tout"** sont présentés avec la **même importance visuelle et ergonomique** (sélecteurs de taille et contraste équivalents) pour garantir un choix libre et sans incitation.
>
> Une ligne de mention de transparence avec le mail du DPO de la marque (`dpo@keeperapp.app`) est affichée de manière lisible et localisée dans les 5 langues principales.
> Par défaut, tous les scripts de traçage tiers de performance (comme Plausible) sont **strictement bloqués** tant que l'utilisateur n'a pas manifesté un consentement explicite par clic.

