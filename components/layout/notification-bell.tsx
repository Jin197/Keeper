'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Link, useRouter } from '@/lib/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Wrench,
  Receipt,
  ShieldCheck,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from '@/server/actions/notifications';
import type {
  InAppNotification,
  InAppNotificationKind,
} from '@/lib/types';

interface Props {
  initialNotifications: InAppNotification[];
  initialUnreadCount: number;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: Props) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkOne = (n: InAppNotification) => {
    if (n.readAt) {
      if (n.link) {
        router.push(n.link);
        setOpen(false);
      }
      return;
    }
    startTransition(async () => {
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((i) => (i.id === n.id ? { ...i, readAt: now } : i)),
      );
      setUnread((c) => Math.max(0, c - 1));
      await markNotificationAsReadAction(n.id);
      if (n.link) {
        router.push(n.link);
        setOpen(false);
      }
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((i) => (i.readAt ? i : { ...i, readAt: now })),
      );
      setUnread(0);
      await markAllNotificationsAsReadAction();
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative"
        aria-label={t('title')}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 top-12 z-50 w-[360px] max-w-[92vw] rounded-card border border-border bg-card shadow-elevated overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <div className="text-sm font-semibold">{t('title')}</div>
                <div className="text-[11px] text-muted-foreground">
                  {unread > 0 ? t('unread', { count: unread }) : t('allRead')}
                </div>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={pending}
                  className="text-[11px] text-keeper hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  {t('markAll')}
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('empty')}
                  </p>
                </div>
              ) : (
                items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onClick={() => handleMarkOne(n)}
                    disabled={pending}
                  />
                ))
              )}
            </div>

            <div className="border-t border-border px-4 py-2 bg-muted/20">
              <Link
                href="/maintenance/agenda"
                onClick={() => setOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('viewAgenda')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
  disabled,
}: {
  notification: InAppNotification;
  onClick: () => void;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const Icon = iconFor(notification.kind);
  const accent = accentFor(notification.kind);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30 flex gap-3',
        !notification.readAt && 'bg-keeper/5',
      )}
    >
      <div
        className={cn(
          'rounded-btn p-2 shrink-0 h-fit',
          accent,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">
          {notification.title}
        </div>
        {notification.body && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {notification.body}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">
          {formatRelativeTime(notification.createdAt, locale)}
        </div>
      </div>
      {!notification.readAt && (
        <div className="h-2 w-2 rounded-full bg-keeper mt-2 shrink-0" />
      )}
    </button>
  );
}

function iconFor(kind: InAppNotificationKind) {
  switch (kind) {
    case 'maintenance_reminder':
    case 'maintenance_overdue':
    case 'forecast_due':
      return Wrench;
    case 'inspection_due':
      return ShieldCheck;
    case 'insurance_renewal':
      return CalendarClock;
    case 'welcome':
      return Sparkles;
    case 'fine_majoration_soon':
    case 'fine_added':
      return Receipt;
    case 'mfa_required':
      return AlertTriangle;
    default:
      return Check;
  }
}

function accentFor(kind: InAppNotificationKind): string {
  switch (kind) {
    case 'maintenance_overdue':
    case 'mfa_required':
      return 'bg-destructive/15 text-destructive';
    case 'maintenance_reminder':
    case 'welcome':
      return 'bg-keeper/15 text-keeper';
    case 'forecast_due':
    case 'inspection_due':
    case 'insurance_renewal':
      return 'bg-amber-500/15 text-amber-500';
    case 'fine_majoration_soon':
      return 'bg-amber-500/15 text-amber-500';
    case 'fine_added':
      return 'bg-amber-500/10 text-amber-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
