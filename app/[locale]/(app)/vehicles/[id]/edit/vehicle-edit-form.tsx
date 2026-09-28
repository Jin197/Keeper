'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Hash,
  Save,
  ShieldAlert,
  Wallet,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Section } from '@/components/domain/page-header';
import { updateVehicleAction } from '@/server/actions/vehicles';
import { InsuranceManager } from './insurance-manager';
import { VehiclePhotoUpload } from '@/components/domain/vehicle-photo-upload';
import type { Vehicle, InsuranceRecord } from '@/lib/types';

interface Props {
  vehicle: Vehicle;
  initialInsuranceRecords: InsuranceRecord[];
}

export function VehicleEditForm({ vehicle, initialInsuranceRecords }: Props) {
  const t = useTranslations('vehicleEdit');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState(String(vehicle.year));
  const [plate, setPlate] = useState(vehicle.plate);
  const [vin, setVin] = useState(vehicle.vin ?? '');
  const [trim, setTrim] = useState(vehicle.trim ?? '');
  const [color, setColor] = useState(vehicle.color ?? '');
  const [currentMileage, setCurrentMileage] = useState(
    String(vehicle.currentMileageKm),
  );
  const [purchaseDate, setPurchaseDate] = useState(
    vehicle.purchaseDate.slice(0, 10),
  );
  const [purchasePrice, setPurchasePrice] = useState(
    String(vehicle.purchasePrice ?? ''),
  );
  const [insuranceProvider, setInsuranceProvider] = useState(
    vehicle.insuranceProvider ?? '',
  );
  const [insuranceRenewalDate, setInsuranceRenewalDate] = useState(
    vehicle.insuranceRenewalDate?.slice(0, 10) ?? '',
  );
  const [registrationFormula, setRegistrationFormula] = useState(
    vehicle.registrationFormulaNumber ?? '',
  );
  // Latest public Supabase URL returned by the photo upload component;
  // submitted to updateVehicleAction so vehicles.image_url is refreshed.
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set('make', make);
      fd.set('model', model);
      fd.set('year', year);
      fd.set('plate', plate);
      fd.set('vin', vin);
      fd.set('trim', trim);
      fd.set('color', color);
      fd.set('fuelType', vehicle.fuelType);
      fd.set('currency', vehicle.currency);
      fd.set('currentMileageKm', currentMileage);
      fd.set('purchaseDate', purchaseDate);
      fd.set('purchasePrice', purchasePrice);
      fd.set('insuranceProvider', insuranceProvider);
      fd.set('insuranceRenewalDate', insuranceRenewalDate);
      if (imageUrl) fd.set('imageUrl', imageUrl);

      const res = await updateVehicleAction(vehicle.id, fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // registration_formula_number isn't in the legacy validator yet —
      // push it separately via the dedicated action.
      if (registrationFormula !== (vehicle.registrationFormulaNumber ?? '')) {
        const { setRegistrationFormulaNumberAction } = await import(
          '@/server/actions/fines'
        );
        await setRegistrationFormulaNumberAction(
          vehicle.id,
          registrationFormula,
        );
      }
      toast.success(t('saved'));
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Photo du véhicule ── */}
      <Section
        title={t('photoTitle')}
        description={t('photoHint')}
      >
        <Card className="p-5">
          {vehicle.imageUrl && !imageUrl && (
            <p className="text-[11px] text-muted-foreground mb-2">
              {t('photoExisting')}
            </p>
          )}
          <VehiclePhotoUpload
            name="imageUrl"
            onUploaded={(_path, url) => setImageUrl(url)}
          />
        </Card>
      </Section>

      {/* ── Identité véhicule ── */}
      <Section
        title={t('identityTitle')}
        description={t('identityHint')}
      >
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('make')} required>
              <Input
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
                maxLength={50}
              />
            </Field>
            <Field label={t('model')} required>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                maxLength={80}
              />
            </Field>
            <Field label={t('trim')}>
              <Input
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                placeholder={t('trimPlaceholder')}
              />
            </Field>
            <Field label={t('colour')}>
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
            <Field label={t('plate')} required>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                required
                className="font-mono uppercase"
              />
            </Field>
            <Field label={t('vin')} hint={t('vinHint')}>
              <Input
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                maxLength={17}
                className="font-mono uppercase"
                placeholder="WVWZZZ3CZWE…"
              />
            </Field>
            <Field label={t('formula')} hint={t('formulaHint')}>
              <Input
                value={registrationFormula}
                onChange={(e) => setRegistrationFormula(e.target.value)}
                placeholder="2023BA12345"
                className="font-mono"
              />
            </Field>
            <Field label={t('year')} required>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={1950}
                max={new Date().getFullYear() + 1}
                required
                className="font-mono"
              />
            </Field>
            <Field label={t('mileage')} required>
              <Input
                type="number"
                value={currentMileage}
                onChange={(e) => setCurrentMileage(e.target.value)}
                min={0}
                required
                className="font-mono"
              />
            </Field>
          </div>
        </Card>
      </Section>

      {/* ── Achat / valeur ── */}
      <Section
        title={t('purchaseTitle')}
        description={t('purchaseHint')}
      >
        <Card className="p-5 grid sm:grid-cols-2 gap-4">
          <Field label={t('purchaseDate')} required>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </Field>
          <Field label={t('purchasePrice', { currency: vehicle.currency })}>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="font-mono"
              placeholder="15000"
            />
          </Field>
        </Card>
      </Section>

      {/* ── Assurance — composant dédié, géré côté serveur ── */}
      <Section
        title={t('insuranceTitle')}
        description={t('insuranceHint')}
      >
        <InsuranceManager
          vehicleId={vehicle.id}
          currency={vehicle.currency}
          initialMode={vehicle.insuranceMode ?? 'fixed'}
          initialFixedAmount={vehicle.insuranceMonthly ?? null}
          initialProvider={insuranceProvider}
          onProviderChange={setInsuranceProvider}
          initialRecords={initialInsuranceRecords}
        />
        <Card className="p-5 mt-3">
          <Field label={t('renewalLabel')} hint={t('renewalHint')}>
            <Input
              type="date"
              value={insuranceRenewalDate}
              onChange={(e) => setInsuranceRenewalDate(e.target.value)}
              className="font-mono"
            />
          </Field>
        </Card>
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => router.back()}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="bg-keeper hover:bg-keeper/90 text-white gap-1.5"
        >
          <Save className="h-4 w-4" />
          {pending ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1">
        {label}
        {required && (
          <span className="text-destructive" aria-label="obligatoire">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
      )}
    </div>
  );
}
