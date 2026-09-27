'use client';

import { Link } from '@/lib/i18n/routing';
import { useRouter } from '@/lib/i18n/routing';
import { useTransition, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChevronLeft,
  Fuel,
  Zap,
  Battery,
  Loader2,
  Search,
  Globe,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { PageHeader } from '@/components/domain/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormError } from '@/components/ui/form-error';
import { VehiclePhotoUpload } from '@/components/domain/vehicle-photo-upload';
import { useUser } from '@/components/user-context';
import { createVehicleAction } from '@/server/actions/vehicles';
import { currencies } from '@/lib/currencies';

const REGEX_PLATE_FR = /^[A-Z]{2}-?\d{3}-?[A-Z]{2}$/i;
const REGEX_PLATE_UK = /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/i;
const REGEX_VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;

type LookupSource = 'siv' | 'nhtsa' | 'dvla' | 'cache' | null;

const SOURCE_LABELS: Record<string, { icon: string; label: string }> = {
  siv: { icon: '🇫🇷', label: 'SIV France' },
  nhtsa: { icon: '🌍', label: 'NHTSA' },
  dvla: { icon: '🇬🇧', label: 'DVLA UK' },
  cache: { icon: '⚡', label: 'Cache' },
};

export default function NewVehiclePage() {
  const t = useTranslations('vehicleForm');
  const locale = useLocale();
  const router = useRouter();
  const user = useUser();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupSource, setLookupSource] = useState<LookupSource>(null);
  const [showVinFallback, setShowVinFallback] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [country, setCountry] = useState<string>('');

  const isFrenchMarket = (user.country ?? '').toUpperCase() === 'FR' || locale === 'fr';

  const handleSubmit = (formData: FormData) => {
    // The identity fields live in the collapsed panel; never let a car be
    // saved with blank make/model because the lookup silently failed.
    if (!String(formData.get('make') ?? '').trim() || !String(formData.get('model') ?? '').trim()) {
      setShowAdvanced(true);
      setError(t('missingIdentity'));
      return;
    }
    if (country) formData.set('country', country);
    startTransition(async () => {
      setError(undefined);
      const res = await createVehicleAction(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(t('added'));
      router.push(`/vehicles/${res.id}`);
    });
  };

  const handleSmartLookup = async (value: string, field: 'plate' | 'vin') => {
    const form = formRef.current;
    const cleaned = value.toUpperCase().replace(/\s/g, '').replace(/-/g, '');
    if (!cleaned || cleaned.length < 4 || !form) return;

    if (field === 'plate' && !REGEX_PLATE_FR.test(cleaned) && !REGEX_PLATE_UK.test(cleaned) && cleaned.length < 5) return;
    if (field === 'vin' && (!REGEX_VIN.test(cleaned) || cleaned.length !== 17)) return;

    setIsLookingUp(true);
    setLookupSource(null);

    try {
      const param = field === 'vin' ? `vin=${encodeURIComponent(cleaned)}` : `plate=${encodeURIComponent(cleaned)}`;
      const res = await fetch(`/api/vehicles/lookup?${param}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.fallback === 'try-vin' && field === 'plate') {
          setShowVinFallback(true);
          setShowAdvanced(true);
          toast.info(t('plateNotFound'), { duration: 6000 });
        } else if (errorData.fallback === 'manual-entry') {
          toast.warning(t('notRecognised'), { duration: 5000 });
          setShowAdvanced(true);
        } else if (res.status === 422) {
          toast.error(errorData.error || t('invalidFormat'));
        } else {
          toast.error(errorData.error || t('notFound'));
          setShowAdvanced(true);
        }
        return;
      }

      const data = await res.json();
      fillFormFromLookup(form, data);
      setLookupSource(data.source || null);
      if (data.country) setCountry(data.country);
      setShowVinFallback(false);

      const sourceInfo = SOURCE_LABELS[data.source] || { icon: '✅', label: '' };
      toast.success(`${t('identified', { make: data.make, model: data.model || '' })} ${sourceInfo.icon}`, {
        description: sourceInfo.label ? t('source', { source: sourceInfo.label }) : undefined,
      });
    } catch {
      // network errors — the user can still type the details
    } finally {
      setIsLookingUp(false);
    }
  };

  const fillFormFromLookup = (form: HTMLFormElement, data: Record<string, string | number | null>) => {
    const set = (name: string, v: string | number | null | undefined) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | null;
      if (el && v != null && v !== '') el.value = String(v);
    };
    set('make', data.make);
    set('model', data.model);
    set('year', data.year);
    set('trim', data.trim);
    set('vin', data.vin);
    set('color', data.color);
    if (data.fuel_type) {
      const radio = form.querySelector(`input[name="fuelType"][value="${data.fuel_type}"]`) as HTMLInputElement | null;
      if (radio) radio.checked = true;
    }
  };

  const panelTitle = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono';

  return (
    <div className="container py-6 lg:py-8 max-w-xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/vehicles">
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </Button>

      <PageHeader title={t('title')} description={t('subtitle')} />

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <Card className="p-6 space-y-5 border-veloce bg-veloce/5 shadow-[0_0_30px_rgba(0,122,255,0.05)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-veloce">{t('quickEntry')}</div>
            {isLookingUp && (
              <div className="text-xs text-veloce flex items-center gap-1.5 font-mono">
                <Loader2 className="h-3 w-3 animate-spin" /> {t('identifying')}
              </div>
            )}
            {lookupSource && !isLookingUp && (
              <div className="text-xs text-emerald-500 flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3 w-3" />
                {SOURCE_LABELS[lookupSource]?.icon} {SOURCE_LABELS[lookupSource]?.label}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate" className="font-semibold text-sm">
                {t('plate')}
              </Label>
              <div className="relative">
                <Input
                  id="plate"
                  name="plate"
                  placeholder={isFrenchMarket ? t('platePlaceholderFr') : t('platePlaceholderGb')}
                  className="font-mono pl-10 text-lg tracking-wider uppercase"
                  required
                  autoComplete="off"
                  onBlur={(e) => handleSmartLookup(e.target.value, 'plate')}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentMileageKm" className="font-semibold text-sm">
                {t('mileage')}
              </Label>
              <Input id="currentMileageKm" name="currentMileageKm" type="number" min={0} placeholder="112480" className="font-mono text-lg" required />
            </div>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-[#2D2D2D]/20 hover:bg-[#2D2D2D]/40 text-xs font-medium tracking-wide text-muted-foreground transition-all"
        >
          <span className="flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5" />
            {t('customise')}
          </span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Kept mounted (hidden) so the lookup can fill it and the submit can read it. */}
        <AnimatePresence initial={false}>
          <motion.div
            initial={false}
            animate={{ height: showAdvanced ? 'auto' : 0, opacity: showAdvanced ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden space-y-4"
            aria-hidden={!showAdvanced}
          >
            <Card className="p-6 space-y-4">
              <div className={panelTitle}>{t('identity')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="make">{t('make')}</Label>
                  <Input id="make" name="make" placeholder="Ford" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">{t('model')}</Label>
                  <Input id="model" name="model" placeholder="Focus" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year">{t('year')}</Label>
                  <Input id="year" name="year" type="number" min={1950} max={new Date().getFullYear() + 1} placeholder="2015" defaultValue={new Date().getFullYear() - 6} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trim">{t('trim')}</Label>
                  <Input id="trim" name="trim" placeholder="Titanium" />
                </div>
                <div className={`space-y-1.5 col-span-2 transition-all duration-300 ${showVinFallback ? 'ring-2 ring-veloce/50 rounded-xl p-3 bg-veloce/5' : ''}`}>
                  <Label htmlFor="vin">
                    {t('vin')} <span className="text-eco text-[10px] font-mono">({t('optional')})</span>
                  </Label>
                  <div className="relative">
                    <Input id="vin" name="vin" placeholder={t('vinPlaceholder')} className="font-mono pl-10 uppercase" maxLength={17} onBlur={(e) => handleSmartLookup(e.target.value, 'vin')} />
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="color">{t('colour')}</Label>
                  <Input id="color" name="color" />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className={panelTitle}>{t('engine')}</div>
              <fieldset className="grid grid-cols-3 gap-3">
                {[
                  { value: 'thermal', label: t('thermal'), icon: Fuel },
                  { value: 'electric', label: t('electric'), icon: Zap },
                  { value: 'hybrid', label: t('hybrid'), icon: Battery },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className="flex flex-col items-center gap-2 rounded-card border border-border p-4 cursor-pointer hover:border-veloce hover:bg-veloce/5 transition-colors has-[:checked]:border-veloce has-[:checked]:bg-veloce/10"
                    >
                      <input type="radio" name="fuelType" value={opt.value} className="sr-only" defaultChecked={opt.value === 'thermal'} />
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </label>
                  );
                })}
              </fieldset>
            </Card>

            <Card className="p-6 space-y-4">
              <div className={panelTitle}>{t('finances')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseDate">{t('purchaseDate')}</Label>
                  <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchasePrice">{t('purchasePrice')}</Label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" min={0} defaultValue="0" className="font-mono" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">{t('currency')}</Label>
                  <Select id="currency" name="currency" defaultValue={user.currency}>
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="insuranceProvider">{t('insurer')}</Label>
                  <Input id="insuranceProvider" name="insuranceProvider" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="insuranceMonthly">{t('insuranceMonthly')}</Label>
                  <Input id="insuranceMonthly" name="insuranceMonthly" type="number" step="0.01" min={0} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="insuranceRenewalDate">{t('insuranceRenewal')}</Label>
                  <Input id="insuranceRenewalDate" name="insuranceRenewalDate" type="date" className="font-mono" />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <div className={panelTitle}>{t('photo')}</div>
              <VehiclePhotoUpload name="imageUrl" />
            </Card>
          </motion.div>
        </AnimatePresence>

        <FormError message={error} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" asChild className="flex-1 rounded-full">
            <Link href="/vehicles">{t('cancel')}</Link>
          </Button>
          <Button type="submit" className="flex-1 bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-full font-semibold" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? t('saving') : t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
