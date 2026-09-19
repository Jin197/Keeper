import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de confidentialité Velocewealth — données collectées, finalités, durées, droits RGPD.',
};

export default function PrivacyPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Politique de confidentialité
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        Conforme au RGPD (UE 2016/679) · version du 9 mai 2026
      </p>

      <section className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Article number="1" title="Responsable du traitement">
          <p>
            Velocewealth (« nous », « notre ») est responsable du traitement des
            données personnelles collectées via le service. Pour toute question :
            <a href="mailto:privacy@velocewealth.app" className="text-veloce hover:underline ms-1">
              privacy@velocewealth.app
            </a>
            .
          </p>
        </Article>

        <Article number="2" title="Données collectées">
          <p>Nous collectons les catégories suivantes :</p>
          <ul className="list-disc ps-5 space-y-1">
            <li>
              <strong>Identité &amp; compte</strong> : nom complet, adresse
              email, mot de passe (chiffré, jamais stocké en clair), pays,
              langue, devise.
            </li>
            <li>
              <strong>Véhicules</strong> : marque, modèle, année, immatriculation,
              VIN (optionnel), kilométrage, date et prix d&apos;achat, photo,
              motorisation, assurance.
            </li>
            <li>
              <strong>Dépenses énergie</strong> : station, type d&apos;énergie,
              quantité, prix, date, kilométrage, photo de ticket éventuelle.
            </li>
            <li>
              <strong>Entretien</strong> : description, coût, garage,
              kilométrage, factures éventuelles, hash d&apos;intégrité.
            </li>
            <li>
              <strong>Données de paiement</strong> : traitées exclusivement par
              Stripe Inc. ; nous stockons uniquement l&apos;identifiant client
              Stripe (jamais de numéro de carte).
            </li>
            <li>
              <strong>Données techniques</strong> : adresse IP de connexion,
              user-agent, journaux d&apos;accès (conservés 30 jours pour la
              sécurité).
            </li>
          </ul>
        </Article>

        <Article number="3" title="Finalités et bases légales">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-foreground">
                <th className="text-start py-2">Finalité</th>
                <th className="text-start py-2">Base légale</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-2 pe-4">Fourniture du Service</td>
                <td className="py-2">Exécution du contrat (art. 6.1.b)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pe-4">Facturation et abonnement</td>
                <td className="py-2">Obligation légale (art. 6.1.c)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pe-4">Sécurité (rate limit, journaux)</td>
                <td className="py-2">Intérêt légitime (art. 6.1.f)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pe-4">Communication produit</td>
                <td className="py-2">Consentement (art. 6.1.a)</td>
              </tr>
              <tr>
                <td className="py-2 pe-4">OCR via Google Vision</td>
                <td className="py-2">Exécution du contrat (sous-traitance)</td>
              </tr>
            </tbody>
          </table>
        </Article>

        <Article number="4" title="Durées de conservation">
          <ul className="list-disc ps-5 space-y-1">
            <li>
              <strong>Compte actif</strong> : aussi longtemps que le compte est
              actif.
            </li>
            <li>
              <strong>Compte fermé</strong> : suppression sous 30 jours, sauf
              factures conservées 10 ans (obligation comptable française).
            </li>
            <li>
              <strong>Journaux d&apos;accès</strong> : 30 jours.
            </li>
            <li>
              <strong>Tickets envoyés à Google Vision</strong> : non conservés
              chez Google une fois traités (cf. accord Google Cloud DPA).
            </li>
          </ul>
        </Article>

        <Article number="5" title="Sous-traitants">
          <ul className="list-disc ps-5 space-y-1">
            <li>
              <strong>Supabase</strong> (Frankfurt, Allemagne) — hébergement DB,
              auth, storage. Conforme RGPD, hébergement UE.
            </li>
            <li>
              <strong>Vercel</strong> (Francfort, France, Irlande) — hébergement
              applicatif. Edge / régions configurables UE.
            </li>
            <li>
              <strong>Stripe</strong> (Irlande) — paiements. Certifié PCI-DSS,
              DPA RGPD signé.
            </li>
            <li>
              <strong>Google Cloud Vision</strong> (UE) — OCR sur tickets, sans
              conservation post-traitement.
            </li>
          </ul>
        </Article>

        <Article number="6" title="Vos droits">
          <p>
            Conformément aux articles 15 à 22 du RGPD, vous disposez des droits
            suivants, exerçables depuis <em>Paramètres → Sécurité</em> ou par
            email à privacy@velocewealth.app :
          </p>
          <ul className="list-disc ps-5 space-y-1">
            <li>
              <strong>Accès &amp; portabilité</strong> : export complet de vos
              données au format JSON, en un clic depuis votre compte.
            </li>
            <li>
              <strong>Rectification</strong> : modification directe depuis vos
              paramètres ; pour les entrées du carnet certifié immutables, par
              ajout d&apos;une entrée corrective.
            </li>
            <li>
              <strong>Effacement</strong> : suppression du compte avec délai de
              grâce de 30 jours (annulable pendant cette période).
            </li>
            <li>
              <strong>Limitation</strong> et <strong>opposition</strong> : sur
              simple demande.
            </li>
            <li>
              <strong>Réclamation</strong> auprès de la CNIL (cnil.fr) ou de
              l&apos;autorité de protection des données de votre pays.
            </li>
          </ul>
        </Article>

        <Article number="7" title="Sécurité">
          <p>
            Mots de passe hachés (bcrypt côté Supabase Auth). Données sensibles
            chiffrées au repos. Communication TLS 1.3. Row Level Security
            PostgreSQL : chaque utilisateur ne peut accéder qu&apos;à ses
            propres données. Audit trail immuable pour le carnet certifié.
          </p>
          <p>
            En cas de violation de données, notification dans les 72h
            conformément à l&apos;article 33 du RGPD.
          </p>
        </Article>

        <Article number="8" title="Cookies">
          <p>
            Velocewealth n&apos;utilise que des cookies strictement nécessaires
            (session d&apos;authentification, préférences). Aucun cookie
            publicitaire, aucun traçage tiers. Voir notre{' '}
            <a href="/legal/cookies" className="text-veloce hover:underline">
              politique cookies
            </a>
            .
          </p>
        </Article>

        <Article number="9" title="Transferts hors UE">
          <p>
            Les traitements décrits à l&apos;article 8 ont lieu dans
            l&apos;Union européenne. Si un sous-traitant situé hors UE devait
            être introduit, cette politique serait mise à jour et les Standard
            Contractual Clauses de la Commission européenne appliquées au
            transfert.
          </p>
        </Article>

        <Article number="10" title="Modifications">
          <p>
            Toute évolution substantielle de cette politique vous sera notifiée
            par email au moins 30 jours avant son entrée en vigueur.
          </p>
        </Article>
      </section>
    </main>
  );
}

function Article({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <h2 className="font-display text-xl font-semibold mb-3 text-foreground">
        <span className="text-muted-foreground font-mono me-2">{number}.</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </article>
  );
}
