'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/routing';
import { locales, localeLabels, localeFlags, type Locale } from '@/lib/i18n/routing';
import { useTransition } from 'react';
import { updateLocaleAction } from '@/server/actions/profile';

export default function PreferencesPage() {
  const t = useTranslations('preferences');
  const { theme, setTheme } = useTheme();
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (nextLocale: Locale) => {
    if (nextLocale === currentLocale) return;
    startTransition(async () => {
      await updateLocaleAction(nextLocale);
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold">{t('appearance')}</h2>
          <p className="text-xs text-muted-foreground">{t('appearanceHint')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { value: 'light', label: t('light'), icon: Sun },
            { value: 'dark', label: t('dark'), icon: Moon },
            { value: 'system', label: t('system'), icon: Monitor },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'rounded-card border p-4 flex flex-col items-center gap-2 transition-colors',
                  active
                    ? 'border-veloce bg-veloce/10 text-veloce'
                    : 'border-border hover:bg-muted',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold">{t('language')}</h2>
          <p className="text-xs text-muted-foreground">{t('languageHint')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {locales.map((l) => {
            const active = currentLocale === l;
            return (
              <button
                key={l}
                type="button"
                disabled={isPending}
                onClick={() => handleLanguageChange(l)}
                className={cn(
                  'rounded-card border p-4 flex flex-col items-center justify-center gap-2 transition-colors relative',
                  active
                    ? 'border-veloce bg-veloce/10 text-veloce font-semibold'
                    : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground',
                  isPending && 'opacity-60 cursor-not-allowed'
                )}
              >
                <span className="text-2xl" role="img" aria-label={localeLabels[l]}>
                  {localeFlags[l]}
                </span>
                <span className="text-xs font-medium text-center">{localeLabels[l]}</span>
                {active && (
                  <span className="absolute top-2 right-2 rounded-full bg-veloce text-white p-0.5 shadow-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
