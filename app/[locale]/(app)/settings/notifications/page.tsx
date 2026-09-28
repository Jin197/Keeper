'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, CalendarClock, Fuel, Mail, ShieldCheck, Wrench, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUser } from '@/components/user-context';
import { updateNotificationPrefsAction } from '@/server/actions/profile';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/lib/types';

/**
 * Real, persisted notification preferences. Each switch saves immediately —
 * there is no "Save" button to forget. In-app alerts are not a preference:
 * they are how the product tells you what's coming.
 */
export default function NotificationsPage() {
  const t = useTranslations('notificationSettings');
  const user = useUser();
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs ?? {}) });
  const [pending, startTransition] = useTransition();

  const toggle = (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startTransition(async () => {
      const res = await updateNotificationPrefsAction(next);
      if (res.error) {
        setPrefs(prefs);
        toast.error(t('error'));
        return;
      }
      toast.success(t('saved'));
    });
  };

  const topics: { key: keyof NotificationPrefs; icon: typeof Wrench; label: string; hint: string }[] = [
    { key: 'forecast', icon: Wrench, label: t('forecast'), hint: t('forecastHint') },
    { key: 'inspection', icon: CalendarClock, label: t('inspection'), hint: t('inspectionHint') },
    { key: 'insurance', icon: ShieldCheck, label: t('insurance'), hint: t('insuranceHint') },
    { key: 'fuel', icon: Fuel, label: t('fuel'), hint: t('fuelHint') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-keeper" /> {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <Card className="p-5">
        <Row
          icon={Mail}
          label={t('channelTitle')}
          hint={t('channelHint', { email: user.email || '—' })}
          on={prefs.email}
          disabled={pending}
          onToggle={() => toggle('email')}
        />
      </Card>

      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('topicsTitle')}</h2>
        <ul className="divide-y divide-border">
          {topics.map((tp) => (
            <li key={tp.key}>
              <Row icon={tp.icon} label={tp.label} hint={tp.hint} on={prefs[tp.key]} disabled={pending} onToggle={() => toggle(tp.key)} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 flex items-start gap-3 bg-muted/30">
        <Info className="h-4 w-4 text-keeper mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-medium">{t('howTitle')}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('howBody')}</p>
        </div>
      </Card>
    </div>
  );
}

function Row({ icon: Icon, label, hint, on, disabled, onToggle }: { icon: typeof Wrench; label: string; hint: string; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className={`rounded-btn p-2 shrink-0 ${on ? 'bg-keeper/10 text-keeper' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors disabled:opacity-60 ${on ? 'bg-keeper' : 'bg-muted'}`}
      >
        <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
