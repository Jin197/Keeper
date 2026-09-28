import { getTranslations, getLocale } from 'next-intl/server';
import { ShieldCheck, ExternalLink, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/routing';
import { insuranceLink, daysUntil, shouldNudgeInsurance } from '@/lib/affiliates';
import { formatCurrency } from '@/lib/utils';
import type { Vehicle } from '@/lib/types';

interface Props {
  vehicles: Vehicle[];
  /** Owner's country; used when the vehicle has none. */
  country: string | null | undefined;
}

/**
 * "Your insurance renews in N days — compare now." Renewal is the one moment
 * switching insurer costs nothing, and comparison sites pay per lead, so this
 * card is both the most useful nudge we can give and a revenue line.
 *
 * Renders nothing when no vehicle is near renewal and every insured vehicle
 * already has a renewal date (nothing to ask for).
 */
export async function InsuranceRenewalCard({ vehicles, country }: Props) {
  const t = await getTranslations('insuranceNudge');
  const locale = await getLocale();

  const due = vehicles
    .filter((v) => shouldNudgeInsurance(v.insuranceRenewalDate))
    .sort((a, b) => (daysUntil(a.insuranceRenewalDate) ?? 0) - (daysUntil(b.insuranceRenewalDate) ?? 0));
  const missingDate = vehicles.filter((v) => (v.insuranceProvider || v.insuranceMonthly) && !v.insuranceRenewalDate);

  if (due.length === 0 && missingDate.length === 0) return null;

  if (due.length === 0) {
    const v = missingDate[0];
    return (
      <Card className="p-4 flex items-center gap-4">
        <div className="rounded-btn bg-muted text-muted-foreground p-2.5 shrink-0">
          <CalendarClock className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground flex-1">{t('setDate')}</p>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/vehicles/${v.id}/edit`}>{t('setDateCta')}</Link>
        </Button>
      </Card>
    );
  }

  const v = due[0];
  const days = daysUntil(v.insuranceRenewalDate) ?? 0;
  const link = insuranceLink(v.country ?? country);
  const when =
    days < 0
      ? new Date(v.insuranceRenewalDate!).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
      : days === 0
        ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day')
        : new Intl.RelativeTimeFormat(locale, { numeric: 'always' }).format(days, 'day');

  return (
    <Card className="p-5 border-keeper/30 bg-keeper/5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="rounded-btn bg-keeper/15 text-keeper p-3 shrink-0 w-fit">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{t('title', { when })}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {v.insuranceMonthly
              ? t('body', { provider: v.insuranceProvider || '—', amount: formatCurrency(v.insuranceMonthly, v.currency) })
              : t('bodyNoAmount')}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {v.make} {v.model} · {v.plate}
          </p>
        </div>
        {link && (
          <div className="shrink-0 space-y-1 text-right">
            <Button asChild>
              <a href={link.url} target="_blank" rel="noopener noreferrer sponsored">
                {t('compare', { provider: link.provider })}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            {link.tracked && <p className="text-[10px] text-muted-foreground">{t('partnerNote')}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
