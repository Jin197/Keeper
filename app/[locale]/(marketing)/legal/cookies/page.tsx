import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de cookies',
  description:
    'Velocewealth n\'utilise que des cookies strictement nécessaires. Aucun cookie publicitaire, aucun traçage tiers.',
};

export default function CookiesPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Politique de cookies
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        Version du 9 mai 2026
      </p>

      <section className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <p>
          Velocewealth s&apos;engage à n&apos;utiliser que les cookies
          strictement nécessaires au fonctionnement du Service. Aucun cookie
          publicitaire, aucun pixel de traçage tiers, aucune revente de données
          comportementales.
        </p>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Cookies utilisés
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-border rounded-card overflow-hidden">
              <thead className="bg-muted/40 text-foreground">
                <tr>
                  <th className="text-start p-3">Nom</th>
                  <th className="text-start p-3">Finalité</th>
                  <th className="text-start p-3">Durée</th>
                  <th className="text-start p-3">Émetteur</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3 font-mono">sb-access-token</td>
                  <td className="p-3">Session d&apos;authentification</td>
                  <td className="p-3">1 heure (renouvelé)</td>
                  <td className="p-3">Velocewealth (Supabase)</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-mono">sb-refresh-token</td>
                  <td className="p-3">Renouvellement de session</td>
                  <td className="p-3">30 jours</td>
                  <td className="p-3">Velocewealth (Supabase)</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-mono">NEXT_LOCALE</td>
                  <td className="p-3">Mémorisation de la langue choisie</td>
                  <td className="p-3">1 an</td>
                  <td className="p-3">Velocewealth (next-intl)</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-mono">theme</td>
                  <td className="p-3">Mémorisation du thème (clair/sombre)</td>
                  <td className="p-3">1 an</td>
                  <td className="p-3">Velocewealth</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Localisation web
          </h2>
          <p>
            Velocewealth utilise <code className="font-mono">localStorage</code>{' '}
            pour mémoriser l&apos;acquittement de la bannière cookies et
            certaines préférences UI. Ce ne sont techniquement pas des cookies,
            mais ils sont mentionnés ici par transparence.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Désactivation
          </h2>
          <p>
            Tous les cookies utilisés étant strictement nécessaires, leur
            désactivation empêche le fonctionnement du Service. La désactivation
            se fait dans les paramètres de votre navigateur.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Sous-traitants tiers
          </h2>
          <p>
            <strong>Stripe</strong> peut déposer ses propres cookies lors du
            chargement de ses scripts (page de paiement). Ces cookies sont
            régis par sa politique :{' '}
            <a href="https://stripe.com/cookies-policy/legal" className="text-veloce hover:underline" target="_blank" rel="noopener noreferrer">
              Stripe
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Contact
          </h2>
          <p>
            Pour toute question :{' '}
            <a href="mailto:privacy@velocewealth.app" className="text-veloce hover:underline">
              privacy@velocewealth.app
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
