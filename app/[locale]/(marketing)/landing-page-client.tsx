'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from '@/lib/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  ScanLine,
  ShieldCheck,
  TrendingUp,
  Map,
  Leaf,
  Sparkles,
  ArrowRight,
  Camera,
  Wrench,
  CheckCircle2,
  Check,
  Cpu,
  Fingerprint,
  Calendar,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckoutButton } from './pricing/checkout-button';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function LandingPageClient({ locale }: { locale: string }) {
  const tCommon = useTranslations('common');
  const t = useTranslations('landing.hero');
  const tFeatures = useTranslations('landing.features');
  const tHow = useTranslations('landing.howItWorks');
  const tTestimonials = useTranslations('landing.testimonials');
  const tPricing = useTranslations('pricing');
  const tCta = useTranslations('landing.cta');
  const tFaq = useTranslations('landing.faq');

  // Magnetic button handler
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    gsap.to(btn, {
      x: x * 0.35,
      y: y * 0.35,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1.1, 0.4)',
    });
  };

  // State for interactive features
  // Receipt scanner animation (Card 1)
  const [ocrStep, setOcrStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setOcrStep((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // TCO Realtime values (Card 2)
  const [tcoEnergy, setTcoEnergy] = useState(219);
  const [tcoDistance, setTcoDistance] = useState(12500);
  useEffect(() => {
    const interval = setInterval(() => {
      setTcoEnergy((prev) => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1) * 2;
        return next < 180 ? 180 : next > 250 ? 250 : next;
      });
      setTcoDistance((prev) => prev + Math.floor(Math.random() * 5));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Resale index dynamic counter animation
  const [resaleValue, setResaleValue] = useState(82.0);
  const resaleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resaleRef.current) return;
    const counterObj = { val: 82.0 };
    gsap.to(counterObj, {
      val: 94.7,
      duration: 2.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: resaleRef.current,
        start: 'top 85%',
      },
      onUpdate: () => {
        setResaleValue(Number(counterObj.val.toFixed(1)));
      },
    });
  }, []);

  // Text Reveal animation for the Manifesto (ScrollTrigger)
  const manifestoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!manifestoRef.current) return;
    const lines = manifestoRef.current.querySelectorAll('.manifesto-line');
    gsap.fromTo(
      lines,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.25,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: manifestoRef.current,
          start: 'top 80%',
        },
      }
    );
  }, []);

  // Sticky stacking cards for the "Protocole Inaltérable"
  const protocolRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!protocolRef.current) return;
    const cards = protocolRef.current.querySelectorAll('.protocol-card');
    cards.forEach((card, idx) => {
      if (idx === cards.length - 1) return; // Don't shrink the last card
      gsap.to(card, {
        scale: 0.92,
        opacity: 0.6,
        scrollTrigger: {
          trigger: card,
          start: 'top 15%',
          endTrigger: protocolRef.current,
          end: 'bottom 85%',
          scrub: true,
        },
      });
    });
  }, []);

  return (
    <div className="flex-1 bg-[#121212] text-[#F5F5F7]">
      {/* 1. HERO SECTION — "L'Ouverture Financière" */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden py-20 px-4">
        {/* Cockpit premium style background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,122,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/80 to-[#121212]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[size:30px_30px] bg-[linear-gradient(to_right,gray_1px,transparent_1px),linear-gradient(to_bottom,gray_1px,transparent_1px)]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="font-display text-[2.75rem] sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.98] text-white">
              {t('titleLead')}<br />
              <span className="font-serif italic font-normal text-gradient-veloce bg-gradient-to-r from-[#007AFF] via-cyan-400 to-indigo-400">
                {t('titleHighlight')}
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative bg-white hover:bg-white text-black font-semibold text-base py-4 px-8 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-shadow duration-300 overflow-hidden group w-full sm:w-auto"
              >
                <Link href="/signup" className="flex items-center justify-center gap-2">
                  {t('ctaPrimary')}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                {/* Gloss highlight effect */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              </button>

              <button
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative bg-transparent hover:bg-white/5 text-[#F5F5F7] border border-white/10 font-semibold text-base py-4 px-8 rounded-full transition-colors duration-300 w-full sm:w-auto"
              >
                <Link href="/dashboard" className="flex items-center justify-center">
                  {t('ctaSecondary')}
                </Link>
              </button>
            </div>

            <div className="flex items-center gap-6 pt-6 text-xs text-[#F5F5F7]/40 font-mono">
              <div>RATING: 4.9/5</div>
              <div className="h-3 w-px bg-white/10" />
              <div>ASSETS: €120M+</div>
              <div className="h-3 w-px bg-white/10" />
              <div className="uppercase">TRIAL: {t('trial')}</div>
            </div>
          </div>

          {/* Interactive Hero Cockpit Mockup with Premium Concept Vehicle Background */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#007AFF]/35 to-indigo-500/15 blur-3xl rounded-[2.5rem] pointer-events-none" />
            <div className="relative border border-white/[0.08] bg-[#16161A]/85 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden min-h-[460px] flex flex-col justify-between group">
              {/* Premium Luxury Carbon Car Background */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <Image
                  src="/images/luxury-car.png"
                  alt="VeloceWealth Premium Concept Car"
                  fill
                  priority
                  sizes="(max-w-7xl) 100vw, 50vw"
                  className="object-cover opacity-40 mix-blend-luminosity group-hover:scale-105 group-hover:opacity-55 transition-all duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#16161A]/40 to-transparent" />
              </div>

              {/* Cockpit laser decorative grid */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#007AFF]/5 rounded-full blur-2xl pointer-events-none z-0" />
              
              <div className="relative z-10 flex items-center justify-between pb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-[#007AFF] animate-pulse" />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Live Cockpit</span>
                </div>
                <Badge className="bg-[#2D2D2D]/90 text-[#007AFF] border border-[#007AFF]/20">Premium Active</Badge>
              </div>

              {/* Live monetary metric */}
              <div className="relative z-10 py-6 space-y-2">
                <span className="text-xs text-muted-foreground font-mono uppercase">{t('demoTitle')}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-mono tracking-tight text-white tabular-nums">0,184</span>
                  <span className="text-lg font-mono text-muted-foreground">€ / KM</span>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-4 pb-6">
                <div className="p-4 bg-black/40 backdrop-blur-md border border-white/[0.06] rounded-2xl space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">{t('demoEnergy')}</span>
                  <div className="text-lg font-bold text-white font-mono">
                    78% <span className="text-xs font-normal text-emerald-400">{locale === 'fr' ? '⚡ Coût bas' : locale === 'es' ? '⚡ Bajo coste' : '⚡ Low cost'}</span>
                  </div>
                </div>
                <div className="p-4 bg-black/40 backdrop-blur-md border border-white/[0.06] rounded-2xl space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {locale === 'fr' ? 'Kilométrage total' : locale === 'es' ? 'Kilometraje total' : 'Total mileage'}
                  </span>
                  <div className="text-lg font-bold text-white font-mono tabular-nums">{tcoDistance.toLocaleString(locale)} km</div>
                </div>
              </div>

              <div className="relative z-10 p-4 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Leaf className="h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-emerald-400">
                      {locale === 'fr' ? 'Score de Durabilité' : locale === 'es' ? 'Puntuación Eco' : 'Eco Score'}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{t('demoEcoDelta')}</div>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono">A+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PHILOSOPHIE SECTION — "Le Manifeste de Valeur" */}
      <section ref={manifestoRef} className="py-24 sm:py-36 bg-[#0D0D12] relative overflow-hidden border-y border-white/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(0,122,255,0.05),transparent_40%)]" />
        <div className="container relative z-10 max-w-4xl text-center px-6">
          <Badge className="bg-[#2D2D2D]/60 text-[#C5A059] border border-[#C5A059]/20 rounded-full px-4 py-1 text-xs font-mono mb-8 uppercase tracking-widest">
            {locale === 'fr' ? 'Le Manifeste de Valeur' : locale === 'es' ? 'El Manifiesto de Valor' : 'The Value Manifesto'}
          </Badge>
          <div className="space-y-6 text-2xl sm:text-4xl md:text-5xl font-display font-light leading-snug tracking-tight [text-wrap:balance]">
            <div className="manifesto-line text-muted-foreground">
              {locale === 'fr' ? 'La plupart des conducteurs subissent : ' : locale === 'es' ? 'La mayoría de los conductores sufren: ' : 'Most drivers suffer: '}
              <span className="text-white font-medium font-serif italic">
                {locale === 'fr' ? 'la dépréciation' : locale === 'es' ? 'la depreciación' : 'the depreciation'}
              </span>
              {locale === 'fr' ? ' de leur véhicule.' : locale === 'es' ? ' de su vehículo.' : ' of their vehicle.'}
            </div>
            <div className="manifesto-line text-[#C5A059] font-medium pt-4">
              {locale === 'fr' ? 'Nous nous concentrons sur : ' : locale === 'es' ? 'Nos enfocamos en: ' : 'We focus on: '}
              <span className="text-[#007AFF] font-bold">
                {locale === 'fr' ? 'la valorisation' : locale === 'es' ? 'la valorización' : 'maximizing the value'}
              </span>
              {locale === 'fr' ? ' de votre capital roulant.' : locale === 'es' ? ' de su capital rodante.' : ' of your driving capital.'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FONCTIONNALITES — "Tableau de Bord Prédictif" */}
      <section id="features" className="container py-24 px-4 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <Badge variant="outline" className="border-[#007AFF]/30 text-[#007AFF] font-mono px-3 py-0.5 rounded-full text-xs uppercase">
            {locale === 'fr' ? 'TECHNOLOGIES PROPRIÉTAIRES' : locale === 'es' ? 'TECNOLOGÍAS PROPIETARIAS' : 'PROPRIETARY TECHNOLOGIES'}
          </Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
            {tFeatures('title')}
          </h2>
          <p className="text-muted-foreground">
            {tFeatures('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 — Le Flux OCR */}
          <Card className="p-8 border border-white/[0.08] bg-[#16161A]/60 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between group shadow-xl">
            {/* Animated Laser Scanning Line */}
            <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#007AFF] to-transparent shadow-[0_0_12px_#007AFF] animate-laser z-20 pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF]">
                <ScanLine className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">{tFeatures('ocrTitle')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tFeatures('ocrDescription')}
              </p>

              {/* Interactive cycling receipt scanner */}
              <div className="bg-[#2D2D2D]/30 border border-white/[0.04] rounded-2xl p-4 space-y-3 font-mono text-xs text-muted-foreground">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-[10px] text-white">RECEIPT_SCANNER.LOG</span>
                  <span className="text-[9px] text-[#007AFF] animate-pulse">RUNNING</span>
                </div>
                <div className="space-y-2">
                  <div className={`flex justify-between items-center px-2 py-1.5 rounded transition-all duration-300 ${ocrStep === 0 ? 'bg-[#007AFF]/10 text-[#007AFF] border-l-2 border-[#007AFF]' : 'opacity-40'}`}>
                    <span>{locale === 'fr' ? '1. ANALYSE DU REÇU...' : locale === 'es' ? '1. ANALIZANDO TICKET...' : '1. ANALYZING RECEIPT...'}</span>
                    <span>TTC: 78.50 €</span>
                  </div>
                  <div className={`flex justify-between items-center px-2 py-1.5 rounded transition-all duration-300 ${ocrStep === 1 ? 'bg-[#007AFF]/10 text-[#007AFF] border-l-2 border-[#007AFF]' : 'opacity-40'}`}>
                    <span>{locale === 'fr' ? '2. EXTRACTION DES TAXES...' : locale === 'es' ? '2. EXTRACCIÓN DE IMPUESTOS...' : '2. EXTRACTING TAXES...'}</span>
                    <span>TVA: 13.08 €</span>
                  </div>
                  <div className={`flex justify-between items-center px-2 py-1.5 rounded transition-all duration-300 ${ocrStep === 2 ? 'bg-[#007AFF]/10 text-[#007AFF] border-l-2 border-[#007AFF]' : 'opacity-40'}`}>
                    <span>{locale === 'fr' ? '3. PROTOCOLE CERTIFIÉ' : locale === 'es' ? '3. PROTOCOLO CERTIFICADO' : '3. CERTIFIED PROTOCOL'}</span>
                    <span className="text-emerald-400">SUCCESS</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2 — TCO Direct */}
          <Card className="p-8 border border-white/[0.08] bg-[#16161A]/60 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between group shadow-xl">
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">
                {locale === 'fr' ? 'TCO Direct' : locale === 'es' ? 'TCO Directo' : 'Direct TCO'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === 'fr' 
                  ? "Suivez en continu votre coût réel au kilomètre. Notre formule intègre en direct l'amortissement et les charges énergétiques fluctuantes."
                  : locale === 'es'
                  ? "Realiza un seguimiento continuo de tu coste real por kilómetro. Nuestra fórmula integra la depreciación y los gastos de energía en tiempo real."
                  : "Track your true cost per kilometer continuously. Our formula integrates depreciation and energy expenses in real time."}
              </p>

              {/* Monospace formula stream */}
              <div className="bg-[#2D2D2D]/30 border border-white/[0.04] rounded-2xl p-4 font-mono text-[11px] text-[#F5F5F7] space-y-3">
                <div className="text-xs text-muted-foreground border-b border-white/[0.04] pb-2">TCO CALCULATOR ENGINE</div>
                <div className="text-muted-foreground overflow-x-auto whitespace-nowrap">
                  {locale === 'fr' ? 'Coût/Km = (Énergie + Entretien + Assurance) / Distance' : locale === 'es' ? 'Coste/Km = (Energía + Mantenimiento + Seguro) / Distancia' : 'Cost/Km = (Energy + Maintenance + Insurance) / Distance'}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{locale === 'fr' ? 'Énergie (Mois) :' : locale === 'es' ? 'Energía (Mes) :' : 'Energy (Month) :'}</span>
                    <span className="text-white font-bold">{tcoEnergy} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{locale === 'fr' ? 'Assurance :' : locale === 'es' ? 'Seguro :' : 'Insurance :'}</span>
                    <span className="text-white">78 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{locale === 'fr' ? 'Distance :' : locale === 'es' ? 'Distancia :' : 'Distance :'}</span>
                    <span className="text-white">{tcoDistance.toLocaleString(locale)} km</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.04] flex justify-between text-emerald-400 font-bold">
                    <span>{locale === 'fr' ? 'COÛT RECALCULÉ :' : locale === 'es' ? 'COSTE RECALCULADO :' : 'RECALCULATED COST :'}</span>
                    <span>{((tcoEnergy + 78 + 184) / 125).toFixed(3)} € / km</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3 — Protocole Maintenance */}
          <Card className="p-8 border border-white/[0.08] bg-[#16161A]/60 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between group shadow-xl">
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">
                {locale === 'fr' ? 'Protocole Maintenance' : locale === 'es' ? 'Protocolo de Mantenimiento' : 'Maintenance Protocol'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === 'fr'
                  ? "Anticipez les anomalies avant qu'elles ne surviennent. Le diagnostic prédictif analyse en temps réel l'usure mécanique."
                  : locale === 'es'
                  ? "Anticípate a las anomalías antes de que ocurran. El diagnóstico predictivo analiza el desgaste mecánico en tiempo real."
                  : "Anticipate mechanical failures before they happen. The predictive diagnostic analyzes mechanical wear in real time."}
              </p>

              {/* Weekly scheduling grid with indicator */}
              <div className="bg-[#2D2D2D]/30 border border-white/[0.04] rounded-2xl p-4 space-y-3 font-mono text-xs text-muted-foreground">
                <div className="flex justify-between text-[10px] text-white border-b border-white/[0.04] pb-2">
                  <span>{locale === 'fr' ? 'PLANIFICATION INTELLIGENTE' : locale === 'es' ? 'PLANIFICACIÓN INTELIGENTE' : 'SMART SCHEDULING'}</span>
                  <span className="text-indigo-400 font-bold">WEIBULL</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded border border-emerald-500/20">
                    <div>{locale === 'fr' ? 'PNEUS' : locale === 'es' ? 'NEUMÁTICOS' : 'TIRES'}</div>
                    <div className="font-bold mt-1">94%</div>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded border border-emerald-500/20">
                    <div>{locale === 'fr' ? 'FREINS' : locale === 'es' ? 'FRENOS' : 'BRAKES'}</div>
                    <div className="font-bold mt-1">82%</div>
                  </div>
                  <div className="bg-amber-500/10 text-amber-400 p-2 rounded border border-amber-500/20">
                    <div>{locale === 'fr' ? 'FILTRE' : locale === 'es' ? 'FILTRO' : 'FILTER'}</div>
                    <div className="font-bold mt-1">45%</div>
                  </div>
                  <div className="bg-red-500/10 text-red-400 p-2 rounded border border-red-500/20 animate-pulse">
                    <div>{locale === 'fr' ? 'BATTERIE' : locale === 'es' ? 'BATERÍA' : 'BATTERY'}</div>
                    <div className="font-bold mt-1">12%</div>
                  </div>
                </div>
                <div className="bg-[#121212]/80 p-2.5 rounded border border-white/[0.04] text-[10px] flex items-center justify-between text-white">
                  <span>{locale === 'fr' ? '🔧 PLANIFIER RÉVISION' : locale === 'es' ? '🔧 PROGRAMAR REVISIÓN' : '🔧 SCHEDULE REVISION'}</span>
                  <span className="text-indigo-400 font-bold underline cursor-pointer">{locale === 'fr' ? 'PRENDRE RDV' : locale === 'es' ? 'PEDIR CITA' : 'BOOK APPOINTMENT'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. PROTOCOLE SECTION — "L'Historique Inaltérable" */}
      <section ref={protocolRef} className="py-24 px-4 bg-[#0D0D12] relative overflow-hidden">
        <div className="container max-w-5xl space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <Badge className="bg-[#2D2D2D]/80 text-[#C5A059] border border-[#C5A059]/20 rounded-full px-4 py-1 text-xs font-mono uppercase tracking-widest">
              {locale === 'fr' ? "L'Historique Inaltérable" : locale === 'es' ? 'El Historial Inalterable' : 'The Immutable History'}
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
              {locale === 'fr' ? "Protocole d'Intégrité" : locale === 'es' ? 'Protocolo de Integridad' : 'Integrity Protocol'}
            </h2>
            <p className="text-muted-foreground">
              {locale === 'fr' 
                ? 'Trois phases technologiques interconnectées garantissant une certification infalsifiable de la vie de votre actif automobile.'
                : locale === 'es'
                ? 'Tres fases tecnológicas interconectadas que garantizan una certificación infalsificable de la vida de tu activo.'
                : 'Three interconnected technological phases ensuring an unalterable certification of your automotive asset.'}
            </p>
          </div>

          <div className="space-y-12">
            {/* Card 1 — Phase de Collecte */}
            <div className="protocol-card sticky top-28 bg-[#16161A] border border-white/[0.06] rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] grid md:grid-cols-2 gap-8 items-center min-h-[400px]">
              <div className="space-y-6">
                <span className="text-xs font-mono text-[#007AFF] font-bold tracking-widest uppercase">
                  {locale === 'fr' ? 'PHASE 01 // COLLECTE SÉCURISÉE' : locale === 'es' ? 'FASE 01 // CAPTURA SEGURA' : 'PHASE 01 // SECURE CAPTURE'}
                </span>
                <h3 className="text-3xl font-bold text-white font-display">
                  {locale === 'fr' ? 'Collecte & Scan Instantané' : locale === 'es' ? 'Captura y Escaneo Instantáneo' : 'Capture & Instant Scan'}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-sans text-sm">
                  {locale === 'fr'
                    ? 'Chaque dépense, reçu de recharge ou facture est immédiatement numérisé et converti en données exploitables. Une ligne laser intelligente certifie la validité des métadonnées dès la capture.'
                    : locale === 'es'
                    ? 'Cada gasto, ticket de carga o factura se digitaliza y se convierte inmediatamente en datos procesables. Una línea láser inteligente certifica la validez de los metadatos.'
                    : 'Every expense, charging receipt, or invoice is immediately digitized and converted into actionable data. An intelligent laser line certifies the metadata validity upon capture.'}
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground bg-[#2D2D2D]/30 border border-white/[0.04] p-3 rounded-xl max-w-xs">
                  <Fingerprint className="h-5 w-5 text-[#007AFF]" />
                  <span>SHA-256 INITIALISATION DE FLUX</span>
                </div>
              </div>
              <div className="relative border border-white/[0.06] rounded-2xl p-6 bg-[#2D2D2D]/20 overflow-hidden flex items-center justify-center min-h-[220px]">
                {/* Visual laser animation overlay */}
                <div className="absolute left-0 w-full h-[2px] bg-[#007AFF] shadow-[0_0_15px_#007AFF] animate-laser" />
                <div className="text-center space-y-3 font-mono text-xs opacity-60">
                  <div className="border border-white/20 p-4 rounded bg-[#121212] text-[#007AFF] text-left">
                    <div>SCANNING DOCUMENT...</div>
                    <div className="text-[10px] text-white mt-1">HASH: e3b0c44298fc1c149afbf4c8996fb9...42</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — Phase d'Analyse */}
            <div className="protocol-card sticky top-32 bg-[#1A1A20] border border-white/[0.06] rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] grid md:grid-cols-2 gap-8 items-center min-h-[400px]">
              <div className="space-y-6">
                <span className="text-xs font-mono text-indigo-400 font-bold tracking-widest uppercase">
                  {locale === 'fr' ? 'PHASE 02 // ANALYSE PRÉDICTIVE' : locale === 'es' ? 'FASE 02 // ANÁLISIS PREDICTIVO' : 'PHASE 02 // PREDICTIVE ANALYSIS'}
                </span>
                <h3 className="text-3xl font-bold text-white font-display">
                  {locale === 'fr' ? 'Le Jumeau Numérique' : locale === 'es' ? 'El Gemelo Digital' : 'The Digital Twin'}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-sans text-sm">
                  {locale === 'fr'
                    ? "Notre algorithme croise la télémétrie OBD en temps réel avec des modèles physiques d'usure. Nous générons une réplique virtuelle dynamique pour prédire la durée de vie résiduelle des pièces."
                    : locale === 'es'
                    ? 'Nuestro algoritmo cruza la telemetría OBD en tiempo real con modelos físicos de desgaste. Generamos una réplica virtual dinámica para predecir la vida útil restante.'
                    : 'Our algorithm crosses real-time OBD telemetry with physical wear models. We generate a dynamic virtual replica to predict remaining component life.'}
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground bg-[#2D2D2D]/30 border border-white/[0.04] p-3 rounded-xl max-w-xs">
                  <Cpu className="h-5 w-5 text-indigo-400" />
                  <span>ALGORITHME WEIBULL RUL PROCESSED</span>
                </div>
              </div>
              <div className="relative border border-white/[0.06] rounded-2xl p-6 bg-[#2D2D2D]/20 overflow-hidden flex items-center justify-center min-h-[220px]">
                {/* Visual ECG heartbeat path animation */}
                <svg className="w-full h-32 text-indigo-400 opacity-60" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M0,15 L30,15 L33,10 L36,20 L39,5 L42,25 L45,13 L48,15 L100,15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="animate-ecg"
                  />
                </svg>
              </div>
            </div>

            {/* Card 3 — Phase de Certification */}
            <div className="protocol-card sticky top-36 bg-[#1D1A26] border border-white/[0.06] rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] grid md:grid-cols-2 gap-8 items-center min-h-[400px]">
              <div className="space-y-6">
                <span className="text-xs font-mono text-emerald-400 font-bold tracking-widest uppercase">
                  {locale === 'fr' ? 'PHASE 03 // LABELLISATION' : locale === 'es' ? 'FASE 03 // CERTIFICACIÓN' : 'PHASE 03 // CERTIFICATION'}
                </span>
                <h3 className="text-3xl font-bold text-white font-display">
                  {locale === 'fr' ? 'Carnet Certifié Immuable' : locale === 'es' ? 'Libro Certificado Inalterable' : 'Immutable Certified Logbook'}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-sans text-sm">
                  {locale === 'fr'
                    ? "Toutes les transactions et interventions d'entretien validées génèrent un hash SHA-256 sécurisé chaîné en base de données. Supabase interdit formellement toute tentative de modification fiscale."
                    : locale === 'es'
                    ? 'Todas las transacciones y mantenimientos validados generan un hash SHA-256 seguro encadenado en la base de datos. Supabase impide cualquier alteración.'
                    : 'All validated transactions and maintenance events generate a secure SHA-256 hash chained in the database. Supabase strictly blocks any direct tampering attempts.'}
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground bg-[#2D2D2D]/30 border border-white/[0.04] p-3 rounded-xl max-w-xs">
                  <Lock className="h-5 w-5 text-emerald-400" />
                  <span>RLS STRICT TRIGGER INMUTABILITY ON</span>
                </div>
              </div>
              <div className="relative border border-white/[0.06] rounded-2xl p-6 bg-[#2D2D2D]/20 overflow-hidden flex flex-col items-center justify-center min-h-[220px] text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-emerald-400 animate-pulse" />
                <div className="font-mono text-xs text-emerald-400 font-bold">
                  {locale === 'fr' ? 'EXPORT PDF CERTIFIÉ VALIDÉ' : locale === 'es' ? 'EXPORTACIÓN PDF CERTIFICADA' : 'CERTIFIED PDF EXPORT SUCCESS'}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground">SIGNATURE INTERNE: VELOCE_SECURE_AUTH</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VALEUR DE MARCHE / INDICE DE REVENTE & TARIFICATION */}
      <section ref={resaleRef} className="container py-24 px-4 space-y-20 resale-counter-trigger">
        {/* Dynamic Resale Index Counter Block */}
        <div className="max-w-4xl mx-auto border border-[#C5A059]/20 bg-[#16161A] p-8 sm:p-12 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Badge className="bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 rounded-full px-3 py-0.5 text-xs font-mono uppercase">
                {locale === 'fr' ? 'Préservation de Capital' : locale === 'es' ? 'Preservación de Capital' : 'Capital Preservation'}
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-bold font-display text-white">{tFeatures('resaleTitle')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {tFeatures('resaleDescription')}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center py-6 bg-[#2D2D2D]/30 border border-white/[0.04] rounded-2xl text-center space-y-2">
              <span className="text-xs text-muted-foreground font-mono uppercase">
                {locale === 'fr' ? 'Valeur Résiduelle Moyenne' : locale === 'es' ? 'Valor Residual Medio' : 'Average Residual Value'}
              </span>
              <div className="text-7xl font-bold font-mono text-[#C5A059] tracking-tighter tabular-nums">
                {resaleValue}%
              </div>
              <span className="text-xs text-emerald-400 font-mono">
                {locale === 'fr' ? '+12.7% vs suivi classique' : locale === 'es' ? '+12.7% vs seguimiento estándar' : '+12.7% vs standard tracking'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing structure */}
        <div id="pricing" className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <Badge variant="premium">
              <Sparkles className="h-3 w-3" /> {tPricing('noAds')}
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
              {tPricing('title')}
            </h2>
            <p className="text-muted-foreground">
              {tPricing('subtitle')}
            </p>
          </div>

          {/* Two tiers at launch. The Fleet/family card is parked until the
              multi-account, API and priority-support promises it carried are
              actually implemented — the checkout route still accepts
              tier="family", so restoring the card is all that's needed. */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Standard Plan */}
            <Card className="p-8 border border-white/[0.08] bg-[#16161A]/50 rounded-[2.5rem] flex flex-col justify-between shadow-xl">
              <div className="space-y-6">
                <div>
                  <h4 className="font-display text-xl font-bold text-white">{tPricing('standardName')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{tPricing('standardDescription')}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-5xl font-bold text-white">0</span>
                  <span className="text-muted-foreground font-mono">{locale === 'fr' || locale === 'es' ? '€' : '$'}</span>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground pt-4 border-t border-white/[0.04]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#007AFF]" />
                    {locale === 'fr' ? '3 scans OCR offerts/mois' : locale === 'es' ? '3 escaneos OCR gratis al mes' : '3 free OCR scans / month'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#007AFF]" />
                    {locale === 'fr' ? "Rappels d'entretien manuels" : locale === 'es' ? 'Recordatorios de mantenimiento manuales' : 'Manual reminders'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#007AFF]" />
                    {locale === 'fr' ? 'Suivi des dépenses et coût au kilomètre' : locale === 'es' ? 'Seguimiento de gastos y coste por kilómetro' : 'Expense tracking & cost per kilometre'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#007AFF]" />
                    {locale === 'fr' ? '1 véhicule supporté' : locale === 'es' ? '1 vehículo compatible' : '1 supported vehicle'}
                  </li>
                </ul>
              </div>
              <Button asChild variant="outline" className="mt-8 rounded-full border-white/10 text-white hover:bg-white/5 py-6">
                <Link href="/signup">{tPricing('standardCta')}</Link>
              </Button>
            </Card>

            {/* Premium Plan - Glassmorphic design highlight */}
            <Card className="p-8 border border-[#007AFF]/40 bg-gradient-to-b from-[#007AFF]/10 to-transparent backdrop-blur-xl rounded-[2.5rem] flex flex-col justify-between relative shadow-2xl">
              <Badge className="bg-[#007AFF] text-white absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border-none shadow-[0_0_15px_rgba(0,122,255,0.6)] px-4 py-1 text-xs">
                {tPricing('mostChosen')}
              </Badge>
              <div className="space-y-6">
                <div className="pt-2">
                  <h4 className="font-display text-xl font-bold text-white">{tPricing('premiumName')}</h4>
                  <p className="text-xs text-[#007AFF] mt-1 font-semibold">{tPricing('premiumDescription')}</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-5xl font-bold text-white">9,99</span>
                    <span className="text-muted-foreground font-mono">{tPricing('premiumPerMonth')}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">{tPricing('premiumPerYear')}</div>
                </div>
                <ul className="space-y-3 text-sm text-white pt-4 border-t border-white/[0.04]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {locale === 'fr' ? 'OCR illimité synchrone PDF' : locale === 'es' ? 'Escaneo OCR ilimitado de PDF' : 'Unlimited synchronous PDF OCR'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {locale === 'fr' ? 'Suivi TCO & Mix énergétique' : locale === 'es' ? 'TCO y Mix de energía en tiempo real' : 'TCO & Energy mix tracking'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {locale === 'fr' ? 'Export fiscal certifié' : locale === 'es' ? 'Exportación fiscal certificada' : 'Tax-ready certified export'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {locale === 'fr' ? 'Carnet certifié (Immutabilité RLS)' : locale === 'es' ? 'Libro certificado (Immutabilidad RLS)' : 'Certified logbook (RLS Immutability)'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {locale === 'fr' ? 'Télémétrie & Alertes PHM' : locale === 'es' ? 'Telemetría y Alertas PHM predictivas' : 'Predictive PHM Alerts & Telemetry'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {locale === 'fr' ? 'Véhicules illimités' : locale === 'es' ? 'Vehículos ilimitados' : 'Unlimited vehicles'}
                  </li>
                </ul>
              </div>
              <div className="mt-8 grid gap-3">
                <CheckoutButton interval="monthly" tier="premium" label={tPricing('premiumCtaMonthly')} />
                <CheckoutButton
                  interval="yearly"
                  tier="premium"
                  label={tPricing('premiumCtaYearly')}
                  variant="outline"
                  className="rounded-full py-6 text-white border-white/10 hover:bg-white/5"
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="container py-24 px-4 border-t border-white/[0.04]">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white">
            {tFaq('title')}
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { q: tFaq('q1'), a: tFaq('a1') },
            { q: tFaq('q2'), a: tFaq('a2') },
            { q: tFaq('q3'), a: tFaq('a3') },
            { q: tFaq('q4'), a: tFaq('a4') },
            { q: tFaq('q5'), a: tFaq('a5') },
            { q: tFaq('q6'), a: tFaq('a6') },
          ].map((item, i) => (
            <details
              key={i}
              className="group rounded-3xl border border-white/[0.08] bg-[#16161A]/40 overflow-hidden"
            >
              <summary className="cursor-pointer p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors list-none">
                <span className="rounded-xl bg-[#007AFF]/10 text-[#007AFF] w-8 h-8 shrink-0 flex items-center justify-center text-xs font-mono border border-[#007AFF]/20">
                  {i + 1}
                </span>
                <span className="flex-1 font-display font-semibold text-[#F5F5F7] text-base">{item.q}</span>
                <span className="text-muted-foreground group-open:rotate-45 transition-transform shrink-0 font-light text-2xl leading-none">+</span>
              </summary>
              <div className="px-6 pb-6 ps-18 text-sm text-muted-foreground leading-relaxed font-sans border-t border-white/[0.02] pt-4 mt-1 bg-[#121212]/30">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 7. CTA SECTION */}
      <section className="container py-20 px-4">
        <Card className="p-8 sm:p-20 text-center relative overflow-hidden bg-gradient-to-b from-[#16161A] to-[#121212] border border-white/[0.08] rounded-[3.5rem] shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,122,255,0.15),transparent_50%)] pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">
              {tCta('title')}
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              {tCta('subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center items-center">
              <button
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative bg-[#007AFF] hover:bg-[#007AFF]/95 text-white font-semibold text-base py-4 px-10 rounded-full shadow-[0_0_30px_rgba(0,122,255,0.4)] transition-shadow duration-300 overflow-hidden group w-full sm:w-auto"
              >
                <Link href="/signup" className="flex items-center justify-center gap-2">
                  {tCta('button')}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2} />
              <span>
                {locale === 'fr' 
                  ? "30 jours d'essai gratuit · sans engagement · sans publicité" 
                  : locale === 'es' 
                  ? "Prueba gratis de 30 días · Sin compromiso · Sin publicidad" 
                  : "30-day free trial · Cancel anytime · Ad-free"}
              </span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
