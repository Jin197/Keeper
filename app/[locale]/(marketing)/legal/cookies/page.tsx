import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { versionLine } from '@/components/legal/legal-doc';
import { COOKIES } from '@/lib/legal/content';

export async function generateMetadata(): Promise<Metadata> {
  const c = COOKIES[(await getLocale()) === 'fr' ? 'fr' : 'en'];
  return { title: c.title, description: c.intro[0] };
}

export default async function CookiesPage() {
  const locale = await getLocale();
  const c = COOKIES[locale === 'fr' ? 'fr' : 'en'];

  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">{c.title}</h1>
      <p className="text-sm text-muted-foreground mt-2">{versionLine(locale)}</p>

      <section className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        {c.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-card overflow-hidden">
            <thead className="bg-muted/40 text-foreground">
              <tr>
                {c.columns.map((col) => (
                  <th key={col} className="text-start p-3 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr key={row.name} className="border-t border-border">
                  <td className="p-3 font-mono">{row.name}</td>
                  <td className="p-3">{row.purpose}</td>
                  <td className="p-3">{row.duration}</td>
                  <td className="p-3">{row.issuer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {c.outro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>
    </main>
  );
}
