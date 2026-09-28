import { Link } from '@/lib/i18n/routing';
import { Sparkles, Check, CreditCard, Receipt } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getProfile } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';
import { TRIAL_DAYS, trialDaysRemaining } from '@/lib/trial';
import { resolvePricing, formatPrice } from '@/lib/pricing';
import { isStripeConfigured } from '@/lib/stripe';
import { resolveRequestCountry } from '@/lib/geo';
import { ManageSubscriptionButton } from './manage-button';
import { BillingPricingSelector } from './billing-pricing';

export const dynamic = 'force-dynamic';

const TRANSLATIONS = {
  fr: {
    active: "actif",
    trialActive: "Essai Premium actif",
    premiumActive: "Premium actif",
    familyActive: "Family/Pro actif",
    standard: "Standard",
    trialTitle: "Essai Velocewealth Premium",
    standardTitle: "Velocewealth Standard",
    renewsAuto: "Renouvellement automatique. Modifiez votre abonnement à tout moment.",
    trialDesc: (days: number) => `Profitez de toutes les fonctions Premium pendant ${TRIAL_DAYS} jours (sans carte bancaire). Il vous reste ${days} jour${days > 1 ? 's' : ''}.`,
    upgradeDesc: "Passez Premium pour OCR illimité, carnet certifié et export fiscal.",
    trialPriceNote: (price: string) => `(Période d'essai — puis ${price}/mois)`,
    perMonth: "/mois",
    paymentMethod: "Mode de paiement",
    paymentMethodDesc: "Géré via le portail Stripe — cliquez sur « Modifier ».",
    noPaymentMethod: "Aucun mode de paiement enregistré.",
    billingHistory: "Historique de facturation",
    billingHistoryDesc: "Téléchargez vos factures depuis le portail Stripe.",
    noBillingHistory: "Aucune facture pour le moment.",
    modify: "Modifier",
    view: "Voir",
    features: [
      'Scan OCR illimité',
      'Suivi TCO complet',
      'Export fiscal frais réels',
      'Carnet certifié PDF',
      'Indice de revente temps réel',
      'Analyse éco-conduite',
    ]
  },
  en: {
    active: "active",
    trialActive: "Premium Trial active",
    premiumActive: "Premium active",
    familyActive: "Family/Pro active",
    standard: "Standard",
    trialTitle: "Velocewealth Premium Trial",
    standardTitle: "Velocewealth Standard",
    renewsAuto: "Automatic renewal. Modify your subscription at any time.",
    trialDesc: (days: number) => `Enjoy all Premium features for ${TRIAL_DAYS} days (no credit card required). You have ${days} day${days > 1 ? 's' : ''} left.`,
    upgradeDesc: "Upgrade to Premium for unlimited OCR, certified logbook, and tax export.",
    trialPriceNote: (price: string) => `(Trial period — then ${price}/mo)`,
    perMonth: "/month",
    paymentMethod: "Payment Method",
    paymentMethodDesc: "Managed via Stripe portal — click 'Modify'.",
    noPaymentMethod: "No payment method recorded.",
    billingHistory: "Billing History",
    billingHistoryDesc: "Download your invoices from the Stripe portal.",
    noBillingHistory: "No invoices yet.",
    modify: "Modify",
    view: "View",
    features: [
      'Unlimited OCR Scan',
      'Full TCO Tracking',
      'Actual Expenses Tax Export',
      'Certified PDF Logbook',
      'Real-time Resale Value',
      'Eco-driving Analysis',
    ]
  },
  es: {
    active: "activo",
    trialActive: "Prueba Premium activa",
    premiumActive: "Premium activo",
    familyActive: "Family/Pro activo",
    standard: "Estándar",
    trialTitle: "Prueba Velocewealth Premium",
    standardTitle: "Velocewealth Estándar",
    renewsAuto: "Renovación automática. Modifica tu suscripción en cualquier momento.",
    trialDesc: (days: number) => `Disfruta de todas las funciones Premium durante ${TRIAL_DAYS} días (sin tarjeta de crédito). Te quedan ${days} día${days > 1 ? 's' : ''}.`,
    upgradeDesc: "Pásate a Premium para obtener OCR ilimitado, carnet certificado y exportación fiscal.",
    trialPriceNote: (price: string) => `(Período de prueba — luego ${price}/mes)`,
    perMonth: "/mes",
    paymentMethod: "Método de pago",
    paymentMethodDesc: "Gestionado a través del portal Stripe — haz clic en 'Modificar'.",
    noPaymentMethod: "Ningún método de pago registrado.",
    billingHistory: "Historial de facturación",
    billingHistoryDesc: "Descarga tus facturas desde el portal Stripe.",
    noBillingHistory: "Ninguna factura por el momento.",
    modify: "Modificar",
    view: "Ver",
    features: [
      'Escaneo OCR ilimitado',
      'Seguimiento de TCO completo',
      'Exportación fiscal de costes reales',
      'Carnet certificado PDF',
      'Valor de reventa en tempo real',
      'Análisis de eco-conducción',
    ]
  },
  ar: {
    active: "نشط",
    trialActive: "فترة التجربة البريميوم نشطة",
    premiumActive: "بريميوم نشط",
    familyActive: "عائلي/محترف نشط",
    standard: "عادي",
    trialTitle: "تجربة Velocewealth بريميوم",
    standardTitle: "Velocewealth قياسي",
    renewsAuto: "تجديد تلقائي. تعديل اشتراكك في أي وقت.",
    trialDesc: (days: number) => `استمتع بجميع الميزات البريميوم لمدة ${TRIAL_DAYS} يومًا (لا تتطلب بطاقة ائتمان). المتبقي ${days} يوم.`,
    upgradeDesc: "قم بالترقية إلى بريميوم للحصول على مسح OCR غير محدود، ودفتر معتمد، وتصدير ضريبي.",
    trialPriceNote: (price: string) => `(فترة تجريبية — ثم ${price}/شهر)`,
    perMonth: "/شهر",
    paymentMethod: "طريقة الدفع",
    paymentMethodDesc: "تدار عبر بوابة Stripe — انقر على 'تعديل'.",
    noPaymentMethod: "لم يتم تسجيل أي طريقة دفع.",
    billingHistory: "سجل الفواتير",
    billingHistoryDesc: "قم بتنزيل فواتيرك من بوابة Stripe.",
    noBillingHistory: "لا توجد فواتير حالياً.",
    modify: "تعديل",
    view: "عرض",
    features: [
      'مسح OCR غير محدود',
      'تتبع TCO كامل',
      'تصدير الضرائب للمصروفات الفعلية',
      'دفتر الصيانة المعتمد PDF',
      'قيمة إعادة البيع في الوقت الفعلي',
      'تحليل القيادة البيئية',
    ]
  },
  pt: {
    active: "ativo",
    trialActive: "Teste Premium ativo",
    premiumActive: "Premium ativo",
    familyActive: "Family/Pro ativo",
    standard: "Padrão",
    trialTitle: "Teste Velocewealth Premium",
    standardTitle: "Velocewealth Padrão",
    renewsAuto: "Renovação automática. Altere sua assinatura a qualquer momento.",
    trialDesc: (days: number) => `Aproveite todos os recursos Premium por ${TRIAL_DAYS} dias (sem necessidade de cartão de crédito). Restam-lhe ${days} dia${days > 1 ? 's' : ''}.`,
    upgradeDesc: "Atualize para o Premium para obter OCR ilimitado, caderneta certificada e exportação fiscal.",
    trialPriceNote: (price: string) => `(Período de teste — depois ${price}/mês)`,
    perMonth: "/mês",
    paymentMethod: "Método de pagamento",
    paymentMethodDesc: "Gerenciado via portal Stripe — clique em 'Alterar'.",
    noPaymentMethod: "Nenhum método de pagamento registrado.",
    billingHistory: "Histórico de faturamento",
    billingHistoryDesc: "Baixe suas faturas no portal Stripe.",
    noBillingHistory: "Nenhuma fatura no momento.",
    modify: "Alterar",
    view: "Ver",
    features: [
      'Leitura OCR ilimitada',
      'Acompanhamento completo de TCO',
      'Exportação fiscal de despesas reais',
      'Caderneta certificada PDF',
      'Valor de revenda em tempo real',
      'Análise de eco-condução',
    ]
  }
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function BillingPage({ params }: PageProps) {
  const { locale } = await params;
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const profile = isSupabaseConfigured() ? await getProfile() : null;
  const isPremium = profile?.planTier === 'premium';
  const isFamily = profile?.planTier === 'family';
  const isTrial = profile?.isTrial ?? false;
  const isSubscribed = (isPremium || isFamily) && !isTrial;

  const remainingDays =
    isTrial && profile?.createdAt ? trialDaysRemaining(profile.createdAt) : 0;

  const country = resolveRequestCountry(profile?.country, locale === 'fr' ? 'FR' : 'GB');
  const pricing = resolvePricing(country, profile?.currency);
  const monthlyLabel = formatPrice(pricing.monthly, pricing.currency, locale);

  return (
    <div className="space-y-6">
      <Card variant="premium" className="p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <Badge variant={isFamily ? 'family' : (isPremium || isTrial) ? 'premium' : 'default'}>
              <Sparkles className="h-3 w-3" /> {isSubscribed ? `${isFamily ? t.familyActive : t.premiumActive}` : isTrial ? t.trialActive : t.standard}
            </Badge>
            <div className="font-display text-2xl font-bold mt-3">
              {isSubscribed ? `Velocewealth ${isFamily ? 'Family/Pro' : 'Premium'}` : isTrial ? t.trialTitle : t.standardTitle}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isSubscribed
                ? t.renewsAuto
                : isTrial
                ? t.trialDesc(remainingDays)
                : t.upgradeDesc}
            </p>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="font-mono text-3xl font-bold tabular-nums">
                {isSubscribed ? monthlyLabel : formatPrice(0, pricing.currency, locale)}
              </span>
              <span className="text-muted-foreground">
                {isTrial ? t.trialPriceNote(monthlyLabel) : t.perMonth}
              </span>
            </div>
          </div>
          {isSubscribed && (
            <div className="shrink-0 flex items-center">
              <ManageSubscriptionButton className="w-full sm:w-auto text-center justify-center font-semibold" />
            </div>
          )}
        </div>

        <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
          {t.features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-eco" strokeWidth={2} />
              {f}
            </li>
          ))}
        </ul>
      </Card>

      {/* Renders pricing selector directly inside settings for unsubscribed users */}
      {!isSubscribed && (
        <BillingPricingSelector pricing={pricing} locale={locale} checkoutReady={isStripeConfigured()} />
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold">{t.paymentMethod}</h2>
          {isSubscribed && <ManageSubscriptionButton variant="ghost" size="sm" label={t.modify} />}
        </div>
        {isSubscribed ? (
          <div className="flex items-center gap-3">
            <div className="rounded-btn bg-muted p-3">
              <CreditCard className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-muted-foreground">
              {t.paymentMethodDesc}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t.noPaymentMethod}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold">
            {t.billingHistory}
          </h2>
          {isSubscribed && <ManageSubscriptionButton variant="ghost" size="sm" label={<><Receipt className="h-3.5 w-3.5" /> {t.view}</>} />}
        </div>
        {isSubscribed ? (
          <div className="text-sm text-muted-foreground">
            {t.billingHistoryDesc}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t.noBillingHistory}
          </div>
        )}
      </Card>
    </div>
  );
}
