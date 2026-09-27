import { Link } from '@/lib/i18n/routing';
import { Battery, Fuel, Zap, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vehicle } from '@/lib/types';
import { formatCurrency, formatDistance } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';

const fuelIcon = {
  thermal: { icon: Fuel, color: 'text-amber-500' },
  electric: { icon: Zap, color: 'text-eco' },
  hybrid: { icon: Battery, color: 'text-veloce' },
};

export async function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const t = await getTranslations('components');
  const locale = await getLocale();
  const F = fuelIcon[vehicle.fuelType];
  const Icon = F.icon;
  return (
    <Link href={`/vehicles/${vehicle.id}`} className="group">
      <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5">
        <div className="relative aspect-[16/9] bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vehicle.imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="muted" className={F.color}>
              <Icon className="h-3 w-3" strokeWidth={2} />
              {t(vehicle.fuelType)}
            </Badge>
          </div>
          <ArrowUpRight className="absolute top-3 right-3 h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display font-semibold text-base">
                {vehicle.make} {vehicle.model}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {[vehicle.year, vehicle.trim, vehicle.plate].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm tabular-nums">
                {formatDistance(vehicle.currentMileageKm, locale)}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t('estimatedValue')}</div>
              <div className="font-mono font-semibold tabular-nums">
                {formatCurrency(vehicle.estimatedResaleValue, vehicle.currency)}
              </div>
            </div>
            <Badge
              variant={
                vehicle.resaleTrend === 'up'
                  ? 'success'
                  : vehicle.resaleTrend === 'down'
                    ? 'warning'
                    : 'muted'
              }
            >
              {vehicle.resaleTrend === 'up' ? t('trendUp') : vehicle.resaleTrend === 'down' ? t('trendDown') : t('trendStable')}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
