'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FileDown, Loader2, Sparkles, FileBadge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/lib/i18n/routing';

interface Props {
  vehicleId: string;
  /** Caller already may download (Pro, trial, or prior purchase). */
  allowed: boolean;
  via: 'premium' | 'purchase' | null;
  /** Localised one-off price, e.g. "£7.99". Null when Stripe isn't configured for it. */
  priceLabel: string | null;
  /** Card layout (vehicle page) vs. single button (page header). */
  variant?: 'card' | 'button';
}

export function SaleDossierButton({ vehicleId, allowed, via, priceLabel, variant = 'card' }: Props) {
  const t = useTranslations('saleDossier');
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const buy = async () => {
    setPending(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'sale_dossier', vehicleId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Error');
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
      setPending(false);
    }
  };

  const downloadHref = `/api/vehicles/${vehicleId}/certificate`;

  if (variant === 'button') {
    return allowed ? (
      <Button variant="outline" className="gap-2" asChild>
        <a href={downloadHref} target="_blank" rel="noopener noreferrer">
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">{t('download')}</span>
        </a>
      </Button>
    ) : priceLabel ? (
      <Button variant="outline" className="gap-2" onClick={buy} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBadge className="h-4 w-4" />}
        <span className="hidden sm:inline">{t('buy', { amount: priceLabel })}</span>
      </Button>
    ) : (
      <Button variant="outline" className="gap-2" asChild>
        <Link href="/settings/billing">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">{t('goPro')}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Card className="p-5 space-y-3 border-[#C5A059]/30 bg-[#C5A059]/5">
      <div className="flex items-start gap-3">
        <div className="rounded-btn bg-[#C5A059]/15 text-[#C5A059] p-2.5 shrink-0">
          <FileBadge className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">{t('title')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('body')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {allowed ? (
          <>
            <Button size="sm" asChild>
              <a href={downloadHref} target="_blank" rel="noopener noreferrer">
                <FileDown className="h-4 w-4" /> {t('download')}
              </a>
            </Button>
            <span className="text-xs text-muted-foreground">{via === 'purchase' ? t('purchased') : t('included')}</span>
          </>
        ) : (
          <>
            {priceLabel && (
              <Button size="sm" onClick={buy} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBadge className="h-4 w-4" />}
                {t('buy', { amount: priceLabel })}
              </Button>
            )}
            {priceLabel && <span className="text-xs text-muted-foreground">{t('or')}</span>}
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/billing">
                <Sparkles className="h-4 w-4" /> {t('goPro')}
              </Link>
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
