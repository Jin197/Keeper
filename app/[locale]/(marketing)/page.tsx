import { setRequestLocale } from 'next-intl/server';
import { LandingPageClient } from './landing-page-client';
import { resolvePricing } from '@/lib/pricing';
import { resolveRequestCountry } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Visitors are anonymous here, so the price band comes from the edge geo
  // header; a signed-in user's profile country wins on /settings/billing.
  const country = resolveRequestCountry(null, locale === 'fr' ? 'FR' : 'GB');
  const pricing = resolvePricing(country);

  return <LandingPageClient locale={locale} pricing={pricing} />;
}
