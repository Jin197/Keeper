import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { LegalArticles, legalMetadata } from '@/components/legal/legal-doc';
import { PRIVACY } from '@/lib/legal/content';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(PRIVACY, await getLocale());
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalArticles doc={PRIVACY[locale === 'fr' ? 'fr' : 'en']} locale={locale} />;
}
