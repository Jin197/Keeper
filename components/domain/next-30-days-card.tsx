import { getTranslations, getLocale } from 'next-intl/server';
import { CalendarClock, Fuel, ShieldCheck, Wrench, ArrowRight, Wallet } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Card } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/info-tip';
import { generateMaintenancePlan } from '@/lib/maintenance/plan';
import { resolveSchedule } from '@/lib/maintenance/schedules';
import { upcomingWithin } from '@/lib/reminders/forecast';
import { daysUntil } from '@/lib/affiliates';
import { formatCurrency } from '@/lib/utils';
import type { Vehicle, FuelEntry, MaintenanceEntry } from '@/lib/types';

interface Props {
  vehicle: Vehicle;
  fuel: FuelEntry[];
  maintenance: MaintenanceEntry[];
}

/**
 * The product promise, on the home screen: what this car is likely to cost in
 * the next 30 days and why. Four tiles, one number, one link to the detail.
 * Everything is derived from the same plan the Health page uses, so the two
 * never disagree.
 */
export async function Next30DaysCard({ vehicle, fuel, maintenance }: Props) {
  const t = await getTranslations('next30');
  const locale = await getLocale();
  const now = new Date();

  // Fuel: average monthly spend over the last 90 days of this vehicle's receipts.
  const since = now.getTime() - 90 * 86400000;
  const recent = fuel.filter((f) => f.vehicleId === vehicle.id && new Date(f.occurredAt).getTime() >= since);
  const fuelMonthly = recent.length >= 2 ? recent.reduce((s, f) => s + f.totalPrice, 0) / 3 : null;

  const plan = generateMaintenancePlan(vehicle, maintenance, fuel, now, locale === 'fr' ? 'fr' : 'en', { schedule: resolveSchedule(vehicle) });
  const due = upcomingWithin(plan.tasks, 30);
  const nextService = due.find((task) => task.category !== 'inspection') ?? null;
  const inspection = plan.tasks.find((task) => task.category === 'inspection') ?? null;
  const servicesCost = due.filter((task) => task.category !== 'inspection').reduce((s, task) => s + task.estimatedCost, 0);
  const insuranceDays = daysUntil(vehicle.insuranceRenewalDate, now);

  const when = (days: number) => (days < 0 ? t('daysAgo', { days: -days }) : days === 0 ? t('today') : t('inDays', { days }));
  const money = (n: number) => formatCurrency(n, vehicle.currency);
  const total = (fuelMonthly ?? 0) + servicesCost;

  return (
    <Card variant="premium" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-keeper animate-pulse" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wider">{t('title')}</h2>
            <InfoTip text={[t('whyFuel'), t('whyService'), t('whyInspection'), t('whyInsurance')].join(' ')} label={t('whyTitle')} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('subtitle', { vehicle: `${vehicle.make} ${vehicle.model}` })}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-end gap-1">
            <Wallet className="h-3 w-3" /> {t('total')}
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums">{fuelMonthly == null && servicesCost === 0 ? '—' : money(total)}</div>
          <div className="text-[10px] text-muted-foreground">{t('totalHint')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <Tile icon={Fuel} tone="text-emerald-400" label={t('fuel')} value={fuelMonthly != null ? money(fuelMonthly) : '—'} hint={fuelMonthly != null ? t('fuelHint') : t('fuelNone')} />
        <Tile
          icon={Wrench}
          tone={nextService ? (nextService.severity === 'critical' ? 'text-destructive' : 'text-amber-400') : 'text-muted-foreground'}
          label={t('service')}
          value={nextService ? money(nextService.estimatedCost) : '—'}
          hint={nextService ? t('serviceHint', { title: nextService.title, when: when(nextService.daysUntilDue) }) : t('serviceNone')}
        />
        <Tile
          icon={ShieldCheck}
          tone={inspection && inspection.daysUntilDue <= 30 ? 'text-amber-400' : 'text-keeper'}
          label={t('inspection')}
          value={inspection ? when(inspection.daysUntilDue) : '—'}
          hint={inspection ? new Date(inspection.dueAtDate).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        />
        <Tile
          icon={CalendarClock}
          tone={insuranceDays != null && insuranceDays <= 30 ? 'text-amber-400' : 'text-muted-foreground'}
          label={t('insurance')}
          value={insuranceDays != null ? when(insuranceDays) : '—'}
          hint={insuranceDays != null ? t('insuranceHint', { when: new Date(vehicle.insuranceRenewalDate!).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }) : t('insuranceNone')}
        />
      </div>

      <Link href={`/maintenance/prognostics/${vehicle.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm text-keeper hover:underline">
        {t('open')} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

function Tile({ icon: Icon, tone, label, value, hint }: { icon: typeof Fuel; tone: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card border border-border/60 bg-background/40 p-3 space-y-1 min-w-0">
      <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${tone}`}>
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-mono text-lg font-semibold tabular-nums truncate">{value}</div>
      <div className="text-[11px] text-muted-foreground truncate" title={hint}>{hint}</div>
    </div>
  );
}
