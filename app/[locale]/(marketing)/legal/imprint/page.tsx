import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { versionLine } from '@/components/legal/legal-doc';
import { IMPRINT } from '@/lib/legal/content';
import { legalEntity, isComplete } from '@/lib/legal/entity';

export async function generateMetadata(): Promise<Metadata> {
  const t = IMPRINT[(await getLocale()) === 'fr' ? 'fr' : 'en'];
  return { title: t.title, description: t.intro };
}

export default async function ImprintPage() {
  const locale = await getLocale();
  const t = IMPRINT[locale === 'fr' ? 'fr' : 'en'];
  const e = legalEntity();

  // Only the fields that are actually configured. Nothing is invented: an
  // unset registration or VAT number simply does not appear.
  const fields: [string, string | null][] = [
    [t.labels.name, e.name],
    [t.labels.form, e.form],
    [t.labels.capital, e.capital],
    [t.labels.registry, e.registry],
    [t.labels.vat, e.vat],
    [t.labels.address, e.address],
    [t.labels.publisher, e.publisher],
    [t.labels.email, e.email],
  ];

  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
      <p className="text-sm text-muted-foreground mt-2">{versionLine(locale)}</p>
      <p className="mt-4 text-sm leading-relaxed">{t.intro}</p>

      {!isComplete(e) && (
        <div className="mt-8 rounded-card border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-700 dark:text-amber-300">{t.incomplete}</p>
        </div>
      )}

      <section className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Block title={t.publisherTitle}>
          <dl className="grid sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-2">
            {fields
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="sm:contents">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground/70">{label}</dt>
                  <dd className="text-foreground">
                    {label === t.labels.email ? (
                      <a href={`mailto:${value}`} className="text-veloce hover:underline">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </Block>

        <Block title={t.hostingTitle}>
          <ul className="list-disc ps-5 space-y-1">
            {t.hosting.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Block>

        <Block title={t.ipTitle}>
          <p>{t.ipBody}</p>
        </Block>

        <Block title={t.dataTitle}>
          <p>
            {t.dataBody}{' '}
            <Link href="/legal/privacy" className="text-veloce hover:underline">
              {locale === 'fr' ? 'Politique de confidentialité' : 'Privacy policy'}
            </Link>
            .
          </p>
        </Block>

        <Block title={t.disputeTitle}>
          <p>{t.disputeBody}</p>
        </Block>
      </section>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
