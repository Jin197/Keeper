'use client';

import { ExternalLink, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { partsLink } from '@/lib/affiliates';
import type { MaintenanceCategory } from '@/lib/types';

interface Props {
  country: string | null | undefined;
  category: MaintenanceCategory;
  vehicle?: { make?: string; model?: string; year?: number };
  className?: string;
}

/**
 * "Find the part" — opens the country's parts retailer with a pre-filled
 * search. Renders nothing when we have no retailer for the country.
 */
export function PartsLinkButton({ country, category, vehicle, className = '' }: Props) {
  const t = useTranslations('health');
  const link = partsLink(country, category, vehicle);
  if (!link) return null;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-keeper hover:underline ${className}`}
      title={link.tracked ? t('buyPartsTracked') : undefined}
    >
      <ShoppingCart className="h-3.5 w-3.5" />
      {t('buyParts')} · {link.retailer}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  );
}
