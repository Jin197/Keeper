import { Link } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import {
  Calendar,
  Gauge,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Brain,
  BookOpen,
  Wrench,
} from 'lucide-react';
import { PageHeader, Section } from '@/components/domain/page-header';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  getVehicle,
  getMaintenanceEntries,
  getFuelEntries,
} from '@/lib/data';
import {
  generateMaintenancePlan,
  type MaintenanceTask,
  type PlanSource,
} from '@/lib/maintenance/plan';
import { formatCurrency, formatDistance, formatDate } from '@/lib/utils';
import { resolveSchedule } from '@/lib/maintenance/schedules';
import { isSupabaseConfigured } from '@/lib/env';
import { PlanTaskCard } from './plan-task-card';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function MaintenancePlanPage({
  params,
}: {
  params: Promise<{ vehicleId: string; locale: string }>;
}) {
  const { vehicleId } = await params;
  const t = await getTranslations('plan');
  const locale = await getLocale();
  if (!isSupabaseConfigured()) notFound();

  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) notFound();

  const [history, fuel] = await Promise.all([
    getMaintenanceEntries(vehicleId),
    getFuelEntries(vehicleId),
  ]);

  const schedule = resolveSchedule(vehicle);
  const plan = generateMaintenancePlan(vehicle, history, fuel, new Date(), locale === 'fr' ? 'fr' : 'en', { schedule });

  const overdue = plan.tasks.filter((t) => t.severity === 'critical');
  const upcoming = plan.tasks.filter((t) => t.severity === 'warning');
  const planned = plan.tasks.filter((t) => t.severity === 'info');

  return (
    <div className="container py-6 lg:py-8 space-y-6">
      <PageHeader
        title={t('title')}
        description={`${vehicle.make} ${vehicle.model} · ${vehicle.year} · ${formatDistance(vehicle.currentMileageKm, locale)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/vehicles/${vehicleId}`}>{t('back')}</Link>
            </Button>
            <Button asChild>
              <Link href="/maintenance/new">
                <Plus className="h-4 w-4" /> {t('logService')}
              </Link>
            </Button>
          </div>
        }
      />

      <SourceBanner source={plan.source} confidence={plan.globalConfidence} historyCount={history.length} scheduleLabel={plan.scheduleLabel} scheduleVerified={plan.scheduleVerified} />

      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard
          label={t('annualMileage')}
          value={t('perYear', { km: Math.round(plan.annualMileageKm / 1000) })}
          hint={fuel.length >= 2 ? t('annualHintData') : t('annualHintDefault')}
          icon={<Gauge className="h-4 w-4" strokeWidth={1.5} />}
        />
        <KpiCard
          label={t('budget')}
          value={formatCurrency(plan.budget12mo, vehicle.currency)}
          hint={t('budgetHint', { count: plan.tasks.filter((task) => new Date(task.dueAtDate).getTime() < Date.now() + 365 * 86400000).length })}
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
        />
        <KpiCard
          label={t('basis')}
          value={plan.source === 'digital-twin' ? t('sourceTwin') : plan.source === 'hybrid' ? t('sourceHybrid') : plan.source === 'model' ? t('sourceModel') : t('sourceOem')}
          hint={
            plan.source === 'digital-twin'
              ? t('basisTwin')
              : plan.source === 'hybrid'
                ? t('basisHybrid')
                : plan.source === 'model'
                  ? t('basisModel')
                  : t('basisGeneric')
          }
          icon={
            plan.source === 'digital-twin' ? (
              <Brain className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <BookOpen className="h-4 w-4" strokeWidth={1.5} />
            )
          }
        />
      </div>

      {overdue.length > 0 && (
        <Section
          title={t('overdue', { count: overdue.length })}
          description={t('overdueHint')}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {overdue.map((task) => (
              <PlanTaskCard
                key={task.category}
                task={task}
                vehicleId={vehicle.id}
                vehicleCurrency={vehicle.currency}
                country={vehicle.country}
                vehicle={vehicle}
              />
            ))}
          </div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section
          title={t('upcoming', { count: upcoming.length })}
          description={t('upcomingHint')}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.map((task) => (
              <PlanTaskCard
                key={task.category}
                task={task}
                vehicleId={vehicle.id}
                vehicleCurrency={vehicle.currency}
                country={vehicle.country}
                vehicle={vehicle}
              />
            ))}
          </div>
        </Section>
      )}

      {planned.length > 0 && (
        <Section
          title={t('planned', { count: planned.length })}
          description={t('plannedHint')}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {planned.map((task) => (
              <PlanTaskCard
                key={task.category}
                task={task}
                vehicleId={vehicle.id}
                vehicleCurrency={vehicle.currency}
                country={vehicle.country}
                vehicle={vehicle}
              />
            ))}
          </div>
        </Section>
      )}

      {plan.tasks.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-eco mx-auto" strokeWidth={1.5} />
          <h2 className="font-display text-lg font-semibold mt-3">
            {t('nothingTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('nothingHint')}
          </p>
        </Card>
      )}
    </div>
  );
}

async function SourceBanner({
  source,
  confidence,
  historyCount,
  scheduleLabel,
  scheduleVerified,
}: {
  source: PlanSource;
  confidence: number;
  historyCount: number;
  scheduleLabel: string | null;
  scheduleVerified: boolean;
}) {
  const t = await getTranslations('plan');
  if (source === 'model') {
    return (
      <Card className="p-5 border-veloce/30">
        <div className="flex items-start gap-4">
          <div className="rounded-btn bg-veloce/10 text-veloce p-2.5 shrink-0">
            <BookOpen className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-semibold">{t('modelTitle')}</h2>
              {!scheduleVerified && <Badge variant="warning" className="text-[10px]">{t('unverified')}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t('modelBody', { label: scheduleLabel ?? '' })}</p>
          </div>
        </div>
      </Card>
    );
  }
  if (source === 'digital-twin') {
    return (
      <Card variant="premium" className="p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-btn bg-veloce/15 text-veloce p-2.5 shrink-0">
            <Brain className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-semibold">{t('twinTitle')}</h2>
              <Badge variant="premium" className="text-[10px]">
                <Sparkles className="h-2.5 w-2.5" /> {t('twinBadge')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('twinBody', { count: historyCount })}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={confidence * 100} className="flex-1 h-1.5" />
              <span className="font-mono text-xs tabular-nums">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (source === 'hybrid') {
    return (
      <Card className="p-5 border-veloce/30">
        <div className="flex items-start gap-4">
          <div className="rounded-btn bg-veloce/10 text-veloce p-2.5 shrink-0">
            <Brain className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold">{t('hybridTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('hybridBody', { count: historyCount })}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-btn bg-muted text-muted-foreground p-2.5 shrink-0">
          <BookOpen className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold">{t('genericTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('genericBody')}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/maintenance/new">
              <Plus className="h-3.5 w-3.5" /> {t('genericCta')}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

