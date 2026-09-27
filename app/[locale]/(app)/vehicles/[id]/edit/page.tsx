import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/domain/page-header';
import { Button } from '@/components/ui/button';
import { getVehicle } from '@/lib/data';
import { getInsuranceRecords } from '@/server/actions/insurance';
import { isSupabaseConfigured } from '@/lib/env';
import { VehicleEditForm } from './vehicle-edit-form';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function VehicleEditPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isSupabaseConfigured()) return notFound();
  const t = await getTranslations('vehicleEdit');
  const [vehicle, insuranceRecords] = await Promise.all([
    getVehicle(params.id),
    getInsuranceRecords(params.id),
  ]);
  if (!vehicle) return notFound();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-3xl mx-auto w-full">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href={`/vehicles/${vehicle.id}`}>
          <ChevronLeft className="h-4 w-4" />
          {t('back')}
        </Link>
      </Button>

      <PageHeader
        title={t('title')}
        description={t('subtitle', { vehicle: `${vehicle.make} ${vehicle.model} · ${vehicle.plate}` })}
      />

      <VehicleEditForm
        vehicle={vehicle}
        initialInsuranceRecords={insuranceRecords}
      />
    </div>
  );
}
