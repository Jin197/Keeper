'use client';

import { Link } from '@/lib/i18n/routing';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Hand,
  Loader2,
} from 'lucide-react';
import { OcrScanner } from '@/components/domain/ocr-scanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormError } from '@/components/ui/form-error';
import { addFuelEntryAction } from '@/server/actions/fuel';

type Stage = 'capture' | 'scanning' | 'review';

interface VehicleOpt {
  id: string;
  label: string;
  /** Last known odometer reading — pre-fills the mileage input so the user
   * only has to bump it by the trip they did since the last fill-up. */
  currentMileageKm: number;
}

interface OcrResult {
  energyType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  stationName: string;
  stationCity: string;
}

export function ScanForm({
  vehicles,
  defaultVehicleId,
  defaultCurrency,
  isManual,
  isPremium,
}: {
  vehicles: VehicleOpt[];
  defaultVehicleId: string;
  defaultCurrency: string;
  isManual: boolean;
  isPremium: boolean;
}) {
  const t = useTranslations('scan');
  const locale = useLocale();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(isManual ? 'review' : 'capture');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [prefill, setPrefill] = useState<Partial<OcrResult> | null>(null);
  const [confidence, setConfidence] = useState<number>();

  // Auto-compute total when qty * unitPrice change
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  useEffect(() => {
    if (quantity && unitPrice) {
      setTotalPrice(Number((quantity * unitPrice).toFixed(2)));
    }
  }, [quantity, unitPrice]);

  // Mileage pre-fill: starts at the selected vehicle's current odometer
  // reading. The user typically only has to bump it by the distance driven
  // since their last fill-up.
  const initialVehicle =
    vehicles.find((v) => v.id === defaultVehicleId) ?? vehicles[0];
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    initialVehicle?.id ?? '',
  );
  const [mileageKm, setMileageKm] = useState<number>(
    initialVehicle?.currentMileageKm ?? 0,
  );
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const v = vehicles.find((x) => x.id === vehicleId);
    if (v) setMileageKm(v.currentMileageKm);
  };

  const runOcr = async (file: File) => {
    setStage('scanning');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t('ocrUnavailable'));
        setStage('review');
        return;
      }
      // Real OCR result. Reject silly values defensively (negative numbers,
      // NaN) so the form doesn't show garbage to the user.
      const safe = (n: unknown) =>
        typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
      setPrefill(data);
      setQuantity(safe(data.quantity));
      setUnitPrice(safe(data.unitPrice));
      setTotalPrice(safe(data.totalPrice));
      setConfidence(
        typeof data.confidence === 'number' ? data.confidence : undefined,
      );
      if (data.confidence != null && data.confidence < 50) {
        toast.warning(t('lowConfidence'));
      }
      setStage('review');
    } catch {
      toast.error(t('ocrOffline'));
      setStage('review');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runOcr(file);
  };

  const handleSubmit = (formData: FormData) => {
    formData.set('totalPrice', String(totalPrice));
    formData.set('quantity', String(quantity));
    formData.set('unitPrice', String(unitPrice));
    startTransition(async () => {
      setError(undefined);
      const res = await addFuelEntryAction(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(t('saved'));
      router.push('/fuel');
    });
  };

  return (
    <div className="container py-6 lg:py-8 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/fuel">
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </Button>

      <div>
        {!isManual && (
          <Badge variant="premium" className="mb-3">
            <Sparkles className="h-3 w-3" /> {t('badge', { plan: isPremium ? t('planUnlimited') : t('planFree') })}
          </Badge>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {stage === 'review' ? (isManual ? t('titleManual') : t('titleReview')) : t('titleCapture')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stage === 'capture' && t('hintCapture')}
          {stage === 'scanning' && t('hintScanning')}
          {stage === 'review' && (isManual ? t('hintManual') : t('hintReview'))}
        </p>
      </div>

      {(stage === 'capture' || stage === 'scanning') && (
        <>
          <OcrScanner
            scanning={stage === 'scanning'}
            onCapture={(file) => runOcr(file)}
            onUpload={() => document.getElementById('ocr-upload')?.click()}
          />
          <input
            id="ocr-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}

      {stage === 'review' && (
        <form action={handleSubmit} className="space-y-5">
          {prefill && confidence && (
            <div className="rounded-card bg-eco/10 border border-eco/20 p-3 flex items-start gap-3">
              <CheckCircle2
                className="h-4 w-4 text-eco mt-0.5 shrink-0"
                strokeWidth={2}
              />
              <div className="text-xs">
                <div className="font-medium text-eco">
                  {t('recognised', { confidence })}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {prefill.stationName}
                  {prefill.stationCity ? ` · ${prefill.stationCity}` : ''}
                </div>
              </div>
            </div>
          )}

          <Card className="p-5 space-y-4">
            <input
              type="hidden"
              name="currency"
              defaultValue={defaultCurrency}
            />
            <input
              type="hidden"
              name="ocrSource"
              defaultValue={isManual ? 'manual' : 'ocr'}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vehicleId">{t('vehicle')}</Label>
                <Select
                  id="vehicleId"
                  name="vehicleId"
                  value={selectedVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="energyType">{t('energyType')}</Label>
                <Select
                  id="energyType"
                  name="energyType"
                  defaultValue={prefill?.energyType ?? 'gasoline'}
                >
                  <option value="gasoline">{t('gasoline')}</option>
                  <option value="diesel">{t('diesel')}</option>
                  <option value="electric">{t('electric')}</option>
                  <option value="e85">{t('e85')}</option>
                  <option value="gpl">{t('lpg')}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity">{t('quantity')}</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  className="font-mono"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice">{t('unitPrice')}</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="0.001"
                  className="font-mono"
                  value={unitPrice || ''}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="totalPrice">{t('total')}</Label>
                <Input
                  id="totalPrice"
                  name="totalPrice"
                  type="number"
                  step="0.01"
                  className="font-mono"
                  value={totalPrice || ''}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  required
                />
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="stationName">{t('station')}</Label>
                <Input
                  id="stationName"
                  name="stationName"
                  defaultValue={prefill?.stationName ?? ''}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="stationCity">{t('city')}</Label>
                <Input
                  id="stationCity"
                  name="stationCity"
                  defaultValue={prefill?.stationCity ?? ''}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="mileageKm">{t('odometer')}</Label>
                <Input
                  id="mileageKm"
                  name="mileageKm"
                  type="number"
                  className="font-mono"
                  value={mileageKm || ''}
                  onChange={(e) =>
                    setMileageKm(parseInt(e.target.value, 10) || 0)
                  }
                  required
                />
                {initialVehicle && mileageKm < initialVehicle.currentMileageKm && (
                  <p className="text-[11px] text-amber-500">
                    {t('belowLast', { km: initialVehicle.currentMileageKm.toLocaleString(locale) })}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <FormError message={error} />

          <div className="flex gap-3">
            {!isManual && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStage('capture')}
                disabled={pending}
              >
                <Hand className="h-4 w-4" /> {t('restart')}
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
