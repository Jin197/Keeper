'use client';

import { useRef, useState, useTransition } from 'react';
import { Link, usePathname } from '@/lib/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home,
  Car,
  CalendarClock,
  BarChart3,
  User,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Logo } from './logo';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Confirm } from '@/components/ui/confirm';
import { cn } from '@/lib/utils';
import { trialDaysRemaining } from '@/lib/trial';
import { useUser } from '@/components/user-context';

const SIDEBAR_TRANSLATIONS = {
  fr: {
    trialPremium: "Essai Premium",
    daysRemaining: (days: number) => `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`,
    trialBadge: "Essai",
  },
  en: {
    trialPremium: "Premium Trial",
    daysRemaining: (days: number) => `${days} day${days > 1 ? 's' : ''} remaining`,
    trialBadge: "Trial",
  },
  es: {
    trialPremium: "Prueba Premium",
    daysRemaining: (days: number) => `${days} día${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`,
    trialBadge: "Prueba",
  },
  ar: {
    trialPremium: "تجربة بريميوم",
    daysRemaining: (days: number) => `متبقي ${days} يوم`,
    trialBadge: "تجربة",
  },
  pt: {
    trialPremium: "Teste Premium",
    daysRemaining: (days: number) => `${days} dia${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`,
    trialBadge: "Teste",
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const currentUser = useUser();
  const t = useTranslations('nav');
  const locale = useLocale();
  const tSidebar = SIDEBAR_TRANSLATIONS[locale as keyof typeof SIDEBAR_TRANSLATIONS] || SIDEBAR_TRANSLATIONS.en;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, startLogout] = useTransition();
  // Hidden form whose POST submit lets the browser follow the 303 redirect
  // emitted by /api/auth/logout. This is what makes the response's
  // `Clear-Site-Data` header actually take effect (it requires a navigation,
  // not just a fetch result).
  const logoutFormRef = useRef<HTMLFormElement>(null);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    startLogout(() => {
      logoutFormRef.current?.submit();
    });
  };

  // Five fixed sections, à la Tesla / Revolut.
  // The labels lean on the existing i18n catalogue when possible and add
  // four new keys (`home`, `fleet`, `agenda`, `insights`, `me`) that we
  // backfill in messages/*.json. We keep the legacy `dashboard` translation
  // alive so other call sites don't crash.
  const nav = [
    { href: '/dashboard', label: t('home'), icon: Home },
    { href: '/vehicles', label: t('fleet'), icon: Car },
    { href: '/agenda', label: t('agenda'), icon: CalendarClock },
    { href: '/insights', label: t('insights'), icon: BarChart3 },
    { href: '/settings', label: t('me'), icon: User },
  ] as const;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-sm">
      <div className="p-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-keeper/10 text-keeper font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.5} size={18} />
              {item.label}
              {active && (
                <span className="ms-auto h-1.5 w-1.5 rounded-full bg-keeper" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2">
        {currentUser.planTier === 'free' && !currentUser.isTrial && (
          <Link
            href="/settings/billing"
            className="block glass-premium rounded-card p-4 text-sm hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-2 font-medium mb-1">
              <Sparkles className="h-4 w-4 text-keeper" strokeWidth={1.5} />
              Premium
            </div>
          </Link>
        )}

        {currentUser.isTrial && (
          <Link
            href="/settings/billing"
            className="block glass-premium rounded-card p-4 text-sm hover:scale-[1.02] transition-transform border border-amber-500/20 bg-amber-500/5"
          >
            <div className="flex items-center gap-2 font-medium mb-1 text-amber-400">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              {tSidebar.trialPremium}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {tSidebar.daysRemaining(trialDaysRemaining(currentUser.createdAt))}
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4.5 w-4.5" strokeWidth={1.5} size={18} />
          {t('logout')}
        </button>

        <Link
          href="/settings/profile"
          className="flex items-center gap-3 rounded-btn p-2 hover:bg-muted transition-colors"
        >
          <Avatar
            name={currentUser.fullName}
            src={currentUser.avatarUrl ?? null}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              {currentUser.fullName}
            </div>
            <div className="flex items-center gap-1.5">
              {(currentUser.planTier === 'premium' || currentUser.isTrial) && (
                <Badge variant="premium" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500 to-amber-600 border-none text-white">
                  {currentUser.isTrial ? tSidebar.trialBadge : 'Premium'}
                </Badge>
              )}
              {currentUser.planTier === 'family' && (
                <Badge variant="family" className="text-[10px] px-1.5 py-0">
                  Family/Pro
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {currentUser.email}
              </span>
            </div>
          </div>
        </Link>
      </div>

      <Confirm
        open={showLogoutConfirm}
        title={t('logoutConfirmTitle')}
        description={t('logoutConfirmDesc')}
        confirmLabel={t('logout')}
        cancelLabel={t('logoutCancel')}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <form
        ref={logoutFormRef}
        action="/api/auth/logout"
        method="POST"
        className="hidden"
        aria-hidden="true"
      />
    </aside>
  );
}
