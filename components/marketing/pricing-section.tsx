'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Sparkles, FileBadge } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/app/[locale]/(marketing)/pricing/checkout-button';
import { formatPrice, type ResolvedPricing } from '@/lib/pricing';

interface Props {
  pricing: ResolvedPricing;
  locale: string;
  /** Compact variant for /settings/billing (no free card, no heading). */
  compact?: boolean;
  /** Hide the one-off dossier note (already purchased, or on a vehicle page). */
  hideOneOff?: boolean;
  /**
   * False when Stripe has no key yet. The reverse trial needs no card and no
   * Stripe (see lib/trial.ts — it is keyed on profiles.created_at), so the CTA
   * sends people to signup instead of a Checkout call that would 500 and
   * surface as a bare "Erreur" toast on the page's primary button.
   */
  checkoutReady?: boolean;
}

/**
 * The single pricing block used by the landing page and the billing screen.
 * Every amount comes from `resolvePricing` — never hard-coded here — so the
 * copy can't drift from what Stripe charges.
 */
export function PricingSection({ pricing, locale, compact = false, hideOneOff = false, checkoutReady = true }: Props) {
  const t = useTranslations('pricing');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly');

  const fmt = (n: number) => formatPrice(n, pricing.currency, locale);
  const headline = interval === 'yearly' ? fmt(pricing.yearlyPerMonth) : fmt(pricing.monthly);

  const standardFeatures = ['standardF1', 'standardF2', 'standardF3', 'standardF4', 'standardF5'] as const;
  const premiumFeatures = ['premiumF1', 'premiumF2', 'premiumF3', 'premiumF4', 'premiumF5', 'premiumF6'] as const;

  return (
    <div className={compact ? 'space-y-6' : 'space-y-12'}>
      {!compact && (
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <Badge variant="premium">
            <Sparkles className="h-3 w-3" /> {t('noAds')}
          </Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
            {t('title')}
          </h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      )}

      {/* Interval toggle */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-full bg-[#16161A]/80 border border-white/5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              interval === 'monthly' ? 'bg-[#2D2D2D] text-white shadow-sm' : 'text-muted-foreground hover:text-white'
            }`}
          >
            {t('monthly')}
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              interval === 'yearly' ? 'bg-[#2D2D2D] text-white shadow-sm' : 'text-muted-foreground hover:text-white'
            }`}
          >
            {t('yearly')}
            <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] px-1.5 py-0">
              {t('saveBadge', { pct: pricing.yearlySavingsPct })}
            </Badge>
          </button>
        </div>
      </div>

      <div className={compact ? 'grid gap-6 max-w-md mx-auto' : 'grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto'}>
        {!compact && (
          <Card className="p-8 border border-white/[0.08] bg-[#16161A]/50 rounded-[2.5rem] flex flex-col justify-between shadow-xl">
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{t('standardName')}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t('standardDescription')}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-5xl font-bold text-white">{fmt(0)}</span>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground pt-4 border-t border-white/[0.04]">
                {standardFeatures.map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#007AFF] shrink-0" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild variant="outline" className="mt-8 rounded-full border-white/10 text-white hover:bg-white/5 py-6">
              <Link href="/signup">{t('standardCta')}</Link>
            </Button>
          </Card>
        )}

        <Card className="p-8 border border-[#007AFF]/40 bg-gradient-to-b from-[#007AFF]/10 to-transparent backdrop-blur-xl rounded-[2.5rem] flex flex-col justify-between relative shadow-2xl">
          <Badge className="bg-[#007AFF] text-white absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border-none shadow-[0_0_15px_rgba(0,122,255,0.6)] px-4 py-1 text-xs">
            {t('mostChosen')}
          </Badge>
          <div className="space-y-6">
            <div className="pt-2">
              <h3 className="font-display text-xl font-bold text-white">{t('premiumName')}</h3>
              <p className="text-xs text-[#007AFF] mt-1 font-semibold">{t('premiumDescription')}</p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-5xl font-bold text-white tabular-nums">{headline}</span>
                <span className="text-muted-foreground font-mono text-sm">{t('perMonth')}</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 min-h-[1rem]">
                {interval === 'yearly'
                  ? t('billedYearly', { amount: fmt(pricing.yearly), perMonth: fmt(pricing.yearlyPerMonth), pct: pricing.yearlySavingsPct })
                  : ' '}
              </div>
            </div>
            <ul className="space-y-3 text-sm text-white pt-4 border-t border-white/[0.04]">
              {premiumFeatures.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 space-y-2">
            {checkoutReady ? (
              <CheckoutButton
                interval={interval}
                label={t('trialCta')}
                className="w-full rounded-full py-6 bg-[#007AFF] text-white hover:bg-[#005bb5] font-semibold shadow-glow-keeper"
              />
            ) : (
              <>
                <Button
                  asChild
                  className="w-full rounded-full py-6 bg-[#007AFF] text-white hover:bg-[#005bb5] font-semibold shadow-glow-keeper"
                >
                  <Link href="/signup">{t('trialCta')}</Link>
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">{t('trialNoCard')}</p>
              </>
            )}
          </div>
        </Card>
      </div>

      {!hideOneOff && (
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-3xl border border-[#C5A059]/20 bg-[#16161A]/60 p-5">
          <div className="rounded-2xl bg-[#C5A059]/10 text-[#C5A059] p-3 shrink-0">
            <FileBadge className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white">{t('oneOffTitle')}</div>
            <div className="text-muted-foreground">{t('oneOffBody', { amount: fmt(pricing.saleDossier) })}</div>
          </div>
        </div>
      )}

      <div className="text-center text-[11px] text-muted-foreground space-y-1">
        <p>{t('vatNote')}</p>
        <p>{t('countryNote', { country: regionName(pricing.country, locale) })}</p>
      </div>
    </div>
  );
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
