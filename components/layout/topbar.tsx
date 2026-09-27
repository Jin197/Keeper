'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Link } from '@/lib/i18n/routing';
import { Logo } from './logo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/user-context';
import { NotificationBell } from './notification-bell';
import type { InAppNotification } from '@/lib/types';

interface TopbarProps {
  title?: string;
  notifications?: InAppNotification[];
  unreadCount?: number;
}

export function Topbar({
  title,
  notifications = [],
  unreadCount = 0,
}: TopbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentUser = useUser();
  const t = useTranslations('components');
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-8">
      <div className="lg:hidden shrink-0">
        <Logo showWordmark={false} />
      </div>
      {title && (
        <h1 className="hidden lg:block font-display text-xl font-semibold tracking-tight">
          {title}
        </h1>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={t('toggleTheme')}
          onClick={() =>
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          }
          suppressHydrationWarning
        >
          {mounted ? (
            resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )
          ) : (
            <span className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Centre d'aide" asChild>
          <Link href="/help-center">
            <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Button>
        <Link href="/settings/profile" className="lg:hidden ml-1 hover:scale-105 transition-transform shrink-0">
          <Avatar
            name={currentUser.fullName}
            src={currentUser.avatarUrl ?? null}
            size="sm"
          />
        </Link>
      </div>
    </header>
  );
}
