import type { MetadataRoute } from 'next';
import { locales, defaultLocale } from '@/lib/i18n/routing';

const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/legal/terms',
  '/legal/privacy',
  '/legal/imprint',
  '/legal/cookies',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://keeperapp.app';

  return PUBLIC_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url:
        locale === defaultLocale
          ? `${base}${path}`
          : `${base}/${locale}${path === '/' ? '' : path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [
            l,
            l === defaultLocale
              ? `${base}${path}`
              : `${base}/${l}${path === '/' ? '' : path}`,
          ]),
        ),
      },
    })),
  );
}
