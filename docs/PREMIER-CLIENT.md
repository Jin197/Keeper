# Un premier client payant le 1er novembre 2026

Établi le 10 octobre. 22 jours. Une action par jour.

## Le problème arithmétique, d'abord

L'essai est un *reverse trial* de 30 jours sans carte (`lib/trial.ts`). Pour qu'une
expiration d'essai produise un paiement le 1er novembre, il aurait fallu une
inscription le **2 octobre**. C'est passé.

Trois leviers, par ordre de réalisme :

1. **Le dossier de vente certifié** — un achat unique, immédiat, sans essai. C'est
   le seul chemin qui ne dépend pas du calendrier. Cible : quelqu'un qui vend sa
   voiture ce mois-ci.
2. **Ramener l'essai à 14 jours.** Dernier jour utile d'inscription : 18 octobre.
   30 jours était arbitraire ; 14 est la norme SaaS. Rien n'est publié, donc le
   changement ne coûte rien aujourd'hui — il coûtera cher après le premier inscrit.
3. **Conversion anticipée** pendant l'essai. Possible, minoritaire. Ne pas compter
   dessus.

## Ce qui a changé de nature

La contrainte n'est plus technique. Le produit fonctionne : schéma, 331 549 lignes
de statistiques DVSA, inscription testée de bout en bout, build propre. **Ce qui
manque, c'est un site en ligne et des visiteurs.** Un premier client payant demande
grossièrement 200–300 visiteurs ciblés → 20–30 inscrits → 1–3 conversions.

## Le plan

### Mettre en ligne (10–15 octobre)

| Date | L'action unique du jour |
|---|---|
| **10** | Réveiller le projet Supabase (bouton *Restore*, il est en pause) **et** créer le compte Vercel |
| **11** | Pousser les 28 commits sur GitHub — ils n'existent que sur une machine |
| **12** | Déployer sur Vercel et saisir les 16 variables d'environnement |
| **13** | Pointer `keeperapp.app` (2 enregistrements DNS) + ajouter DMARC |
| **14** | Répétition complète sur l'URL de production : inscription → confirmation → véhicule → prévision. Corriger ce qui casse |
| **15** | Deux décisions produit : durée de l'essai, et le scan de ticket (configurer Google Vision ou retirer la promesse de la page d'accueil) |

### Rendre vendable (16–18 octobre)

| Date | |
|---|---|
| **16** | Activer le compte Stripe (le SIREN devrait être arrivé) |
| **17** | `npm run stripe:prices:apply` en test, achat avec la carte 4242, vérifier que `plan_tier` bascule |
| **18** | Passer Stripe en live. **À partir d'ici le produit encaisse.** |

### Trouver les premiers utilisateurs (19–27 octobre)

L'atout est la donnée. Personne d'autre n'a agrégé les 52 millions de contrôles
techniques britanniques par modèle. C'est un contenu qui se partage tout seul.

| Date | |
|---|---|
| **19** | Écrire l'article : « J'ai analysé tous les contrôles techniques de 2024 — voici ce qui lâche sur votre voiture ». Chiffres réels, graphiques réels |
| **20** | Le publier sur r/CarTalkUK |
| **21** | Le publier sur r/MechanicAdvice et r/UKPersonalFinance (angle coût) |
| **22** | Groupes Facebook propriétaires UK (Focus, Corsa, Golf — un par modèle couvert) |
| **23** | Forums spécialisés : PistonHeads, HonestJohn |
| **24** | Contacter 10 personnes qui ont posté « dois-je réparer ou vendre ? » et leur offrir le dossier |
| **25** | Version française : forums Caradisiac, groupes FB |
| **26** | Lire tous les retours, corriger le défaut le plus cité |
| **27** | Relancer les inscrits qui n'ont pas ajouté de véhicule |

### Convertir (28–31 octobre)

| Date | |
|---|---|
| **28** | Écrire à chaque inscrit individuellement. Demander ce qui manque |
| **29** | Corriger le blocage le plus fréquent |
| **30** | Proposer le dossier de vente à ceux qui vendent |
| **31** | Relance de fin d'essai pour la première cohorte |

## Les trois façons dont ça échoue

1. **La semaine 1 glisse.** Six jours de logistique étalés sur deux semaines, et il
   ne reste plus de temps pour trouver des gens. C'est le risque principal, et c'est
   ce qui vient de se produire sur la fenêtre du 1er octobre.
2. **Publier sans trafic.** Un site en ligne que personne ne visite ne produit rien.
   Les jours 19–27 comptent autant que les jours 10–18.
3. **Promettre le scan sans l'avoir.** La page d'accueil annonce « scannez un
   ticket » ; sans clé Google Vision la route renvoie une erreur. Trancher le 15.

## Honnêtement

Un premier client payant d'ici le 1er novembre, en partant de zéro audience, c'est
possible mais pas acquis. Le dossier de vente à l'unité est le pari le plus solide,
parce qu'il n'attend aucune fin d'essai.

Le résultat qui compte vraiment en novembre n'est pas « un abonné » mais « vingt
personnes qui utilisent le produit et disent pourquoi elles ne paient pas ».
