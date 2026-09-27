import { Link } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  ShieldCheck,
  Hash,
  Calendar,
  MapPin,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMaintenanceEntries, getVehicles } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';
import { formatCurrency, formatDate, formatDistance } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function MaintenanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isSupabaseConfigured()) return notFound();
  const [t, tCat, locale] = await Promise.all([getTranslations('maintenanceDetail'), getTranslations('categories'), getLocale()]);
  const [entries, vehicles] = await Promise.all([
    getMaintenanceEntries(),
    getVehicles(),
  ]);
  const entry = entries.find((m) => m.id === params.id);
  if (!entry) return notFound();
  const vehicle = vehicles.find((v) => v.id === entry.vehicleId);

  return (
    <div className="container py-6 lg:py-8 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href={vehicle ? `/vehicles/${vehicle.id}` : '/agenda'}>
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="default">{tCat(entry.category)}</Badge>
          <Badge variant="success">
            <ShieldCheck className="h-3 w-3" /> {t('certified')}
          </Badge>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {entry.description}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {vehicle && `${vehicle.make} ${vehicle.model} · ${vehicle.plate}`}
        </p>
      </div>

      <Card className="p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {t('totalCost')}
        </div>
        <div className="font-mono text-3xl font-bold tabular-nums mt-1">
          {formatCurrency(entry.cost, entry.currency)}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> {t('date')}
            </div>
            <div className="font-medium mt-1">
              {formatDate(entry.occurredAt, locale)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3 w-3" /> {t('mileage')}
            </div>
            <div className="font-mono font-medium mt-1 tabular-nums">
              {formatDistance(entry.mileageKm, locale)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {t('garage')}
            </div>
            <div className="font-medium mt-1">{entry.garageName}</div>
          </div>
          {entry.nextDueDate && (
            <div>
              <div className="text-xs text-muted-foreground">
                {t('nextDue')}
              </div>
              <div className="font-medium mt-1">
                {formatDate(entry.nextDueDate, locale)}
              </div>
            </div>
          )}
          {entry.nextDueMileage && (
            <div>
              <div className="text-xs text-muted-foreground">
                {t('nextMileage')}
              </div>
              <div className="font-mono font-medium mt-1 tabular-nums">
                {formatDistance(entry.nextDueMileage, locale)}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card variant="glass" className="p-4 flex items-center gap-3 text-xs">
        <Hash className="h-4 w-4 text-eco shrink-0" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground">
            {t('hash')}
          </div>
          <div className="font-mono truncate">{entry.hash}</div>
        </div>
        <Badge variant="success">{t('verified')}</Badge>
      </Card>
    </div>
  );
}
