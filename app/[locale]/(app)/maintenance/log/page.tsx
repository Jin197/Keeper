import { Link } from '@/lib/i18n/routing';
import { ChevronLeft, Download, ShieldCheck, Hash } from 'lucide-react';
import { PageHeader } from '@/components/domain/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMaintenanceEntries, getVehicles, getProfile } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';
import { formatCurrency, formatDate, formatDistance } from '@/lib/utils';
import { shortHash } from '@/lib/hash';
import { ExportLogButton } from './export-button';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CertifiedLogPage() {
  const t = await getTranslations('log');
  const locale = await getLocale();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const [entries, vehicles, profile] = await Promise.all([
    getMaintenanceEntries(),
    getVehicles(),
    getProfile(),
  ]);

  if (entries.length === 0) {
    return (
      <div className="container py-12 max-w-xl">
        <Card className="p-10 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-veloce" strokeWidth={1.5} />
          <h1 className="font-display text-xl font-bold mt-4">
            {t('emptyTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t('emptyHint')}
          </p>
          <Button asChild className="mt-5">
            <Link href="/maintenance/new">{t('addService')}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const isPremium = profile?.planTier === 'premium' || profile?.planTier === 'family' || !!profile?.isTrial;

  return (
    <div className="container py-6 lg:py-8 max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/agenda">
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </Button>

      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={<ExportLogButton premium={isPremium} />}
      />

      <Card variant="premium" className="p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-btn bg-eco/20 text-eco p-2.5">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-display font-semibold">
              {t('integrityTitle')}
            </div>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              {t('integrityBody')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {entries[0] && (
                <Badge variant="success">
                  <Hash className="h-3 w-3" /> {t('head', { hash: shortHash(entries[0].hash) })}
                </Badge>
              )}
              <Badge variant="muted">{t('entries', { count: entries.length })}</Badge>
              <Badge variant="muted">
                {t('updated', { date: formatDate(new Date(), locale) })}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <ol className="relative border-l border-border ml-3 space-y-6">
        {entries.map((m) => {
          const v = vehicles.find((veh) => veh.id === m.vehicleId);
          return (
            <li key={m.id} className="ml-6">
              <span className="absolute -left-2 mt-2 h-4 w-4 rounded-full border-2 border-veloce bg-background" />
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(m.occurredAt, locale)} · {formatDistance(m.mileageKm, locale)}
                    </div>
                    <div className="font-display font-semibold mt-1">
                      {m.description}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {v && `${v.make} ${v.model} · `}
                      {m.garageName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold tabular-nums">
                      {formatCurrency(m.cost, m.currency)}
                    </div>
                    {m.nextDueMileage && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t('next', { distance: formatDistance(m.nextDueMileage, locale) })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    <span className="font-mono">{shortHash(m.hash)}</span>
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    <ShieldCheck className="h-2.5 w-2.5" /> {t('verified')}
                  </Badge>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

async function NotConfigured() {
  const t = await getTranslations('log');
  return (
    <div className="container py-12">
      <Card className="p-10 max-w-2xl mx-auto text-center">
        <h1 className="font-display text-xl font-bold">{t('notConfigured')}</h1>
        <p className="text-muted-foreground mt-2">{t('notConfiguredHint')}</p>
      </Card>
    </div>
  );
}
