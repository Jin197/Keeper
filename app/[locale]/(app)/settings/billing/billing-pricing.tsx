'use client';

import { PricingSection } from '@/components/marketing/pricing-section';
import type { ResolvedPricing } from '@/lib/pricing';

/**
 * Thin wrapper so the billing page and the landing page can never disagree
 * on a price: both render `PricingSection` from the same `resolvePricing`.
 */
export function BillingPricingSelector({ pricing, locale }: { pricing: ResolvedPricing; locale: string }) {
  return (
    <div className="pt-4">
      <PricingSection pricing={pricing} locale={locale} compact />
    </div>
  );
}
