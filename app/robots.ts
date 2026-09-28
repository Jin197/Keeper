import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://keeperapp.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/vehicles',
          '/fuel',
          '/maintenance',
          '/eco-score',
          '/settings',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
