import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

/**
 * Every locale we hold a message catalogue for. Stays wide because existing
 * profiles may already have `locale = 'es' | 'pt' | 'ar'` stored, and the
 * catalogues under messages/ are kept intact for when we re-enable them.
 */
export const allLocales = ['fr', 'en', 'es', 'ar', 'pt'] as const;
export type Locale = (typeof allLocales)[number];

/**
 * Locales actually routable at launch. Narrowed to FR + EN: the landing page
 * still carries hard-coded `locale === 'fr' ? … : locale === 'es' ? … : <english>`
 * ternaries, so PT and AR silently fell back to English, and AR additionally
 * needs the RTL pass validated. Everything that enumerates languages — the
 * switcher, the sitemap, generateStaticParams, the middleware — reads this
 * list, so widening it back is a one-line change.
 */
export const locales = ['fr', 'en'] as const satisfies readonly Locale[];

export const defaultLocale: Locale = 'fr';

export const localeLabels: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  pt: 'Português',
};

export const localeFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  ar: '🇸🇦',
  pt: '🇵🇹',
};

export const rtlLocales: Locale[] = ['ar'];
export const isRtl = (locale: string) => rtlLocales.includes(locale as Locale);

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // /dashboard for fr, /en/dashboard for others
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
