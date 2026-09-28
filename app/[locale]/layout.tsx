import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
import { routing, locales, defaultLocale } from '@/lib/i18n/routing';
import { ChatbotWidget } from '@/components/domain/chatbot-widget';
import { CookieBanner } from '@/components/cookie-banner';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'common' });
  const tLanding = await getTranslations({ locale, namespace: 'landing.hero' });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://keeperapp.app';

  return {
    title: {
      default: `Keeper — ${t('tagline')}`,
      template: '%s · Keeper',
    },
    description: tLanding('subtitle'),
    alternates: {
      canonical:
        locale === defaultLocale ? `${base}/` : `${base}/${locale}`,
      languages: Object.fromEntries(
        locales.map((l) => [
          l,
          l === defaultLocale ? `${base}/` : `${base}/${l}`,
        ]),
      ),
    },
    openGraph: {
      type: 'website',
      locale: locale,
      title: `Keeper — ${t('tagline')}`,
      description: tLanding('subtitle'),
      url: locale === defaultLocale ? `${base}/` : `${base}/${locale}`,
      siteName: 'Keeper',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Keeper — ${t('tagline')}`,
      description: tLanding('subtitle'),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <StructuredData />
      {children}
      {/* The assistant's knowledge base and fallback answers are French-only;
          keep it off the English experience until it is translated. */}
      {locale === 'fr' && <ChatbotWidget />}
      <CookieBanner />
    </NextIntlClientProvider>
  );
}

function StructuredData() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://keeperapp.app';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Keeper',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    // Free tier exists, so the lowest price is 0. No aggregateRating: we have
    // no reviews yet and inventing one is a Google penalty waiting to happen.
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
    },
    url: base,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
