'use client';

import { useState } from 'react';
import { Sparkles, Check, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckoutButton } from '@/app/[locale]/(marketing)/pricing/checkout-button';

const TRANSLATIONS = {
  fr: {
    title: "Activez votre accès premium sans interruption",
    desc: "Sélectionnez la formule la plus adaptée à vos objectifs financiers et de gestion de flotte.",
    monthly: "Mensuel",
    yearly: "Annuel",
    discount: "−25%",
    recommended: "Recommandé",
    passionateDesc: "Pour les propriétaires individuels passionnés.",
    perMonth: "€ / mois",
    billedYearly: "Facturé 89,99 €/an",
    noCommitment: "Sans engagement",
    trial30Start: "Essai 30 jours · Commencer",
    familyFleetDesc: "Pour les flottes familiales et petits parcs d'affaires.",
    billedYearlyFamily: "Facturé 149,99 €/an",
    trial30Choose: "Essai 30 jours · Choisir",
    premiumFeatures: [
      "Scans OCR illimités (Reçus & PDF)",
      "Suivi du TCO & Mix énergétique réel",
      "Carnet d'entretien immuable (RLS)",
      "Télémétrie & Diagnostics prédictifs",
      "Nombre de véhicules illimités"
    ],
    familyFeatures: [
      "Tout le contenu de la formule Premium",
      "Multi-comptes simultanés (jusqu'à 5)",
      "Portail de gestion de flotte simplifié",
      "Exports fiscaux avancés consolidés",
      "Support prioritaire sous 2h ouvrées"
    ]
  },
  en: {
    title: "Activate your premium access seamlessly",
    desc: "Select the plan best suited to your financial and fleet management goals.",
    monthly: "Monthly",
    yearly: "Yearly",
    discount: "-25%",
    recommended: "Recommended",
    passionateDesc: "For passionate individual car owners.",
    perMonth: "€ / month",
    billedYearly: "Billed €89.99/year",
    noCommitment: "No commitment",
    trial30Start: "30-Day Trial · Start",
    familyFleetDesc: "For family fleets and small business parcs.",
    billedYearlyFamily: "Billed €149.99/year",
    trial30Choose: "30-Day Trial · Choose",
    premiumFeatures: [
      "Unlimited OCR Scans (Receipts & PDFs)",
      "Real-time TCO & Energy Mix Tracking",
      "Immutable Service Logbook (RLS)",
      "Telemetry & Predictive Diagnostics",
      "Unlimited number of vehicles"
    ],
    familyFeatures: [
      "All features from the Premium plan",
      "Simultaneous multi-accounts (up to 5)",
      "Simplified fleet management portal",
      "Consolidated advanced tax exports",
      "Priority support within 2 business hours"
    ]
  },
  es: {
    title: "Activa tu acceso premium sin interrupciones",
    desc: "Selecciona la fórmula que mejor se adapte a tus objetivos financieros y de gestión de flota.",
    monthly: "Mensual",
    yearly: "Anual",
    discount: "-25%",
    recommended: "Recomendado",
    passionateDesc: "Para propietarios individuales apasionados.",
    perMonth: "€ / mes",
    billedYearly: "Facturado 89,99 €/año",
    noCommitment: "Sin compromiso",
    trial30Start: "Prueba 30 días · Comenzar",
    familyFleetDesc: "Para flotas familiares y pequeños parques empresariales.",
    billedYearlyFamily: "Facturado 149,99 €/año",
    trial30Choose: "Prueba 30 días · Elegir",
    premiumFeatures: [
      "Escaneos OCR ilimitados (Recibos y PDF)",
      "Seguimiento de TCO y mix energético real",
      "Carnet de mantenimiento inalterable (RLS)",
      "Telemetría y diagnósticos predictivos",
      "Número ilimitado de vehículos"
    ],
    familyFeatures: [
      "Todo el contenido de la fórmula Premium",
      "Multicuenta simultánea (hasta 5)",
      "Portal de gestión de flota simplificado",
      "Exportaciones fiscales consolidadas",
      "Soporte prioritario en menos de 2h laborables"
    ]
  },
  ar: {
    title: "نشط وصولك الممتاز بدون انقطاع",
    desc: "اختر الصيغة الأكثر ملاءمة لأهدافك المالية وإدارة أسطولك.",
    monthly: "شهري",
    yearly: "سنوي",
    discount: "-25%",
    recommended: "موصى به",
    passionateDesc: "لمالكي السيارات الأفراد الشغوفين.",
    perMonth: "يورو / شهر",
    billedYearly: "تُدفع 89.99 يورو/سنوياً",
    noCommitment: "بدون التزام",
    trial30Start: "تجربة 30 يومًا · ابدأ",
    familyFleetDesc: "للأساطيل العائلية وحدائق الأعمال الصغيرة.",
    billedYearlyFamily: "تُدفع 149.99 يورو/سنوياً",
    trial30Choose: "تجربة 30 يومًا · اختر",
    premiumFeatures: [
      "مسح OCR غير محدود (إإيصالات وملفات PDF)",
      "تتبع TCO ومزيج الطاقة في الوقت الفعلي",
      "دفتر صيانة غير قابل للتعديل (RLS)",
      "الاتصال عن بعد والتشخيصات التنبؤية",
      "عدد غير محدود من المركبات"
    ],
    familyFeatures: [
      "جميع ميزات خطة بريميوم",
      "حسابات متعددة متزامنة (حتى 5)",
      "بوابة إدارة أسطول مبسطة",
      "تصدير ضريبي consolidate متقدم",
      "دعم ذو أولوية خلال ساعتي عمل"
    ]
  },
  pt: {
    title: "Ative seu acesso premium sem interrupções",
    desc: "Selecione a fórmula que melhor se adapta aos seus objetivos financeiros e de gestão de frota.",
    monthly: "Mensal",
    yearly: "Anual",
    discount: "-25%",
    recommended: "Recomendado",
    passionateDesc: "Para proprietários individuais apaixonados.",
    perMonth: "€ / mês",
    billedYearly: "Faturado 89,99 €/ano",
    noCommitment: "Sem compromisso",
    trial30Start: "Teste 30 dias · Começar",
    familyFleetDesc: "Para frotas familiares e pequenos parques empresariais.",
    billedYearlyFamily: "Faturado 149,99 €/ano",
    trial30Choose: "Teste 30 dias · Escolher",
    premiumFeatures: [
      "Leituras OCR ilimitadas (Recibos e PDF)",
      "Acompanhamento de TCO e mix energético real",
      "Caderneta de manutenção inalterável (RLS)",
      "Telemetria e diagnósticos preditivos",
      "Número de veículos ilimitado"
    ],
    familyFeatures: [
      "Todo o conteúdo da fórmula Premium",
      "Multicontas simultâneas (até 5)",
      "Portal de gestão de frota simplificado",
      "Exportações fiscais consolidadas",
      "Suporte prioritário em menos de 2h úteis"
    ]
  }
};

export function BillingPricingSelector({ currentLocale }: { currentLocale?: string }) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const locale = currentLocale || 'fr';
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.fr;

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col items-center space-y-3">
        <h3 className="font-display text-lg font-semibold text-white">
          {t.title}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-lg">
          {t.desc}
        </p>

        {/* Interval Selector Toggle */}
        <div className="inline-flex p-1 rounded-full bg-[#16161A]/80 border border-white/5 backdrop-blur-md mt-2">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              interval === 'monthly'
                ? 'bg-[#2D2D2D] text-white shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {t.monthly}
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              interval === 'yearly'
                ? 'bg-[#2D2D2D] text-white shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {t.yearly}
            <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] px-1.5 py-0">
              {t.discount}
            </Badge>
          </button>
        </div>
      </div>

      {/* Single tier at launch — the Family/Pro card is parked alongside the
          landing-page one until its multi-account promises are implemented. */}
      <div className="grid gap-6 max-w-md mx-auto pt-2">
        {/* Premium Plan Card */}
        <Card className="p-6 border border-[#007AFF]/40 bg-gradient-to-b from-[#007AFF]/10 to-transparent backdrop-blur-md rounded-card flex flex-col justify-between relative shadow-lg">
          <Badge className="bg-[#007AFF] text-white absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-none shadow-[0_0_10px_rgba(0,122,255,0.4)] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {t.recommended}
          </Badge>
          <div className="space-y-4">
            <div>
              <h4 className="font-display text-base font-bold text-white">Premium</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t.passionateDesc}
              </p>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold text-white">
                  {interval === 'yearly' ? '7,50' : '9,99'}
                </span>
                <span className="text-xs text-muted-foreground">{t.perMonth}</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                {interval === 'yearly' ? t.billedYearly : t.noCommitment}
              </div>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground pt-3 border-t border-white/[0.04]">
              {t.premiumFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#007AFF]" />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-6">
            <CheckoutButton
              interval={interval}
              tier="premium"
              label={t.trial30Start}
              className="w-full bg-[#007AFF] text-white hover:bg-[#005bb5] font-semibold text-xs py-5 rounded-full shadow-glow-veloce transition-all"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
