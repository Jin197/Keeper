import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { AlertTriangle, Activity, Gauge, Wallet, CalendarClock, BookOpen, Database, ScanSearch } from 'lucide-react';
import { PageHeader, Section } from '@/components/domain/page-header';
import { KpiCard } from '@/components/domain/kpi-card';
import { KnownIssuesPanel } from '@/components/domain/known-issues-panel';
import { PartsLinkButton } from '@/components/domain/parts-link-button';
import { SaleDossierButton } from '@/components/domain/sale-dossier-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/routing';
import { getVehicle, getProfile, getMaintenanceEntries, getFuelEntries } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { generateMaintenancePlan, type MaintenanceTask } from '@/lib/maintenance/plan';
import { resolveSchedule } from '@/lib/maintenance/schedules';
import { getKnownIssues, resolveVehicleCountry } from '@/lib/vehicle-data/known-issues';
import { SYSTEM_TO_CATEGORY, SYSTEM_LABEL_KEY } from '@/lib/vehicle-data/failure-rates';
import { detectAnomaly, type TelemetryData } from '@/lib/phm/engine';
import { canExportCertificate } from '@/lib/entitlements';
import { resolvePricing, formatPrice } from '@/lib/pricing';
import { isSaleDossierConfigured } from '@/lib/env';
import { formatCurrency, formatDistance } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Health & upcoming costs.
 *
 * Replaces the former "AI diagnostic" screen. Everything shown here comes
 * from one of three places and says which: the owner's logged services, the
 * manufacturer's service intervals, or an official public record (MOT /
 * NHTSA). No simulated sensor data, no invented confidence percentages.
 */
export default async function HealthPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const t = await getTranslations('health');
  const tKI = await getTranslations('knownIssues');
  const tTip = await getTranslations('infoTip');
  const locale = await getLocale();

  const [vehicle, profile] = await Promise.all([getVehicle(vehicleId), getProfile()]);
  if (!vehicle) notFound();

  const supabase = createClient();
  const [history, fuel, knownIssues, entitlement, telemetryRow] = await Promise.all([
    getMaintenanceEntries(vehicleId),
    getFuelEntries(vehicleId),
    getKnownIssues(vehicle, profile?.country),
    canExportCertificate(profile, vehicleId),
    supabase
      .from('telemetry_obd' as never)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('time', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r.data as Record<string, number | string> | null),
  ]);

  const country = resolveVehicleCountry(vehicle, profile?.country);

  // Official data wins over estimates: the MOT expiry sets the inspection
  // date and the MOT odometer trail sets the annual mileage.
  const schedule = resolveSchedule(vehicle);
  const plan = generateMaintenancePlan(
    { ...vehicle, country },
    history,
    fuel,
    new Date(),
    locale === 'fr' ? 'fr' : 'en',
    { inspectionDueDate: knownIssues.mot?.motExpiryDate, annualMileageKm: knownIssues.mot?.annualMileageKm, schedule },
  );
  const annualKm = plan.annualMileageKm;
  const annualHint = knownIssues.mot?.annualMileageKm ? t('annualHintMot') : t('annualHint');

  const next = plan.tasks[0];
  const withHistory = new Set(history.map((h) => h.category));
  const missing = plan.tasks.filter((task) => !withHistory.has(task.category)).length;

  // Real OBD telemetry, if a device ever posted any. Otherwise say nothing.
  const anomaly = telemetryRow
    ? detectAnomaly({
        rpm: Number(telemetryRow.rpm ?? 0),
        engineLoad: Number(telemetryRow.engine_load ?? 0),
        speed: Number(telemetryRow.speed ?? 0),
        maf: Number(telemetryRow.maf ?? 0),
        iat: Number(telemetryRow.iat ?? 0),
        coolantTemp: Number(telemetryRow.coolant_temp ?? 0),
        batteryVoltage: Number(telemetryRow.battery_voltage ?? 12),
      } satisfies TelemetryData)
    : null;

  const pricing = resolvePricing(profile?.country ?? country, profile?.currency);
  const priceLabel = isSaleDossierConfigured() ? formatPrice(pricing.saleDossier, pricing.currency, locale) : null;

  // Population stat per forecast category: the worst DVSA system that maps to it.
  const statFor = (category: MaintenanceTask['category']) => {
    const p = knownIssues.failureProfile;
    if (!p || p.basis !== 'model') return null;
    const s = p.systems.filter((x) => SYSTEM_TO_CATEGORY[x.system] === category && x.rate >= 0.03).sort((a, b) => b.rate - a.rate)[0];
    return s ? { ...s, model: `${p.make} ${p.model}`, band: p.kmBand } : null;
  };

  const when = (task: MaintenanceTask) =>
    task.daysUntilDue < 0
      ? t('daysAgo', { days: -task.daysUntilDue })
      : task.daysUntilDue === 0
        ? t('today')
        : t('inDays', { days: task.daysUntilDue });

  return (
    <div className="container py-6 lg:py-8 space-y-8">
      <PageHeader
        title={t('title')}
        description={t('subtitle', { make: vehicle.make, model: vehicle.model, mileage: formatDistance(vehicle.currentMileageKm) })}
        action={
          <div className="flex gap-2">
            <SaleDossierButton vehicleId={vehicleId} allowed={entitlement.allowed} via={entitlement.via} priceLabel={priceLabel} variant="button" />
            <Button variant="outline" asChild>
              <Link href={`/vehicles/${vehicleId}`}>{t('back')}</Link>
            </Button>
          </div>
        }
      />

      {anomaly?.flag && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 sm:p-6 flex items-start gap-4">
          <div className="bg-destructive text-destructive-foreground p-3 rounded-xl shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-destructive text-lg">OBD</h2>
            <p className="text-sm text-destructive/90 mt-1">{anomaly.reason}</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard
          label={t('budget12')}
          value={formatCurrency(plan.budget12mo, vehicle.currency)}
          hint={t('budgetHint')}
          icon={<Wallet className="h-4 w-4 text-amber-500" />}
          explain={tTip('budget12')}
        />
        <KpiCard
          label={t('annualMileage')}
          value={`${Math.round(annualKm / 1000)}k km`}
          hint={annualHint}
          icon={<Gauge className="h-4 w-4 text-keeper" />}
          explain={tTip('annualMileage')}
        />
        <KpiCard
          label={t('nextDue')}
          value={next ? next.title : '—'}
          hint={next ? when(next) : ''}
          icon={<CalendarClock className={`h-4 w-4 ${next?.severity === 'critical' ? 'text-destructive' : 'text-eco'}`} />}
        />
      </div>

      <KnownIssuesPanel report={knownIssues} variant="full" />

      {missing > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
          <div className="bg-amber-500 text-white p-2.5 rounded-xl shrink-0">
            <ScanSearch className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-600 dark:text-amber-400">{t('missingHistory', { count: missing, total: plan.tasks.length })}</p>
            <Button variant="outline" size="sm" className="mt-3 border-amber-500/30" asChild>
              <Link href={`/maintenance/new?vehicle=${vehicleId}`}>{t('logService')}</Link>
            </Button>
          </div>
        </div>
      )}

      <Section
        title={t('components')}
        description={
          plan.scheduleLabel
            ? `${t('scheduleFound', { label: plan.scheduleLabel })}${plan.scheduleVerified ? '' : ` (${t('unverified')})`} · ${t('componentsHint')}`
            : `${t('scheduleGeneric', { fuel: vehicle.fuelType })} · ${t('componentsHint')}`
        }
      >
        <div className="grid md:grid-cols-2 gap-4">
          {plan.tasks.map((task) => {
            // Life remaining: km-based when the task has an interval, else time-based over a year.
            const pct =
              task.kmUntilDue !== undefined && task.intervalKm
                ? Math.min(100, Math.max(0, Math.round((Math.max(0, task.kmUntilDue) / task.intervalKm) * 100)))
                : Math.min(100, Math.max(0, Math.round((task.daysUntilDue / 365) * 100)));
            const tone = task.severity === 'critical' ? 'bg-destructive' : task.severity === 'warning' ? 'bg-amber-500' : 'bg-eco';
            return (
              <Card key={task.category} className={`p-5 space-y-4 ${task.severity === 'critical' ? 'border-destructive/40' : task.severity === 'warning' ? 'border-amber-500/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`rounded-btn p-2.5 shrink-0 ${task.severity === 'critical' ? 'bg-destructive/15 text-destructive' : task.severity === 'warning' ? 'bg-amber-500/15 text-amber-500' : 'bg-eco/15 text-eco'}`}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold">{task.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      <span className="text-[10px] flex items-center gap-1 mt-1 text-muted-foreground">
                        {task.source === 'generic' || task.source === 'model' ? <BookOpen className="h-2.5 w-2.5" /> : <Database className="h-2.5 w-2.5" />}
                        {task.source === 'model' ? t('sourceModel') : task.source === 'generic' ? t('sourceOem') : t('sourceHistory')}
                        {task.source === 'model' && task.scheduleVerified === false && <span className="text-amber-500">· {t('unverified')}</span>}
                      </span>
                    </div>
                  </div>
                  <Badge variant={task.severity === 'critical' ? 'danger' : task.severity === 'warning' ? 'warning' : 'success'} className="shrink-0">
                    {task.severity === 'critical' ? t('overdue') : task.severity === 'warning' ? t('soon') : t('planned')}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{task.kmUntilDue !== undefined ? t('remaining', { km: Math.max(0, task.kmUntilDue).toLocaleString(locale) }) : when(task)}</span>
                    <span className="font-mono">{t('estimated', { amount: formatCurrency(task.estimatedCost, vehicle.currency) })}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{when(task)}</span>
                    <PartsLinkButton country={country} category={task.category} vehicle={vehicle} />
                  </div>
                  {task.note && <p className="text-[11px] text-muted-foreground pt-1">{task.note}</p>}
                  {task.weakPoints?.map((w, i) => (
                    <p key={i} className={`text-[11px] pt-1 ${w.severity === 'safety' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                      <span className="font-medium">{t('weakPoints')}: </span>
                      {locale === 'fr' ? w.fr : w.en}
                    </p>
                  ))}
                  {(() => {
                    const stat = statFor(task.category);
                    return stat ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                        {t('modelStat', { pct: Math.round(stat.rate * 100), model: stat.model, system: tKI(SYSTEM_LABEL_KEY[stat.system]).toLowerCase(), band: stat.band })}
                        {stat.fleetRate != null && ` ${t('modelStatFleet', { pct: Math.round(stat.fleetRate * 100) })}`}
                      </p>
                    ) : null;
                  })()}
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {!telemetryRow && <p className="text-[11px] text-muted-foreground">{t('telemetryNote')}</p>}
    </div>
  );
}
