'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  CheckCircle2,
  Fuel,
  Wrench,
  FileBadge,
  Hash,
  ScanLine,
  CalendarClock,
  ShieldCheck,
  MapPin,
  Gauge,
} from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PricingSection } from '@/components/marketing/pricing-section';
import { formatPrice, type ResolvedPricing } from '@/lib/pricing';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Props {
  locale: string;
  pricing: ResolvedPricing;
}

export function LandingPageClient({ locale, pricing }: Props) {
  const t = useTranslations('landing.hero');
  const tPains = useTranslations('landing.pains');
  const tHow = useTranslations('landing.howItWorks');
  const tData = useTranslations('landing.data');
  const tFaq = useTranslations('landing.faq');
  const tCta = useTranslations('landing.cta');

  const fmt = (n: number) => formatPrice(n, pricing.currency, locale);

  // Reveal-on-scroll for the section headings; kept light so the page stays
  // fast on the phones this audience actually uses.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    const items = rootRef.current.querySelectorAll('[data-reveal]');
    const ctx = gsap.context(() => {
      items.forEach((el) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          },
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const pains = [
    { icon: Fuel, title: tPains('fuelTitle'), body: tPains('fuelBody'), tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { icon: Wrench, title: tPains('repairTitle'), body: tPains('repairBody'), tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { icon: FileBadge, title: tPains('resaleTitle'), body: tPains('resaleBody'), tone: 'text-[#C5A059] bg-[#C5A059]/10 border-[#C5A059]/20' },
  ];

  const steps = [
    { icon: Hash, title: tHow('step1Title'), body: tHow('step1Description') },
    { icon: ScanLine, title: tHow('step2Title'), body: tHow('step2Description') },
    { icon: CalendarClock, title: tHow('step3Title'), body: tHow('step3Description') },
  ];

  const no = <span className="text-muted-foreground/50">{tData('no')}</span>;
  const dataRows = [
    { country: tData('gb'), vehicle: 'DVLA + VIN', history: tData('gbHistory'), recalls: tData('recallsProxy'), fuel: no },
    { country: tData('us'), vehicle: 'NHTSA vPIC', history: no, recalls: tData('usRecalls'), fuel: no },
    { country: tData('fr'), vehicle: 'SIV + VIN', history: no, recalls: tData('recallsProxy'), fuel: tData('frFuel') },
    { country: tData('de'), vehicle: 'VIN', history: no, recalls: tData('recallsProxy'), fuel: tData('deFuel') },
    { country: tData('world'), vehicle: tData('worldVehicle'), history: no, recalls: tData('recallsProxy'), fuel: no },
  ];

  const faq = (['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const).map((q) => ({
    q: tFaq(q),
    a: tFaq(q.replace('q', 'a') as 'a1'),
  }));

  return (
    <div ref={rootRef} className="flex-1 bg-[#121212] text-[#F5F5F7]">
      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden py-16 px-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,122,255,0.14),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/80 to-[#121212]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[size:30px_30px] bg-[linear-gradient(to_right,gray_1px,transparent_1px),linear-gradient(to_bottom,gray_1px,transparent_1px)]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <Badge variant="outline" className="border-[#007AFF]/30 text-[#007AFF] font-mono px-3 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
              {t('badge')}
            </Badge>
            <h1 className="font-display text-[2.5rem] sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.02] text-white [text-wrap:balance]">
              {t('titleLead')}{' '}
              <span className="font-serif italic font-normal text-gradient-veloce bg-gradient-to-r from-[#007AFF] via-cyan-400 to-indigo-400">
                {t('titleHighlight')}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">{t('subtitle')}</p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 bg-white text-black font-semibold text-base py-4 px-8 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-shadow"
              >
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center bg-transparent hover:bg-white/5 text-[#F5F5F7] border border-white/10 font-semibold text-base py-4 px-8 rounded-full transition-colors"
              >
                {t('ctaSecondary')}
              </a>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs text-[#F5F5F7]/60">
              {[t('trustFree'), t('trustTrial'), t('trustAds')].map((line) => (
                <li key={line} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* "Next 30 days" forecast card — the product's core promise, shown, not described. */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#007AFF]/30 to-indigo-500/10 blur-3xl rounded-[2.5rem] pointer-events-none" />
            <div className="relative border border-white/[0.08] bg-[#16161A]/90 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)] space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#007AFF] animate-pulse" />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{t('forecastTitle')}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Ford Focus · 2015 · 112 480 km</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ForecastTile icon={Fuel} label={t('forecastFuel')} value={fmt(pricing.band === 'A' ? 164 : 96)} hint={t('forecastFuelHint')} tone="emerald" />
                <ForecastTile icon={Wrench} label={t('forecastService')} value={fmt(pricing.band === 'A' ? 190 : 110)} hint={t('forecastServiceHint')} tone="amber" />
                <ForecastTile icon={ShieldCheck} label={t('forecastInspection')} value="23 d" hint={t('forecastInspectionHint')} tone="veloce" />
                <ForecastTile icon={Gauge} label="€/km" value={fmt(pricing.band === 'A' ? 0.21 : 0.12)} hint="↓ 6 %" tone="muted" />
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <MapPin className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-400 truncate">{t('forecastTip')}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{t('forecastTipHint', { amount: fmt(pricing.band === 'A' ? 4.5 : 2.2) })}</div>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums shrink-0">−7 %</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PAINS ────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0D0D12] border-y border-white/[0.04]">
        <div className="container px-4 space-y-12">
          <div data-reveal className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">{tPains('title')}</h2>
            <p className="text-muted-foreground">{tPains('subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pains.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} data-reveal className="p-8 border border-white/[0.08] bg-[#16161A]/60 rounded-[2.5rem] space-y-5 shadow-xl">
                  <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${p.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how" className="container py-24 px-4 space-y-12">
        <div data-reveal className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">{tHow('title')}</h2>
          <p className="text-muted-foreground">{tHow('subtitle')}</p>
        </div>
        <ol className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} data-reveal className="relative p-8 rounded-[2.5rem] border border-white/[0.08] bg-[#16161A]/40 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#007AFF]">0{i + 1}</span>
                  <div className="h-10 w-10 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white font-display">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── 4. DATA SOURCES ─────────────────────────────────────── */}
      <section id="features" className="py-24 bg-[#0D0D12] border-y border-white/[0.04]">
        <div className="container px-4 space-y-10">
          <div data-reveal className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">{tData('title')}</h2>
            <p className="text-muted-foreground">{tData('subtitle')}</p>
          </div>
          <div data-reveal className="max-w-5xl mx-auto overflow-x-auto rounded-[2rem] border border-white/[0.08] bg-[#16161A]/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.06]">
                  <th className="px-5 py-4 font-medium">{tData('colCountry')}</th>
                  <th className="px-5 py-4 font-medium">{tData('colVehicle')}</th>
                  <th className="px-5 py-4 font-medium">{tData('colHistory')}</th>
                  <th className="px-5 py-4 font-medium">{tData('colRecalls')}</th>
                  <th className="px-5 py-4 font-medium">{tData('colFuel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {dataRows.map((r) => (
                  <tr key={r.country}>
                    <td className="px-5 py-4 font-semibold text-white whitespace-nowrap">{r.country}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.vehicle}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.history}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.recalls}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.fuel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">{tData('worldNote')}</p>
        </div>
      </section>

      {/* ── 5. PRICING ──────────────────────────────────────────── */}
      <section id="pricing" className="container py-24 px-4">
        <PricingSection pricing={pricing} locale={locale} />
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────────────── */}
      <section className="container py-24 px-4 border-t border-white/[0.04]">
        <div data-reveal className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white">{tFaq('title')}</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {faq.map((item, i) => (
            <details key={item.q} className="group rounded-3xl border border-white/[0.08] bg-[#16161A]/40 overflow-hidden">
              <summary className="cursor-pointer p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors list-none">
                <span className="rounded-xl bg-[#007AFF]/10 text-[#007AFF] w-8 h-8 shrink-0 flex items-center justify-center text-xs font-mono border border-[#007AFF]/20">
                  {i + 1}
                </span>
                <span className="flex-1 font-display font-semibold text-[#F5F5F7] text-base">{item.q}</span>
                <span className="text-muted-foreground group-open:rotate-45 transition-transform shrink-0 font-light text-2xl leading-none">+</span>
              </summary>
              <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed border-t border-white/[0.02] pt-4 mt-1 bg-[#121212]/30">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 7. CTA ──────────────────────────────────────────────── */}
      <section className="container py-20 px-4">
        <Card className="p-8 sm:p-20 text-center relative overflow-hidden bg-gradient-to-b from-[#16161A] to-[#121212] border border-white/[0.08] rounded-[3.5rem] shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,122,255,0.15),transparent_50%)] pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">{tCta('title')}</h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">{tCta('subtitle')}</p>
            <div className="flex justify-center pt-2">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#007AFF]/95 text-white font-semibold text-base py-4 px-10 rounded-full shadow-[0_0_30px_rgba(0,122,255,0.4)] transition-shadow"
              >
                {tCta('button')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2} />
              <span>{t('trustTrial')} · {t('trustAds')}</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function ForecastTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
  hint: string;
  tone: 'emerald' | 'amber' | 'veloce' | 'muted';
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-400'
        : tone === 'veloce'
          ? 'text-[#007AFF]'
          : 'text-muted-foreground';
  return (
    <div className="p-4 bg-black/40 border border-white/[0.06] rounded-2xl space-y-1">
      <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-xl font-bold text-white font-mono tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
    </div>
  );
}
