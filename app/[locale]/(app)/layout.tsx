import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Topbar } from '@/components/layout/topbar';
import { UserProvider } from '@/components/user-context';
import { MfaBanner } from '@/components/domain/mfa-banner';
import { getProfile } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';
import { getMfaStatus, type MfaStatus } from '@/lib/security/mfa-status';
import { trialDaysRemaining } from '@/lib/trial';
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from '@/server/actions/notifications';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/i18n/routing';
import { getLocale, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const TRANSLATIONS = {
  fr: {
    attention: "Attention",
    daysRemainingUrgent: (days: number) => `Plus que ${days} jour${days > 1 ? 's' : ''} d'essai Premium gratuit. Activez votre plan pour conserver vos accès illimités.`,
    trialOfferText: (days: number) => `Vous profitez d'un essai Premium gratuit (${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}).`,
    viewOffers: "Découvrir les offres",
    preProd: "Mode pré-prod",
    envMissing: "Variables d'environnement Supabase manquantes — voir ONBOARDING.md pour brancher le backend."
  },
  en: {
    attention: "Attention",
    daysRemainingUrgent: (days: number) => `Only ${days} day${days > 1 ? 's' : ''} left of free Premium trial. Activate your plan to retain unlimited access.`,
    trialOfferText: (days: number) => `You are enjoying a free Premium trial (${days} day${days > 1 ? 's' : ''} remaining).`,
    viewOffers: "View offers",
    preProd: "Pre-prod mode",
    envMissing: "Supabase environment variables missing — see ONBOARDING.md to connect the backend."
  },
  es: {
    attention: "Atención",
    daysRemainingUrgent: (days: number) => `Solo quedan ${days} día${days > 1 ? 's' : ''} de prueba Premium gratuita. Activa tu plan para conservar tu acceso ilimitado.`,
    trialOfferText: (days: number) => `Estás disfrutando de una prueba Premium gratuita (quedan ${days} día${days > 1 ? 's' : ''}).`,
    viewOffers: "Ver ofertas",
    preProd: "Modo pre-prod",
    envMissing: "Faltan las variables de entorno de Supabase — ver ONBOARDING.md para conectar el backend."
  },
  ar: {
    attention: "تنبيه",
    daysRemainingUrgent: (days: number) => `متبقي ${days} يوم فقط من التجربة البريميوم المجانية. نشط خطتك للاحتفاظ بالوصول الكامل.`,
    trialOfferText: (days: number) => `أنت تستمتع بفترة تجربة بريميوم مجانية (متبقي ${days} يوم).`,
    viewOffers: "عرض العروض",
    preProd: "وضع التطوير",
    envMissing: "متغيرات بيئة Supabase مفقودة — راجع ONBOARDING.md لتوصيل قاعدة البيانات."
  },
  pt: {
    attention: "Atenção",
    daysRemainingUrgent: (days: number) => `Resta apenas ${days} dia${days > 1 ? 's' : ''} de teste Premium gratuito. Ative seu plano para manter o acesso ilimitado.`,
    trialOfferText: (days: number) => `Você está desfrutando de um teste Premium gratuito (restam ${days} dia${days > 1 ? 's' : ''}).`,
    viewOffers: "Ver ofertas",
    preProd: "Modo pré-prod",
    envMissing: "Variáveis de ambiente do Supabase ausentes — consulte ONBOARDING.md para conectar o backend."
  }
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = isSupabaseConfigured() ? await getProfile() : null;
  
  if (profile && !profile.hasCompletedOnboarding) {
    redirect('/onboarding');
  }

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  // ── MFA mandatory enforcement (post-grace-period) ─────────────────────
  // The user has 14 days from signup to enable TOTP. Past that, any visit
  // to an authenticated page bounces them to /settings/security with a
  // ?mfa-required=1 flag so the UI can show the right "you must enable"
  // banner. We allow /settings/security itself (else infinite loop), the
  // logout endpoint, and the deletion modal that lives on /settings/profile
  // — Settings as a section stays free so the user can keep navigating.
  let mfaStatus: MfaStatus | null = null;
  if (isSupabaseConfigured() && profile) {
    mfaStatus = await getMfaStatus();
    // We must NOT redirect to /settings/security if we're already there,
    // otherwise we create an infinite loop. The pathname is exposed by the
    // root middleware via x-pathname-stripped, but that header is not
    // always propagated through Vercel's edge cache, so we fall back to:
    //   1. x-pathname-stripped (preferred — clean path without /<locale>/)
    //   2. x-pathname (raw path)
    //   3. next-url (Next.js internal header, set automatically)
    // If none yield a path we play it safe and SKIP the redirect — better
    // a transient missed enforcement than a redirect loop the user can't
    // escape (they'll get re-redirected on their next nav anyway).
    const h = headers();
    const stripped = h.get('x-pathname-stripped') ?? '';
    const raw = h.get('x-pathname') ?? '';
    const nextUrl = h.get('next-url') ?? '';
    const candidate = stripped || raw || nextUrl;
    const onSettings =
      candidate === '' ||
      candidate.includes('/settings') ||
      candidate.startsWith('settings');
    if (mfaStatus.mustEnable && !onSettings) {
      redirect('/settings/security?mfa-required=1');
    }
  }

  const [notifications, unreadCount] = profile
    ? await Promise.all([getRecentNotifications(), getUnreadNotificationCount()])
    : [[], 0];

  return (
    <UserProvider user={profile}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar notifications={notifications} unreadCount={unreadCount} />
          {mfaStatus && !mfaStatus.enabled && (
            <MfaBanner
              daysRemaining={mfaStatus.daysRemaining}
              mustEnable={mfaStatus.mustEnable}
            />
          )}
          <TrialWarningBanner profile={profile} t={t} />
          {!isSupabaseConfigured() && <BackendNotConfiguredBanner t={t} />}
          <main className="flex-1 pb-24 lg:pb-8 overflow-x-hidden">{children}</main>
        </div>
        <MobileNav />
      </div>
    </UserProvider>
  );
}

function TrialWarningBanner({ profile, t }: { profile: any; t: any }) {
  if (!profile?.isTrial || !profile?.createdAt) return null;
  const trialDaysLeft = trialDaysRemaining(profile.createdAt);
  const isUrgent = trialDaysLeft <= 2;
  
  return (
    <div className={cn(
      "border-b text-sm transition-all duration-300",
      isUrgent 
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200" 
        : "border-border bg-card/60 text-muted-foreground"
    )}>
      <div className="container py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full",
            isUrgent ? "bg-amber-400 animate-pulse" : "bg-veloce animate-pulse"
          )} />
          <span>
            {isUrgent ? (
              <>
                <strong>{t.attention} :</strong> {t.daysRemainingUrgent(trialDaysLeft)}
              </>
            ) : (
              <>
                {t.trialOfferText(trialDaysLeft)}
              </>
            )}
          </span>
        </div>
        <Link 
          href="/settings/billing" 
          className={cn(
            "text-xs font-semibold px-3 py-1 rounded-full border transition-all",
            isUrgent 
              ? "border-amber-500/30 hover:bg-amber-500/20 text-amber-200 bg-amber-500/5" 
              : "border-border hover:bg-muted text-foreground"
          )}
        >
          {t.viewOffers}
        </Link>
      </div>
    </div>
  );
}

function BackendNotConfiguredBanner({ t }: { t: any }) {
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10">
      <div className="container py-3 text-sm text-amber-200">
        <strong className="font-medium">{t.preProd}</strong>
        <span className="ml-2 text-muted-foreground">
          {t.envMissing}
        </span>
      </div>
    </div>
  );
}
