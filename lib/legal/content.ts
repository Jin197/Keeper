/**
 * The four legal documents, in English and French.
 *
 * Kept as data rather than JSX so the two languages sit side by side and can't
 * drift, and so the facts they state are in one place. Everything here
 * describes what the app actually does at launch (see docs/LAUNCH.md):
 * two tiers, a one-off dossier, 14-day trial, 10-character passwords, the
 * public data sources, and the affiliate links we now show.
 */

export type Lang = 'en' | 'fr';

export interface Article {
  title: string;
  /** Paragraphs; a string[] item renders as a bullet list. */
  body: (string | string[])[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  articles: Article[];
}

type Bilingual<T> = Record<Lang, T>;

// ── Terms of service ─────────────────────────────────────────────────
export const TERMS: Bilingual<LegalDoc> = {
  en: {
    title: 'Terms of service',
    intro: 'These terms govern your use of Keeper. They apply to adults using the service for their own vehicles.',
    articles: [
      {
        title: 'What the service is',
        body: [
          'Keeper is a web application that helps a private car owner understand and reduce what their vehicle costs: cost per kilometre from scanned receipts, a maintenance forecast, reminders, the cheapest fuel nearby where a public price feed exists, and an exportable service record.',
          'Creating an account means you accept these terms and the privacy policy.',
          'Keeper is an information tool. It is not a garage, not an insurer, not a broker, and it does not inspect your vehicle.',
        ],
      },
      {
        title: 'Your account',
        body: [
          'You need a valid email address and a password of at least 10 characters including upper case, lower case and a digit. You may also sign in with Google or Apple, in which case the security of that account is your responsibility.',
          'You must be of legal age and give accurate information. We may suspend an account used fraudulently or abusively, or in breach of these terms.',
          'You can enable two-factor authentication at any time in Settings → Security, and we recommend it.',
        ],
      },
      {
        title: 'Plans, trial and cancellation',
        body: [
          'Two plans: Free (one vehicle, three receipt scans a month, cost per km, reminders) and Pro (unlimited vehicles and scans, the full maintenance forecast, known-fault data, the certified sale dossier, tax-ready export). A certified sale dossier for a single vehicle can also be bought once, without a subscription.',
          'New accounts get 14 days with every Pro feature, without a card. Prices are shown before you pay and vary by country; taxes are calculated by Stripe for your country.',
          'Payment is handled by Stripe. We never see or store your card details.',
          'You can cancel at any time in Settings → Subscription. You keep Pro until the end of the period already paid for; we do not pro-rate a part-used period. A one-off dossier purchase is not a subscription and is not refundable once the PDF has been generated, except where the law says otherwise.',
        ],
      },
      {
        title: 'What the forecast is, and is not',
        body: [
          'The maintenance forecast combines three things, and each item in the app says which one it came from: the manufacturer service interval for your model, the services you logged yourself, and — where we have it — official public data (UK MOT test history, safety recalls and owner complaints from the US database, aggregated MOT failure statistics).',
          'Population statistics describe other cars of the same model. "31% of this model fail on brakes at your mileage" is not a statement about your car. Manufacturer intervals we have not yet verified against the handbook are labelled as such.',
          'The forecast is an estimate. It does not replace a roadworthiness test, a mechanic\'s inspection or the manufacturer\'s own schedule. You remain responsible for keeping your vehicle legal and safe.',
        ],
      },
      {
        title: 'Certified service record',
        body: [
          'Each service you log is signed with a SHA-256 hash chained to the previous entry, and the database rejects edits and deletions. This makes tampering detectable: a modified or removed entry breaks the chain, and the exported PDF says whether the chain is intact.',
          'This is technical evidence of integrity, not a notarised document and not a certificate of roadworthiness. It proves that what you entered has not been altered since — not that what you entered was true.',
          'You are responsible for what you enter. Deliberately entering false service history to inflate a resale price is fraud, and is a breach of these terms.',
        ],
      },
      {
        title: 'Partner links and how we make money',
        body: [
          'Our revenue comes from Pro subscriptions, the one-off dossier, and referral commissions. When a maintenance item is due we may show a link to a parts retailer, and before your insurance renews we may show a link to a comparison site. If you buy through such a link we may receive a commission, at no extra cost to you.',
          'These links never change what the forecast says. We do not sell your personal data, and we do not show advertising.',
        ],
      },
      {
        title: 'Your obligations',
        body: [
          'You agree not to: use the service for a vehicle you have no right to look up; attempt to extract our data in bulk or scrape it; probe, overload or circumvent our rate limits and security; or resell access to the service.',
          'Vehicle lookups are rate-limited. Registration data is retrieved from official sources for the vehicle you identify, and only technical data is stored — never the registered keeper\'s name or address.',
        ],
      },
      {
        title: 'Intellectual property',
        body: [
          'The application, its code, design and content are ours or our licensors\'. Your data stays yours: you can export it at any time, and deleting your account deletes it.',
          'Public data we display remains under its own licence — UK MOT data and statistics under the Open Government Licence, US recall and complaint data as US public domain, fuel prices under the licence of each national feed. Each source is named where it is shown.',
        ],
      },
      {
        title: 'Liability',
        body: [
          'We provide the service with reasonable care but cannot guarantee it is uninterrupted or error-free, nor that a third-party source (a government API, a price feed, a payment provider) is available, complete or accurate at any moment.',
          'We are not liable for a mechanical failure, a failed roadworthiness test, a fine, or any loss resulting from a decision you took on the basis of an estimate in the app. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence, or for fraud.',
          'If we are liable for something else, our total liability is limited to what you paid us in the twelve months before the event.',
        ],
      },
      {
        title: 'Changes and termination',
        body: [
          'We may change these terms; material changes are announced by email or in the app at least 30 days before they take effect. Continuing to use the service after that means you accept them. If you do not, you can cancel and delete your account.',
          'You can delete your account at any time in Settings → Profile. We may terminate an account for a serious breach of these terms, with notice unless the breach makes that impossible.',
        ],
      },
      {
        title: 'Law, disputes and consumer rights',
        body: [
          'These terms are governed by the law of the country in which the publisher is established (see the imprint), without depriving you of the protection of the consumer law of your own country of residence.',
          'If you are a consumer in the EU or the UK you have a statutory right to withdraw from a distance contract within 14 days. Where you ask us to start a digital service immediately — which is what starting the trial or a subscription does — that right ends once the service has been fully supplied. We will always try to settle a complaint directly first: write to the contact address in the imprint.',
        ],
      },
    ],
  },
  fr: {
    title: "Conditions générales d'utilisation",
    intro: "Les présentes conditions régissent votre utilisation de Keeper. Elles s'appliquent aux personnes majeures utilisant le service pour leurs propres véhicules.",
    articles: [
      {
        title: 'Objet du service',
        body: [
          "Keeper est une application web qui aide un particulier à comprendre et réduire ce que sa voiture lui coûte : coût au kilomètre à partir de tickets scannés, prévision d'entretien, rappels, carburant le moins cher à proximité là où un flux public de prix existe, et un carnet d'entretien exportable.",
          "Créer un compte vaut acceptation des présentes conditions et de la politique de confidentialité.",
          "Keeper est un outil d'information. Ce n'est ni un garage, ni un assureur, ni un courtier, et il n'inspecte pas votre véhicule.",
        ],
      },
      {
        title: 'Votre compte',
        body: [
          "Il faut une adresse email valide et un mot de passe d'au moins 10 caractères comprenant une majuscule, une minuscule et un chiffre. La connexion via Google ou Apple est possible ; la sécurité de ce compte tiers relève alors de votre responsabilité.",
          "Vous devez être majeur et fournir des informations exactes. Nous pouvons suspendre un compte utilisé de manière frauduleuse ou abusive, ou en violation des présentes conditions.",
          "Vous pouvez activer la double authentification à tout moment dans Réglages → Sécurité, et nous le recommandons.",
        ],
      },
      {
        title: 'Offres, essai et résiliation',
        body: [
          "Deux offres : Gratuit (un véhicule, trois scans de tickets par mois, coût au km, rappels) et Pro (véhicules et scans illimités, prévision d'entretien complète, données de pannes connues, dossier de vente certifié, export fiscal). Le dossier de vente certifié d'un véhicule peut aussi être acheté à l'unité, sans abonnement.",
          "Tout nouveau compte bénéficie de 14 jours avec l'ensemble des fonctions Pro, sans carte bancaire. Les prix sont affichés avant paiement et varient selon le pays ; les taxes sont calculées par Stripe selon votre pays.",
          "Le paiement est traité par Stripe. Nous ne voyons ni ne conservons vos données bancaires.",
          "Vous pouvez résilier à tout moment dans Réglages → Abonnement. Vous conservez Pro jusqu'à la fin de la période déjà payée ; une période entamée n'est pas remboursée au prorata. L'achat d'un dossier à l'unité n'est pas un abonnement et n'est pas remboursable une fois le PDF généré, sauf disposition légale contraire.",
        ],
      },
      {
        title: "Ce que la prévision est, et ce qu'elle n'est pas",
        body: [
          "La prévision d'entretien combine trois choses, et chaque élément affiché indique laquelle : l'intervalle constructeur de votre modèle, les entretiens que vous avez enregistrés, et — quand nous en disposons — des données publiques officielles (historique des contrôles MOT britanniques, rappels de sécurité et plaintes de propriétaires de la base américaine, statistiques agrégées d'échec au contrôle).",
          "Les statistiques de population décrivent d'autres voitures du même modèle. « 31 % de ce modèle échouent sur les freins à votre kilométrage » n'est pas une affirmation sur votre voiture. Les intervalles constructeur que nous n'avons pas encore vérifiés dans le carnet sont signalés comme tels.",
          "La prévision est une estimation. Elle ne remplace ni le contrôle technique, ni le diagnostic d'un mécanicien, ni le carnet du constructeur. Vous restez responsable de la conformité et de la sécurité de votre véhicule.",
        ],
      },
      {
        title: "Carnet d'entretien certifié",
        body: [
          "Chaque entretien enregistré est signé par un hash SHA-256 chaîné à l'entrée précédente, et la base de données rejette les modifications et suppressions. Toute altération devient détectable : une entrée modifiée ou retirée brise la chaîne, et le PDF exporté indique si la chaîne est intacte.",
          "C'est une preuve technique d'intégrité, pas un acte notarié ni un certificat de conformité. Cela prouve que ce que vous avez saisi n'a pas été altéré depuis — pas que ce que vous avez saisi était exact.",
          "Vous êtes responsable de ce que vous saisissez. Renseigner sciemment un faux historique pour gonfler un prix de revente est une fraude et une violation des présentes conditions.",
        ],
      },
      {
        title: 'Liens partenaires et modèle économique',
        body: [
          "Nos revenus proviennent des abonnements Pro, du dossier à l'unité et de commissions d'apport. Quand un entretien arrive à échéance, nous pouvons afficher un lien vers un vendeur de pièces ; avant l'échéance de votre assurance, un lien vers un comparateur. Si vous achetez via un tel lien, nous pouvons percevoir une commission, sans surcoût pour vous.",
          "Ces liens ne modifient jamais le contenu de la prévision. Nous ne vendons pas vos données personnelles et n'affichons aucune publicité.",
        ],
      },
      {
        title: 'Vos obligations',
        body: [
          "Vous vous engagez à ne pas : utiliser le service pour un véhicule que vous n'avez pas le droit de consulter ; extraire massivement ou aspirer nos données ; sonder, surcharger ou contourner nos limitations de débit et nos protections ; ou revendre l'accès au service.",
          "Les recherches de véhicule sont limitées en débit. Les données d'immatriculation sont obtenues auprès de sources officielles pour le véhicule que vous identifiez, et seules les données techniques sont conservées — jamais le nom ni l'adresse du titulaire.",
        ],
      },
      {
        title: 'Propriété intellectuelle',
        body: [
          "L'application, son code, son design et ses contenus nous appartiennent ou appartiennent à nos concédants. Vos données restent les vôtres : vous pouvez les exporter à tout moment, et la suppression de votre compte les supprime.",
          "Les données publiques affichées restent sous leur propre licence — données et statistiques MOT britanniques sous Open Government Licence, rappels et plaintes américains dans le domaine public américain, prix des carburants sous la licence de chaque flux national. Chaque source est nommée à l'endroit où elle est affichée.",
        ],
      },
      {
        title: 'Responsabilité',
        body: [
          "Nous fournissons le service avec un soin raisonnable mais ne pouvons garantir son fonctionnement ininterrompu ni exempt d'erreur, ni qu'une source tierce (API publique, flux de prix, prestataire de paiement) soit disponible, complète ou exacte à un instant donné.",
          "Nous ne sommes pas responsables d'une panne mécanique, d'un échec au contrôle technique, d'une amende, ni d'un préjudice résultant d'une décision que vous auriez prise sur la base d'une estimation de l'application. Rien dans les présentes conditions ne limite une responsabilité qui ne peut l'être légalement, notamment en cas de dommage corporel causé par une négligence ou en cas de fraude.",
          "Pour le reste, notre responsabilité totale est limitée aux sommes que vous nous avez versées durant les douze mois précédant le fait générateur.",
        ],
      },
      {
        title: 'Modifications et résiliation',
        body: [
          "Nous pouvons modifier les présentes conditions ; toute modification substantielle est annoncée par email ou dans l'application au moins 30 jours avant son entrée en vigueur. Continuer à utiliser le service après cette date vaut acceptation. À défaut, vous pouvez résilier et supprimer votre compte.",
          "Vous pouvez supprimer votre compte à tout moment dans Réglages → Profil. Nous pouvons résilier un compte en cas de manquement grave, avec préavis sauf si le manquement l'empêche.",
        ],
      },
      {
        title: 'Droit applicable, litiges et droits du consommateur',
        body: [
          "Les présentes conditions sont régies par le droit du pays d'établissement de l'éditeur (voir les mentions légales), sans vous priver de la protection de la loi de consommation de votre pays de résidence.",
          "Consommateur dans l'Union européenne ou au Royaume-Uni, vous disposez d'un droit de rétractation de 14 jours pour un contrat à distance. Lorsque vous demandez l'exécution immédiate d'un service numérique — ce que fait le démarrage de l'essai ou d'un abonnement — ce droit s'éteint dès que le service a été pleinement fourni. Nous chercherons toujours à régler une réclamation directement d'abord : écrivez à l'adresse de contact figurant dans les mentions légales.",
        ],
      },
    ],
  },
};

// ── Privacy policy ───────────────────────────────────────────────────
export const PRIVACY: Bilingual<LegalDoc> = {
  en: {
    title: 'Privacy policy',
    intro: 'What we collect, why, how long we keep it, and how to get it back or have it erased.',
    articles: [
      {
        title: 'Who is responsible',
        body: [
          'The publisher named in the imprint is the data controller. For any question about your data, or to exercise a right, write to the contact address there.',
        ],
      },
      {
        title: 'What we collect',
        body: [
          'Account: email address, name, country, currency, chosen language, password hash (we never see the password itself), and — if you enable it — a two-factor secret and the list of devices you marked as trusted.',
          'Vehicles: make, model, year, registration plate, VIN if you give one, mileage, purchase date and price, insurance provider, monthly premium and renewal date if you enter them.',
          'Use: fuel and charging receipts (amount, volume, station, date, mileage) and their scanned image, services logged (description, cost, garage, mileage), and the uploaded invoice or photo where you attach one.',
          'Technical: IP address and user agent on sign-in events, kept for security; error reports; the coarse location your browser gives us when you ask for nearby fuel prices, used for that request only and not stored.',
          'We never collect the registered keeper\'s name or address from a vehicle lookup. Only technical data about the vehicle is kept.',
        ],
      },
      {
        title: 'Why, and on what legal basis',
        body: [
          'To provide the service — accounts, vehicles, forecast, reminders, exports: performance of our contract with you.',
          'To take payment and prevent fraud: performance of the contract and our legitimate interest.',
          'To keep the service secure — rate limiting, sign-in alerts, audit log of sensitive actions, checking a new password against known breaches: our legitimate interest in protecting your account, and our legal obligation to secure the data.',
          'To send reminders about your vehicle: performance of the contract; you can switch each topic off in Settings → Notifications.',
          'To measure use in aggregate so we can fix what is broken: our legitimate interest. We use no advertising or cross-site tracking.',
        ],
      },
      {
        title: 'How long we keep it',
        body: [
          'Account and vehicle data: for as long as your account exists.',
          'After you delete your account: erased within 30 days, except entries we must keep — invoices for accounting (10 years in France, 6 in the UK) and security logs (12 months).',
          'Receipt and invoice images: with the entry they belong to, in encrypted storage.',
          'Sign-in security events: 12 months.',
          'Vehicle lookups are cached for 24 hours to avoid repeating the same request.',
        ],
      },
      {
        title: 'Who processes it for us',
        body: [
          'Supabase (database, authentication, encrypted file storage) — instance hosted in the EU (Frankfurt).',
          'Vercel (application hosting) — served from the EU region.',
          'Stripe (payments and invoicing) — we never receive your card number.',
          'Google Cloud Vision (reading a receipt or registration document you scan) — the image is sent for recognition and is not used to train their models.',
          'Resend (reminder and security emails), Upstash (rate limiting and lookup cache), Sentry (error reports, with a 10% performance sample).',
          'We also query public authorities when you look up a vehicle — the DVLA and DVSA in the UK, the NHTSA in the US, national fuel-price services in France and Germany. We send them the identifier you typed, nothing about you.',
          'Each of these acts on our instructions under a data-processing agreement. We do not sell your data to anyone.',
        ],
      },
      {
        title: 'Your rights',
        body: [
          'You can access, correct, export and erase your data, restrict or object to a processing, and withdraw consent where we relied on it.',
          'In the app: Settings → Profile exports everything we hold as a JSON file, and deletes your account. Notification topics are in Settings → Notifications.',
          'You can also write to the contact address in the imprint; we answer within one month. If you are not satisfied you can complain to your supervisory authority — the CNIL in France, the ICO in the UK, or the authority of your country of residence.',
        ],
      },
      {
        title: 'Security',
        body: [
          'Every table is protected by row-level security so one account cannot read another\'s data. Traffic is HTTPS only, with HSTS and a strict content-security policy. Service records are hash-chained and locked against modification at database level.',
          'Passwords must be at least 10 characters and are checked against the Have I Been Pwned breach corpus using a k-anonymous query — your password never leaves our server. Two-factor authentication is available and recommended.',
          'We alert you by email when we see a sign-in from a device you have not used before.',
        ],
      },
      {
        title: 'Cookies',
        body: [
          'Only what the service needs to work: your session, your language, and your answer to the cookie banner. No advertising cookie, no third-party tracking pixel. Details are in the cookie policy.',
        ],
      },
      {
        title: 'Transfers outside the EU and the UK',
        body: [
          'Your data is stored in the European Union. Some processors are based outside it — Google Cloud Vision (US), Stripe (Ireland, with US affiliates), Resend (US), Upstash (US), Sentry (US), Vercel (US, serving from the EU).',
          'These transfers rely on the European Commission\'s standard contractual clauses and, where applicable, the EU–US and UK–US Data Privacy Framework. Public data we read — MOT history, recalls, fuel prices — is sent an identifier and nothing about you.',
        ],
      },
      {
        title: 'Children',
        body: ['The service is for adults. We do not knowingly collect data about anyone under 18; tell us if you believe we have and we will erase it.'],
      },
      {
        title: 'Changes',
        body: ['We will tell you by email or in the app before a material change takes effect. The date at the top of this page is the version in force.'],
      },
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    intro: 'Ce que nous collectons, pourquoi, combien de temps nous le conservons, et comment le récupérer ou le faire effacer.',
    articles: [
      {
        title: 'Responsable du traitement',
        body: [
          "L'éditeur désigné dans les mentions légales est responsable du traitement. Pour toute question relative à vos données ou pour exercer un droit, écrivez à l'adresse de contact qui y figure.",
        ],
      },
      {
        title: 'Données collectées',
        body: [
          "Compte : adresse email, nom, pays, devise, langue choisie, empreinte du mot de passe (nous ne voyons jamais le mot de passe lui-même) et, si vous l'activez, un secret de double authentification et la liste des appareils que vous avez marqués comme fiables.",
          "Véhicules : marque, modèle, année, plaque d'immatriculation, VIN si vous le renseignez, kilométrage, date et prix d'achat, assureur, cotisation mensuelle et date d'échéance si vous les saisissez.",
          "Usage : tickets de carburant et de recharge (montant, volume, station, date, kilométrage) et leur image scannée, entretiens enregistrés (description, coût, garage, kilométrage), et la facture ou photo que vous joignez le cas échéant.",
          "Technique : adresse IP et navigateur lors des connexions, conservés pour la sécurité ; rapports d'erreur ; la position approximative fournie par votre navigateur quand vous demandez les prix du carburant à proximité, utilisée pour cette seule requête et non conservée.",
          "Nous ne collectons jamais le nom ni l'adresse du titulaire lors d'une recherche de véhicule. Seules les données techniques du véhicule sont conservées.",
        ],
      },
      {
        title: 'Finalités et bases légales',
        body: [
          "Fournir le service — comptes, véhicules, prévision, rappels, exports : exécution de notre contrat avec vous.",
          "Encaisser les paiements et prévenir la fraude : exécution du contrat et intérêt légitime.",
          "Sécuriser le service — limitation de débit, alertes de connexion, journal d'audit des actions sensibles, vérification d'un nouveau mot de passe contre les fuites connues : notre intérêt légitime à protéger votre compte et notre obligation légale de sécuriser les données.",
          "Envoyer des rappels concernant votre véhicule : exécution du contrat ; chaque sujet peut être désactivé dans Réglages → Notifications.",
          "Mesurer l'usage de façon agrégée pour corriger ce qui ne marche pas : intérêt légitime. Aucune publicité, aucun suivi inter-sites.",
        ],
      },
      {
        title: 'Durées de conservation',
        body: [
          "Données de compte et de véhicule : tant que votre compte existe.",
          "Après suppression du compte : effacement sous 30 jours, sauf les éléments que nous devons conserver — factures pour la comptabilité (10 ans en France, 6 au Royaume-Uni) et journaux de sécurité (12 mois).",
          "Images de tickets et de factures : avec l'entrée à laquelle elles se rattachent, dans un stockage chiffré.",
          "Événements de connexion : 12 mois.",
          "Les recherches de véhicule sont mises en cache 24 heures pour éviter de répéter la même requête.",
        ],
      },
      {
        title: 'Sous-traitants',
        body: [
          "Supabase (base de données, authentification, stockage chiffré) — instance hébergée dans l'UE (Francfort).",
          "Vercel (hébergement de l'application) — servie depuis la région UE.",
          "Stripe (paiements et facturation) — nous ne recevons jamais votre numéro de carte.",
          "Google Cloud Vision (lecture d'un ticket ou d'une carte grise que vous scannez) — l'image est envoyée pour reconnaissance et n'est pas utilisée pour entraîner leurs modèles.",
          "Resend (emails de rappel et de sécurité), Upstash (limitation de débit et cache de recherche), Sentry (rapports d'erreur, avec un échantillon de performance de 10 %).",
          "Nous interrogeons aussi des autorités publiques lors d'une recherche de véhicule — DVLA et DVSA au Royaume-Uni, NHTSA aux États-Unis, services nationaux de prix des carburants en France et en Allemagne. Nous leur transmettons l'identifiant que vous avez saisi, rien qui vous concerne.",
          "Chacun agit sur nos instructions dans le cadre d'un accord de sous-traitance. Nous ne vendons vos données à personne.",
        ],
      },
      {
        title: 'Vos droits',
        body: [
          "Vous pouvez accéder à vos données, les rectifier, les exporter et les effacer, limiter un traitement ou vous y opposer, et retirer votre consentement lorsqu'il fondait le traitement.",
          "Dans l'application : Réglages → Profil exporte l'ensemble de ce que nous détenons dans un fichier JSON, et supprime votre compte. Les sujets de notification sont dans Réglages → Notifications.",
          "Vous pouvez aussi écrire à l'adresse de contact des mentions légales ; nous répondons sous un mois. En cas d'insatisfaction, vous pouvez saisir votre autorité de contrôle — la CNIL en France, l'ICO au Royaume-Uni, ou l'autorité de votre pays de résidence.",
        ],
      },
      {
        title: 'Sécurité',
        body: [
          "Chaque table est protégée par une politique de sécurité au niveau des lignes, de sorte qu'un compte ne peut pas lire les données d'un autre. Le trafic est exclusivement HTTPS, avec HSTS et une politique de sécurité de contenu stricte. Les entretiens sont chaînés par hash et verrouillés contre toute modification au niveau de la base.",
          "Les mots de passe font au moins 10 caractères et sont vérifiés contre le corpus de fuites Have I Been Pwned au moyen d'une requête k-anonyme — votre mot de passe ne quitte jamais notre serveur. La double authentification est disponible et recommandée.",
          "Nous vous alertons par email lorsqu'une connexion provient d'un appareil que vous n'avez pas utilisé auparavant.",
        ],
      },
      {
        title: 'Cookies',
        body: [
          "Uniquement ce qui est nécessaire au fonctionnement : votre session, votre langue et votre réponse à la bannière cookies. Aucun cookie publicitaire, aucun pixel de suivi tiers. Les détails figurent dans la politique de cookies.",
        ],
      },
      {
        title: "Transferts hors UE et hors Royaume-Uni",
        body: [
          "Vos données sont stockées dans l'Union européenne. Certains sous-traitants sont établis en dehors — Google Cloud Vision (États-Unis), Stripe (Irlande, avec des filiales américaines), Resend (États-Unis), Upstash (États-Unis), Sentry (États-Unis), Vercel (États-Unis, servant depuis l'UE).",
          "Ces transferts reposent sur les clauses contractuelles types de la Commission européenne et, le cas échéant, sur le Data Privacy Framework UE–États-Unis et Royaume-Uni–États-Unis. Aux sources publiques que nous interrogeons — historique MOT, rappels, prix des carburants — nous transmettons un identifiant et rien qui vous concerne.",
        ],
      },
      {
        title: 'Mineurs',
        body: ["Le service est destiné aux adultes. Nous ne collectons pas sciemment de données concernant une personne de moins de 18 ans ; signalez-le-nous et nous les effacerons."],
      },
      {
        title: 'Modifications',
        body: ["Nous vous informerons par email ou dans l'application avant l'entrée en vigueur d'une modification substantielle. La date en haut de cette page correspond à la version en vigueur."],
      },
    ],
  },
};

// ── Cookie policy ────────────────────────────────────────────────────
export interface CookieRow {
  name: string;
  purpose: string;
  duration: string;
  issuer: string;
}

export const COOKIES: Bilingual<{ title: string; intro: string[]; columns: [string, string, string, string]; rows: CookieRow[]; outro: string[] }> = {
  en: {
    title: 'Cookie policy',
    intro: [
      'Keeper uses only the cookies and local storage the service needs to work. No advertising cookie, no third-party tracking pixel, no sale of behavioural data.',
      'Because there is nothing optional to consent to, refusing the banner does not degrade the service: it only records that you were asked.',
    ],
    columns: ['Name', 'Purpose', 'Duration', 'Set by'],
    rows: [
      { name: 'sb-access-token', purpose: 'Authenticated session', duration: '1 hour (renewed)', issuer: 'Keeper (Supabase)' },
      { name: 'sb-refresh-token', purpose: 'Session renewal', duration: '30 days', issuer: 'Keeper (Supabase)' },
      { name: 'NEXT_LOCALE', purpose: 'Remembers your language', duration: '1 year', issuer: 'Keeper (next-intl)' },
      { name: 'keeper-cookies-acknowledged', purpose: 'Remembers your answer to the banner', duration: '1 year (local storage)', issuer: 'Keeper' },
      { name: 'theme', purpose: 'Remembers light or dark mode', duration: '1 year (local storage)', issuer: 'Keeper' },
      { name: 'vw-trusted-device', purpose: 'Marks a device as trusted so two-factor is not asked every time', duration: '30 days', issuer: 'Keeper' },
    ],
    outro: [
      'Stripe sets its own cookies on its checkout and billing pages, which are hosted by Stripe, not by us. Their use is governed by Stripe\'s privacy policy.',
      'You can delete these at any time in your browser settings. Deleting the session cookies signs you out.',
    ],
  },
  fr: {
    title: 'Politique de cookies',
    intro: [
      "Keeper n'utilise que les cookies et le stockage local nécessaires au fonctionnement du service. Aucun cookie publicitaire, aucun pixel de suivi tiers, aucune revente de données comportementales.",
      "Comme il n'y a rien d'optionnel à accepter, refuser la bannière ne dégrade pas le service : cela enregistre seulement que la question vous a été posée.",
    ],
    columns: ['Nom', 'Finalité', 'Durée', 'Émetteur'],
    rows: [
      { name: 'sb-access-token', purpose: "Session d'authentification", duration: '1 heure (renouvelée)', issuer: 'Keeper (Supabase)' },
      { name: 'sb-refresh-token', purpose: 'Renouvellement de session', duration: '30 jours', issuer: 'Keeper (Supabase)' },
      { name: 'NEXT_LOCALE', purpose: 'Mémorise votre langue', duration: '1 an', issuer: 'Keeper (next-intl)' },
      { name: 'keeper-cookies-acknowledged', purpose: 'Mémorise votre réponse à la bannière', duration: '1 an (stockage local)', issuer: 'Keeper' },
      { name: 'theme', purpose: 'Mémorise le mode clair ou sombre', duration: '1 an (stockage local)', issuer: 'Keeper' },
      { name: 'vw-trusted-device', purpose: 'Marque un appareil comme fiable pour ne pas redemander la double authentification', duration: '30 jours', issuer: 'Keeper' },
    ],
    outro: [
      "Stripe dépose ses propres cookies sur ses pages de paiement et de facturation, hébergées par Stripe et non par nous. Leur usage est régi par la politique de confidentialité de Stripe.",
      "Vous pouvez les supprimer à tout moment dans les réglages de votre navigateur. Supprimer les cookies de session vous déconnecte.",
    ],
  },
};

// ── Imprint ──────────────────────────────────────────────────────────
export const IMPRINT: Bilingual<{
  title: string;
  intro: string;
  incomplete: string;
  publisherTitle: string;
  hostingTitle: string;
  ipTitle: string;
  ipBody: string;
  dataTitle: string;
  dataBody: string;
  disputeTitle: string;
  disputeBody: string;
  labels: Record<'name' | 'form' | 'capital' | 'registry' | 'vat' | 'vatNote' | 'address' | 'publisher' | 'email', string>;
  hosting: string[];
}> = {
  en: {
    title: 'Imprint',
    intro: 'Who publishes this service, and who hosts it.',
    incomplete: 'The publisher details are not configured on this deployment. They must be set before the service is offered commercially — see lib/legal/entity.ts.',
    publisherTitle: 'Publisher',
    hostingTitle: 'Hosting and processing',
    ipTitle: 'Intellectual property',
    ipBody: 'The application, its code, design, texts and logo belong to the publisher or its licensors. Reproduction or adaptation, in whole or in part, requires prior written permission. Public data displayed in the app remains under its own licence, named where it is shown.',
    dataTitle: 'Personal data',
    dataBody: 'How personal data is processed is described in the privacy policy.',
    disputeTitle: 'Complaints and disputes',
    disputeBody: 'Write to the contact address above first — most things are settled that way. If a dispute remains, a consumer may refer it to a mediator or to the online dispute-resolution platform of their country of residence, and in any case retains the right to go to court.',
    labels: { name: 'Legal name', form: 'Legal form', capital: 'Share capital', registry: 'Company registration', vat: 'VAT number', vatNote: 'VAT status', address: 'Registered address', publisher: 'Publishing director', email: 'Contact' },
    hosting: [
      'Application: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA — served from the EU region.',
      'Database and file storage: Supabase Inc. — instance hosted in Frankfurt, Germany.',
      'Payments: Stripe Payments Europe Ltd, 1 Grand Canal Street Lower, Dublin, Ireland.',
    ],
  },
  fr: {
    title: 'Mentions légales',
    intro: 'Qui édite ce service, et qui l\'héberge.',
    incomplete: "Les informations de l'éditeur ne sont pas configurées sur ce déploiement. Elles doivent l'être avant toute offre commerciale du service — voir lib/legal/entity.ts.",
    publisherTitle: 'Éditeur',
    hostingTitle: 'Hébergement et traitement',
    ipTitle: 'Propriété intellectuelle',
    ipBody: "L'application, son code, son design, ses textes et son logo appartiennent à l'éditeur ou à ses concédants. Toute reproduction ou adaptation, totale ou partielle, requiert une autorisation écrite préalable. Les données publiques affichées dans l'application restent sous leur propre licence, nommée à l'endroit où elles apparaissent.",
    dataTitle: 'Données personnelles',
    dataBody: 'Les modalités de traitement des données personnelles sont décrites dans la politique de confidentialité.',
    disputeTitle: 'Réclamations et litiges',
    disputeBody: "Écrivez d'abord à l'adresse de contact ci-dessus — la plupart des situations se règlent ainsi. Si un litige subsiste, un consommateur peut saisir un médiateur ou la plateforme de règlement en ligne des litiges de son pays de résidence, et conserve en tout état de cause le droit de saisir les tribunaux.",
    labels: { name: 'Dénomination', form: 'Forme juridique', capital: 'Capital social', registry: 'Immatriculation', vat: 'Numéro de TVA', vatNote: 'Régime de TVA', address: 'Siège social', publisher: 'Directeur de la publication', email: 'Contact' },
    hosting: [
      "Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — servie depuis la région UE.",
      "Base de données et stockage : Supabase Inc. — instance hébergée à Francfort, Allemagne.",
      "Paiements : Stripe Payments Europe Ltd, 1 Grand Canal Street Lower, Dublin, Irlande.",
    ],
  },
};
