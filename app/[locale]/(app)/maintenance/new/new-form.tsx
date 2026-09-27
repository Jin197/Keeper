'use client';

import { Link } from '@/lib/i18n/routing';
import { useRouter } from '@/lib/i18n/routing';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/domain/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormError } from '@/components/ui/form-error';
import { addMaintenanceAction } from '@/server/actions/maintenance';

export function NewMaintenanceForm({
  vehicles,
  defaultVehicleId,
  defaultCurrency,
}: {
  vehicles: { id: string; label: string }[];
  defaultVehicleId: string;
  defaultCurrency: string;
}) {
  const t = useTranslations('maintenanceForm');
  const tCat = useTranslations('categories');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(undefined);
      const res = await addMaintenanceAction(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(t('added'), {
        description: res.hash ? t('hash', { hash: res.hash.slice(0, 12) }) : undefined,
      });
      router.push('/maintenance');
    });
  };

  return (
    <div className="container py-6 lg:py-8 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/maintenance">
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </Button>

      <PageHeader
        title={t('title')}
        description={t('subtitle')}
      />

      <form action={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-5">
          <input type="hidden" name="currency" value={defaultCurrency} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vehicleId">{t('vehicle')}</Label>
              <Select
                id="vehicleId"
                name="vehicleId"
                defaultValue={defaultVehicleId}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">{t('category')}</Label>
              <Select id="category" name="category" defaultValue="oil">
                {(['oil', 'tires', 'brakes', 'filter', 'battery', 'inspection', 'belt', 'fluid', 'gearbox', 'other'] as const).map((c) => (
                  <option key={c} value={c}>
                    {tCat(c)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occurredAt">{t('date')}</Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mileageKm">{t('mileage')}</Label>
              <Input
                id="mileageKm"
                name="mileageKm"
                type="number"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">{t('cost')}</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                step="0.01"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="garageName">{t('garage')}</Label>
              <Input
                id="garageName"
                name="garageName"
                placeholder={t('garagePlaceholder')}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={t('descriptionPlaceholder')}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nextDueMileage">{t('nextDueKm')}</Label>
              <Input
                id="nextDueMileage"
                name="nextDueMileage"
                type="number"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextDueDate">{t('nextDueDate')}</Label>
              <Input id="nextDueDate" name="nextDueDate" type="date" />
            </div>
          </div>
        </Card>

        <FormError message={error} />

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href="/maintenance">{t('cancel')}</Link>
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? t('signing') : t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
