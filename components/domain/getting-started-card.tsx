import { getTranslations } from 'next-intl/server';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Card } from '@/components/ui/card';
import type { Vehicle, FuelEntry, MaintenanceEntry } from '@/lib/types';

interface Props {
  vehicle: Vehicle;
  fuel: FuelEntry[];
  maintenance: MaintenanceEntry[];
}

/**
 * Three actions that turn a generic forecast into this car's forecast.
 * Computed from the data, so it disappears by itself once everything is done.
 */
export async function GettingStartedCard({ vehicle, fuel, maintenance }: Props) {
  const t = await getTranslations('gettingStarted');
  const steps = [
    { key: 'scan', done: fuel.some((f) => f.vehicleId === vehicle.id), href: `/fuel/scan?vehicle=${vehicle.id}` },
    { key: 'log', done: maintenance.some((m) => m.vehicleId === vehicle.id), href: `/maintenance/new?vehicle=${vehicle.id}` },
    { key: 'insurance', done: Boolean(vehicle.insuranceRenewalDate), href: `/vehicles/${vehicle.id}/edit` },
  ] as const;
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-base font-semibold">{t('title')}</h2>
        <span className="text-xs text-muted-foreground">{t('subtitle', { done, total: steps.length })}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
        <div className="h-full bg-eco transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key} className={`flex items-center gap-3 rounded-card border p-3 ${s.done ? 'border-eco/30 bg-eco/5' : 'border-border'}`}>
            {s.done ? <Check className="h-4 w-4 text-eco shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${s.done ? 'line-through text-muted-foreground' : ''}`}>{t(s.key)}</div>
              {!s.done && <div className="text-xs text-muted-foreground">{t(`${s.key}Hint`)}</div>}
            </div>
            {!s.done && (
              <Link href={s.href} className="text-xs font-medium text-keeper hover:underline inline-flex items-center gap-1 shrink-0">
                {t(`${s.key}Cta`)} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
