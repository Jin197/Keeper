'use client';

import React, { useRef, useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Fuel,
  Wrench,
  FileBadge,
  BatteryCharging,
  Zap,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { BRAND_NAMES, BRANDS_INDEX } from '@/lib/data/car-brands';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { isSupabaseConfigured } from '@/lib/env';
import { saveOnboardingAnswersAction, completeOnboardingAction } from '@/server/actions/profile';
import type { UserProfile, FuelType } from '@/lib/types';

interface OnboardingClientProps {
  initialUser: Partial<UserProfile>;
  locale: string;
}

/** What the user is fed up with — stored as the legacy `onboarding_objective` values. */
type Pain = 'fuel' | 'repairs' | 'resale';
const PAIN_TO_OBJECTIVE: Record<Pain, 'tco' | 'phm' | 'resale'> = {
  fuel: 'tco',
  repairs: 'phm',
  resale: 'resale',
};
type Motorization = 'hybrid' | 'electric' | 'thermal';

const TOTAL_STEPS = 3;

export default function OnboardingClient({ initialUser, locale }: OnboardingClientProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pending, startTransition] = useTransition();

  const [pain, setPain] = useState<Pain | null>(null);
  const [motorization, setMotorization] = useState<Motorization | null>(null);
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);

  // Vehicle form
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lookupCountry, setLookupCountry] = useState<string | undefined>();
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const lastLookedUp = useRef('');

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear() - 6);
  const [vin, setVin] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('thermal');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceMonthly, setInsuranceMonthly] = useState('');
  const [insuranceRenewalDate, setInsuranceRenewalDate] = useState('');

  const isRtl = locale === 'ar';
  const isFrenchMarket = (initialUser.country ?? '').toUpperCase() === 'FR' || locale === 'fr';
  const platePlaceholder = isFrenchMarket ? t('platePlaceholderFr') : t('platePlaceholderGb');

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const pick = (kind: 'pain' | 'motorization', val: string) => {
    setSelectedAnim(val);
    setTimeout(() => {
      setSelectedAnim(null);
      if (kind === 'pain') {
        setPain(val as Pain);
        goTo(1);
      } else {
        const m = val as Motorization;
        setMotorization(m);
        setFuelType(m);
        // Persist the two answers as soon as we have them; the vehicle step is
        // independent so a network hiccup here never blocks the user.
        startTransition(async () => {
          const res = await saveOnboardingAnswersAction({
            onboardingObjective: PAIN_TO_OBJECTIVE[pain ?? 'fuel'],
            onboardingMotorization: m,
          });
          if (res.error) console.error('Failed to save onboarding answers:', res.error);
        });
        goTo(2);
      }
    }, 250);
  };

  const handleLookup = async (value: string) => {
    const cleaned = value.toUpperCase().replace(/[\s-]/g, '');
    if (cleaned.length < 5 || cleaned === lastLookedUp.current) return;
    lastLookedUp.current = cleaned;

    if (!isSupabaseConfigured()) {
      setMake('Ford');
      setModel('Focus');
      setYear(2015);
      toast.success(t('identified', { make: 'Ford', model: 'Focus' }), { description: 'Demo' });
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/vehicles/lookup?q=${encodeURIComponent(cleaned)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.warning(err.error || t('notRecognised'));
        setShowAdvanced(true);
        return;
      }
      const data = await res.json();
      if (data.make) setMake(data.make);
      if (data.model) setModel(data.trim ? `${data.model} ${data.trim}`.trim() : data.model);
      if (data.year) setYear(data.year);
      if (data.vin) setVin(data.vin);
      if (data.fuel_type) setFuelType(data.fuel_type as FuelType);
      if (data.country) setLookupCountry(data.country);
      toast.success(t('identified', { make: data.make, model: data.model || '' }), {
        description: data.source ? t('lookupSource', { source: String(data.source).toUpperCase() }) : undefined,
      });
    } catch (err) {
      console.error('Vehicle lookup error:', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleDocScan = async (file: File) => {
    setIsScanningDoc(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/vehicles/scan-carte-grise', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('notRecognised'));
        setShowAdvanced(true);
        return;
      }
      const ext = data.extract as {
        plate: string | null;
        vin: string | null;
        make: string | null;
        model: string | null;
        year: number | null;
        fuelType: FuelType | null;
        confidence: number;
      };
      if (ext.plate) setPlate(ext.plate);
      if (ext.vin) setVin(ext.vin);
      if (ext.make) setMake(ext.make);
      if (ext.model) setModel(ext.model);
      if (ext.year) setYear(ext.year);
      if (ext.fuelType) setFuelType(ext.fuelType);
      setShowAdvanced(true);
      toast.success(
        t('identified', { make: ext.make ?? '', model: ext.model ?? '' }),
        { description: `${ext.confidence}%` },
      );
    } catch {
      toast.error(t('errSave'));
    } finally {
      setIsScanningDoc(false);
    }
  };

  const submitVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) {
      toast.error(t('errPlate'));
      return;
    }
    if (!mileage || Number(mileage) <= 0) {
      toast.error(t('errMileage'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await completeOnboardingAction({
          make: make || 'Unknown',
          model: model || 'Unknown',
          year: Number(year),
          vin: vin || undefined,
          plate: plate.toUpperCase().trim(),
          fuelType,
          currentMileageKm: Number(mileage),
          purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
          purchaseDate: purchaseDate || undefined,
          insuranceProvider: insuranceProvider.trim() || undefined,
          insuranceMonthly: insuranceMonthly ? Number(insuranceMonthly) : undefined,
          insuranceRenewalDate: insuranceRenewalDate || undefined,
          country: lookupCountry,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (!isSupabaseConfigured()) localStorage.setItem('onboarding_completed', 'true');
        toast.success(t('done'));
        router.push('/dashboard');
        router.refresh();
      } catch {
        toast.error(t('errSave'));
      }
    });
  };

  const useDemo = () => {
    startTransition(async () => {
      try {
        const demo =
          motorization === 'electric'
            ? { make: 'Nissan', model: 'Leaf', year: 2018, fuelType: 'electric' as const }
            : motorization === 'hybrid'
              ? { make: 'Toyota', model: 'Yaris Hybrid', year: 2017, fuelType: 'hybrid' as const }
              : { make: 'Ford', model: 'Focus', year: 2015, fuelType: 'thermal' as const };
        const res = await completeOnboardingAction({
          ...demo,
          vin: 'WF0KXXGCBK' + Math.floor(1000000 + Math.random() * 9000000),
          plate: isFrenchMarket ? 'DE-456-MO' : 'DE15 MOX',
          currentMileageKm: 112480,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (!isSupabaseConfigured()) localStorage.setItem('onboarding_completed', 'true');
        toast.success(t('demoDone'));
        router.push('/dashboard');
        router.refresh();
      } catch {
        toast.error(t('errSave'));
      }
    });
  };

  const slide = {
    enter: (dir: number) => ({ x: dir > 0 ? 240 : -240, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } } },
    exit: (dir: number) => ({ x: dir < 0 ? 240 : -240, opacity: 0, transition: { duration: 0.2 } }),
  };

  const stepTitle = [t('step1Title'), t('step2Title'), t('step3Title')][step] ?? '';

  const OptionButton = ({
    id,
    label,
    desc,
    icon: Icon,
    onClick,
  }: {
    id: string;
    label: string;
    desc: string;
    icon: typeof Fuel;
    onClick: () => void;
  }) => {
    const selected = selectedAnim === id;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`w-full text-left p-6 rounded-[1.8rem] border backdrop-blur-xl transition-all duration-300 flex items-start gap-4 ${
          selected
            ? 'border-keeper bg-keeper/10 text-white shadow-glow-keeper scale-[1.02]'
            : 'border-white/[0.08] bg-[#1C1C24]/40 hover:bg-[#1C1C24]/80 text-muted-foreground hover:text-white'
        }`}
      >
        <div className={`p-3.5 rounded-2xl flex items-center justify-center ${selected ? 'bg-keeper text-white' : 'bg-white/[0.04]'}`}>
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-lg text-white">{label}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </button>
    );
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="relative min-h-screen bg-[#0D0D12] text-white flex flex-col justify-between overflow-x-hidden">
      <header className="w-full sticky top-0 z-50 bg-[#0D0D12]/80 backdrop-blur-xl border-b border-white/[0.02] px-6 py-4">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-white tracking-wide uppercase">{stepTitle}</span>
            <div className="flex items-center gap-3">
              <span>{t('progress', { current: step + 1, total: TOTAL_STEPS })}</span>
              <div className="h-4 w-px bg-white/10" />
              <LocaleSwitcher variant="compact" />
            </div>
          </div>
          <div className="bg-white/[0.04] h-1 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-keeper rounded-full shadow-glow-keeper"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-keeper/5 blur-[120px] pointer-events-none" />
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div key="pain" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{t('welcome')}</p>
                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{t('painQuestion')}</h1>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('painSubtitle')}</p>
                </div>
                <div className="grid gap-4 mt-6">
                  <OptionButton id="fuel" label={t('painFuelLabel')} desc={t('painFuelDesc')} icon={Fuel} onClick={() => pick('pain', 'fuel')} />
                  <OptionButton id="repairs" label={t('painRepairLabel')} desc={t('painRepairDesc')} icon={Wrench} onClick={() => pick('pain', 'repairs')} />
                  <OptionButton id="resale" label={t('painResaleLabel')} desc={t('painResaleDesc')} icon={FileBadge} onClick={() => pick('pain', 'resale')} />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="motor" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
                <Button variant="ghost" size="sm" onClick={() => goTo(0)} className="-ml-2 text-xs text-muted-foreground hover:text-white">
                  <ChevronLeft className="h-4 w-4 mr-1" /> {t('back')}
                </Button>
                <div className="text-center space-y-2">
                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{t('motorizationQuestion')}</h1>
                </div>
                <div className="grid gap-4 mt-6">
                  <OptionButton id="thermal" label={t('thermalLabel')} desc={t('thermalDesc')} icon={Fuel} onClick={() => pick('motorization', 'thermal')} />
                  <OptionButton id="hybrid" label={t('hybridLabel')} desc={t('hybridDesc')} icon={BatteryCharging} onClick={() => pick('motorization', 'hybrid')} />
                  <OptionButton id="electric" label={t('electricLabel')} desc={t('electricDesc')} icon={Zap} onClick={() => pick('motorization', 'electric')} />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="vehicle" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6 max-w-xl mx-auto">
                <Button variant="ghost" size="sm" onClick={() => goTo(1)} className="-ml-2 text-xs text-muted-foreground hover:text-white">
                  <ChevronLeft className="h-4 w-4 mr-1" /> {t('back')}
                </Button>
                <div className="text-center space-y-2">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">{t('vehicleTitle')}</h1>
                  <p className="text-sm text-muted-foreground">{t('vehicleSubtitle')}</p>
                </div>

                <form onSubmit={submitVehicle} className="space-y-4">
                  <input
                    ref={docInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleDocScan(f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={isScanningDoc}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-[#C5A059]/30 bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5 hover:from-[#C5A059]/15 text-sm font-semibold text-[#C5A059] transition-all disabled:opacity-50"
                  >
                    {isScanningDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {isScanningDoc ? t('scanning') : t('scanDoc')}
                  </button>
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-mono">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    {t('or')}
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  <Card className="p-6 space-y-5 border-keeper bg-keeper/5 shadow-glow-keeper relative overflow-hidden rounded-[2.2rem]">
                    {isLookingUp && (
                      <div className="absolute inset-0 pointer-events-none z-10">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF] to-transparent animate-laser-sweep" />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#007AFF] tracking-widest uppercase">
                        {isFrenchMarket ? 'SIV · VIN' : 'DVLA · MOT · VIN'}
                      </span>
                      {isLookingUp ? (
                        <span className="text-keeper flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('identifying')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="plateOnboard" className="font-semibold text-sm text-white">
                          {t('plateLabel')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="plateOnboard"
                            name="plate"
                            value={plate}
                            onChange={(e) => setPlate(e.target.value)}
                            onBlur={(e) => handleLookup(e.target.value)}
                            placeholder={platePlaceholder}
                            className="font-mono pl-10 text-lg uppercase tracking-widest bg-black/40 border-white/[0.08] focus:border-keeper rounded-xl"
                            required
                            autoComplete="off"
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t('plateHint')}</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="mileageOnboard" className="font-semibold text-sm text-white">
                          {t('mileageLabel')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="mileageOnboard"
                          name="currentMileageKm"
                          type="number"
                          min={0}
                          value={mileage}
                          onChange={(e) => setMileage(e.target.value)}
                          placeholder="112480"
                          className="font-mono text-lg bg-black/40 border-white/[0.08] focus:border-keeper rounded-xl"
                          required
                        />
                      </div>

                      {(make || model) && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {make} {model} · {year} · {fuelType}
                        </div>
                      )}
                    </div>
                  </Card>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    aria-expanded={showAdvanced}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-[#2D2D2D]/20 hover:bg-[#2D2D2D]/40 text-xs font-semibold text-muted-foreground transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Sliders className="h-3.5 w-3.5 text-[#C5A059]" />
                      {t('details')}
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <Card className="p-6 bg-black/30 border-white/[0.06] rounded-[1.8rem] space-y-4">
                          <p className="text-[11px] text-muted-foreground -mt-2">{t('detailsHint')}</p>
                          <datalist id="cg-brands">
                            {BRAND_NAMES.map((b) => (
                              <option key={b} value={b} />
                            ))}
                          </datalist>
                          <datalist id="cg-models">
                            {(BRANDS_INDEX[make] ?? []).map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label={t('make')}>
                              <Input value={make} onChange={(e) => setMake(e.target.value)} list="cg-brands" autoComplete="off" className="bg-black/20 border-white/[0.08]" />
                            </Field>
                            <Field label={t('model')}>
                              <Input value={model} onChange={(e) => setModel(e.target.value)} list="cg-models" autoComplete="off" className="bg-black/20 border-white/[0.08]" />
                            </Field>
                            <Field label={t('year')}>
                              <Input type="number" min={1950} max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-black/20 border-white/[0.08]" />
                            </Field>
                            <Field label={t('fuelType')}>
                              <select
                                value={fuelType}
                                onChange={(e) => setFuelType(e.target.value as FuelType)}
                                className="w-full rounded-btn border border-white/[0.08] bg-black/60 px-3 py-1.5 text-sm"
                              >
                                <option value="thermal">{t('thermalLabel')}</option>
                                <option value="hybrid">{t('hybridLabel')}</option>
                                <option value="electric">{t('electricLabel')}</option>
                              </select>
                            </Field>
                            <div className="col-span-2">
                              <Field label={t('vin')}>
                                <Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} maxLength={17} className="bg-black/20 border-white/[0.08] font-mono" />
                              </Field>
                            </div>
                            <Field label={t('purchasePrice')}>
                              <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="bg-black/20 border-white/[0.08] font-mono" />
                            </Field>
                            <Field label={t('purchaseDate')}>
                              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="bg-black/20 border-white/[0.08] font-mono" />
                            </Field>
                            <Field label={t('insurer')}>
                              <Input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className="bg-black/20 border-white/[0.08]" />
                            </Field>
                            <Field label={t('insuranceMonthly')}>
                              <Input type="number" value={insuranceMonthly} onChange={(e) => setInsuranceMonthly(e.target.value)} className="bg-black/20 border-white/[0.08] font-mono" />
                            </Field>
                            <div className="col-span-2">
                              <Field label={t('insuranceRenewal')}>
                                <Input type="date" value={insuranceRenewalDate} onChange={(e) => setInsuranceRenewalDate(e.target.value)} className="bg-black/20 border-white/[0.08] font-mono" />
                              </Field>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={pending || !plate.trim() || !mileage || Number(mileage) <= 0}
                      className="w-full py-6 bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-full font-bold text-white shadow-glow-keeper flex items-center justify-center gap-2 text-base disabled:opacity-50"
                    >
                      {pending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> {t('finishing')}
                        </>
                      ) : (
                        <>
                          {t('finish')} <ChevronRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <button type="button" onClick={useDemo} disabled={pending} className="w-full text-center py-2 text-xs font-semibold text-[#C5A059] hover:underline">
                      {t('demo')}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>Keeper &copy; {new Date().getFullYear()}</div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{t('footerStatus')}</span>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
