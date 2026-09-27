import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { getLocale } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toaster';
import { EthicalAnalytics } from '@/components/domain/ethical-analytics';
import { isRtl } from '@/lib/i18n/routing';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Velocewealth — Know what your car will cost you next',
    template: '%s · Velocewealth',
  },
  description: 'Real cost per km from your receipts, the repairs coming up on your exact model, and the cheapest fuel near you. Built on official MOT, recall and fuel-price data.',
  keywords: [
    'car running costs',
    'cost per mile',
    'MOT history',
    'car maintenance reminder',
    'cheapest fuel near me',
    'service history',
    'coût au kilomètre',
    'carnet entretien',
    'prix carburant',
  ],
  authors: [{ name: 'Velocewealth' }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
  openGraph: {
    type: 'website',
    title: 'Velocewealth — Know what your car will cost you next',
    description: 'Real cost per km from your receipts, the repairs coming up on your exact model, and the cheapest fuel near you. Built on official MOT, recall and fuel-price data.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&h=630&fit=crop&q=80',
        width: 1200,
        height: 630,
        alt: 'Velocewealth — car running costs and maintenance forecast',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Velocewealth — Know what your car will cost you next',
    description: 'Real cost per km from your receipts, the repairs coming up on your exact model, and the cheapest fuel near you. Built on official MOT, recall and fuel-price data.',
    images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&h=630&fit=crop&q=80'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const direction = isRtl(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <EthicalAnalytics />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

