import { notFound } from 'next/navigation';
import {
  Activity,
  Gauge,
  Leaf,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader, Section } from '@/components/domain/page-header';
import { KpiCard } from '@/components/domain/kpi-card';
import { SpendChart } from '@/components/domain/spend-chart';
import { EnergyMix } from '@/components/domain/energy-mix';
import { Card } from '@/components/ui/card';
import { getDashboardData } from '@/lib/data';
import {
  computeCostPerKm,
  computeEcoScore,
  energyMix,
  monthlySpend,
} from '@/lib/computations';
import { BackLink } from '@/components/layout/back-link';
import { getAllUserInsuranceRecords } from '@/server/actions/insurance';
import { isSupabaseConfigured } from '@/lib/env';
import { formatCurrency, formatDistance } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

/**
 * Cross-fleet analytics — replaces the standalone /eco-score and the
 * "charts" half of the previous Dashboard.
 */
export default async function InsightsPage() {
  const t = await getTranslations('insights');
  const tTip = await getTranslations('infoTip');
  const locale = await getLocale();
  if (!isSupabaseConfigured()) notFound();
  const [{ profile, vehicles, fuel, maintenance }, insuranceRecords] =
    await Promise.all([getDashboardData(), getAllUserInsuranceRecords()]);
  if (!profile || vehicles.length === 0) {
    return (
      <div className="container py-10">
        <Card className="p-10 max-w-2xl mx-auto text-center">
          <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h1 className="font-display text-xl font-semibold mt-4">
            {t('emptyTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">{t('emptyHint')}</p>
        </Card>
      </div>
    );
  }

  const breakdowns = vehicles.map((v) =>
    computeCostPerKm(v, fuel, maintenance, 6, insuranceRecords),
  );
  const totalSpend = breakdowns.reduce((s, b) => s + b.total, 0);
  const totalDistance = breakdowns.reduce((s, b) => s + b.distance, 0);
  const fleetCostPerKm = totalDistance > 0 ? totalSpend / totalDistance : 0;
  const mix = energyMix(fuel);
  const monthly = monthlySpend(fuel, maintenance, 6, vehicles, locale);
  const eco = computeEcoScore(fuel);

  return (
    <div className="container py-6 lg:py-8 space-y-8">
      <BackLink href="/dashboard" label={t('back')} />
      <PageHeader title={t('title')} description={t('subtitle')} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={t('costPerKm')}
          value={fleetCostPerKm.toFixed(3)}
          unit={`${profile.currency}/km`}
          icon={<Gauge className="h-4 w-4" strokeWidth={1.5} />}
          explain={tTip('costPerKm')}
        />
        <KpiCard
          label={t('spend6')}
          value={totalSpend.toFixed(0)}
          unit={profile.currency}
          icon={<Wallet className="h-4 w-4" strokeWidth={1.5} />}
        />
        <KpiCard
          label={t('distance')}
          value={formatDistance(totalDistance, locale).replace(' km', '')}
          unit="km"
          icon={<Activity className="h-4 w-4" strokeWidth={1.5} />}
        />
        <KpiCard
          label={t('ecoScore')}
          value={eco ? String(eco.score) : '—'}
          unit="/100"
          variant={eco && eco.tier === 'excellent' ? 'premium' : 'default'}
          icon={<Leaf className="h-4 w-4" strokeWidth={1.5} />}
          hint={
            eco ? t('ecoHint', { pct: eco.electricSharePct, count: eco.sampleSize }) : t('ecoNone')
          }
          explain={tTip('ecoScore')}
        />
      </div>

      <Section
        title={t('monthlyTitle')}
        description={t('monthlyHint')}
      >
        <Card className="p-5">
          <SpendChart data={monthly} currency={profile.currency} />
        </Card>
      </Section>

      <Section
        title={t('mixTitle')}
        description={t('mixHint')}
      >
        <Card className="p-5">
          <EnergyMix
            thermal={mix.thermal}
            electric={mix.electric}
            thermalVolume={mix.thermalVolume}
            electricVolume={mix.electricVolume}
          />
        </Card>
      </Section>

      <Section
        title={t('compareTitle')}
        description={t('compareHint')}
      >
        <Card className="p-5">
          <ul className="space-y-2">
            {breakdowns
              .map((b, i) => ({ ...b, vehicle: vehicles[i] }))
              .sort((a, b) => b.costPerKm - a.costPerKm)
              .map((row) => (
                <li
                  key={row.vehicle.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-card border border-border/40 bg-muted/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {row.vehicle.make} {row.vehicle.model}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.vehicle.plate} · {t('driven', { distance: formatDistance(row.distance, locale) })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold">
                      {row.costPerKm.toFixed(3)} {profile.currency}/km
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {t('cumulative', { amount: formatCurrency(row.total, profile.currency) })}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      </Section>

      <p className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3" />
        {t('footnote')}
      </p>
    </div>
  );
}
