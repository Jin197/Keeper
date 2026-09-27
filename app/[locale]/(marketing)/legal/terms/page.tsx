import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { LegalArticles, legalMetadata } from '@/components/legal/legal-doc';
import { TERMS } from '@/lib/legal/content';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(TERMS, await getLocale());
}

export default async function TermsPage() {
  const locale = await getLocale();
  return <LegalArticles doc={TERMS[locale === 'fr' ? 'fr' : 'en']} locale={locale} />;
}
