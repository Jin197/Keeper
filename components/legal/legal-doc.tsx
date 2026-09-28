import type { Metadata } from 'next';
import type { LegalDoc, Lang } from '@/lib/legal/content';
import { LEGAL_VERSION } from '@/lib/legal/entity';

function lang(locale: string): Lang {
  return locale === 'fr' ? 'fr' : 'en';
}

/** Shared metadata for the legal pages: title + the intro as description. */
export function legalMetadata(doc: Record<Lang, LegalDoc>, locale: string): Metadata {
  const d = doc[lang(locale)];
  return { title: d.title, description: d.intro };
}

export function versionLine(locale: string): string {
  const date = new Date(LEGAL_VERSION).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return locale === 'fr' ? `Version en vigueur au ${date}` : `Version in force since ${date}`;
}

/** Renders a numbered-article document (terms, privacy). */
export function LegalArticles({ doc, locale }: { doc: LegalDoc; locale: string }) {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">{doc.title}</h1>
      <p className="text-sm text-muted-foreground mt-2">{versionLine(locale)}</p>
      <p className="mt-4 text-sm leading-relaxed">{doc.intro}</p>

      <section className="mt-10 space-y-8 text-sm leading-relaxed">
        {doc.articles.map((article, i) => (
          <article key={article.title} className="space-y-3">
            <h2 className="font-display text-lg font-semibold flex gap-3">
              <span className="text-keeper tabular-nums">{i + 1}.</span>
              {article.title}
            </h2>
            <div className="space-y-3 text-muted-foreground ps-8">
              {article.body.map((block, j) =>
                Array.isArray(block) ? (
                  <ul key={j} className="list-disc ps-5 space-y-1">
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={j}>{block}</p>
                ),
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
