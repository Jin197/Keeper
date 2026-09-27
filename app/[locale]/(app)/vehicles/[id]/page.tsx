import { Link } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  TrendingUp,
  Gauge,
  Calendar,
  Hash,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteVehicleButton } from './delete-vehicle-button';
import { KnownIssuesPanel } from '@/components/domain/known-issues-panel';
import { SaleDossierButton } from '@/components/domain/sale-dossier-button';
import {
  getVehicle,
  getProfile,
  getFuelEntries,
  getMaintenanceEntries,
  getActiveAlerts,
} from '@/lib/data';
import { getKnownIssues } from '@/lib/vehicle-data/known-issues';
import { canExportCertificate } from '@/lib/entitlements';
import { resolvePricing, formatPrice } from '@/lib/pricing';
import { isSaleDossierConfigured } from '@/lib/env';
import { getLocale, getTranslations } from 'next-intl/server';
import { computeCostPerKm, tireWearPercent } from '@/lib/computations';
import { getVehicleFines } from '@/server/actions/fines';
import { getInsuranceRecords } from '@/server/actions/insurance';
import { formatCurrency, formatDistance, formatDate } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/env';
import { VehicleTabs } from './vehicle-tabs';

export const dynamic = 'force-dynamic';

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { purchase?: string };
}) {
  if (!isSupabaseConfigured()) return notFound();

  const [vehicle, profile, fuel, maintenance, alerts, fines, insuranceRecords] =
    await Promise.all([
      getVehicle(params.id),
      getProfile(),
      getFuelEntries(params.id),
      getMaintenanceEntries(params.id),
      getActiveAlerts(),
      getVehicleFines(params.id),
      getInsuranceRecords(params.id),
    ]);
  if (!vehicle) return notFound();

  // Official records + one-off dossier entitlement, fetched in parallel with
  // nothing else to wait on — both are cached upstream.
  const [knownIssues, entitlement, locale, tDossier] = await Promise.all([
    getKnownIssues(vehicle, profile?.country),
    canExportCertificate(profile, vehicle.id),
    getLocale(),
    getTranslations('saleDossier'),
  ]);
  const t = await getTranslations('vehicle');
  const pricing = resolvePricing(profile?.country ?? knownIssues.country, profile?.currency);
  const dossierPrice = isSaleDossierConfigured() ? formatPrice(pricing.saleDossier, pricing.currency, locale) : null;

  const cost = computeCostPerKm(vehicle, fuel, maintenance, 6, insuranceRecords);
  const lastTireService = maintenance.find((m) => m.category === 'tires');
  const tireWear = lastTireService
    ? tireWearPercent(
        vehicle.currentMileageKm,
        lastTireService.mileageKm,
        lastTireService.nextDueMileage,
      )
    : 0;
  const lastBrakeService = maintenance.find((m) => m.category === 'brakes');
  const brakeWear = lastBrakeService
    ? tireWearPercent(
        vehicle.currentMileageKm,
        lastBrakeService.mileageKm,
        lastBrakeService.nextDueMileage,
      )
    : 25;
  const myAlerts = alerts.filter((a) => a.vehicleId === vehicle.id);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-7xl mx-auto w-full">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/vehicles">
          <ChevronLeft className="h-4 w-4" /> {t('allVehicles')}
        </Link>
      </Button>

      {/* ── Header — identité du véhicule (toujours visible au-dessus des onglets) ── */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative aspect-[4/3] md:aspect-auto bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{vehicle.year}</Badge>
                <Badge variant="outline">
                  {t(vehicle.fuelType)}
                </Badge>
              </div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
                {vehicle.make} {vehicle.model}
              </h1>
              {(vehicle.trim || vehicle.color) && (
                <div className="text-sm text-muted-foreground">
                  {vehicle.trim || ''}
                  {vehicle.color ? ` · ${vehicle.color}` : ''}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/vehicles/${vehicle.id}/edit`}>
                    <Pencil className="h-4 w-4" /> {t('edit')}
                  </Link>
                </Button>
                <DeleteVehicleButton
                  id={vehicle.id}
                  label={`${vehicle.make} ${vehicle.model}`}
                />
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-3 w-3" /> {t('plate')}
                </dt>
                <dd className="font-mono font-medium mt-1">{vehicle.plate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-3 w-3" /> {t('mileage')}
                </dt>
                <dd className="font-mono font-medium mt-1 tabular-nums">
                  {formatDistance(vehicle.currentMileageKm)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {t('acquired')}
                </dt>
                <dd className="font-medium mt-1">
                  {formatDate(vehicle.purchaseDate, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" /> {t('estimatedValue')}
                </dt>
                <dd className="font-mono font-medium mt-1 tabular-nums">
                  {formatCurrency(
                    vehicle.estimatedResaleValue,
                    vehicle.currency,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      {searchParams?.purchase === 'success' && (
        <div className="rounded-card border border-eco/30 bg-eco/10 p-3 text-sm text-eco">{tDossier('purchaseSuccess')}</div>
      )}
      {searchParams?.purchase === 'cancelled' && (
        <div className="rounded-card border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{tDossier('purchaseCancelled')}</div>
      )}

      {/* ── What official records say (recalls, MOT…) — the "why should I care" block ── */}
      <KnownIssuesPanel report={knownIssues} variant="compact" />

      {/* ── 5 onglets : Aperçu / Énergie / Maintenance / Coûts / Conformité ── */}
      <VehicleTabs
        vehicle={vehicle}
        fuel={fuel}
        maintenance={maintenance}
        alerts={myAlerts}
        fines={fines}
        insuranceRecords={insuranceRecords}
        cost={cost}
        tireWear={tireWear}
        brakeWear={brakeWear}
        lastTireServiceAt={lastTireService?.occurredAt ?? null}
        lastBrakeServiceAt={lastBrakeService?.occurredAt ?? null}
        showCompliance={knownIssues.country === 'FR' || fines.length > 0}
      />

      <SaleDossierButton vehicleId={vehicle.id} allowed={entitlement.allowed} via={entitlement.via} priceLabel={dossierPrice} />
    </div>
  );
}
