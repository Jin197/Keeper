'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { Globe, Check } from 'lucide-react';
import { useRouter, usePathname } from '@/lib/i18n/routing';
import { locales, localeLabels, localeFlags, type Locale } from '@/lib/i18n/routing';
import { updateLocaleAction } from '@/server/actions/profile';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'sidebar' | 'inline' | 'compact';
}

export function LocaleSwitcher({ variant = 'compact' }: Props) {
  const current = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const handleChange = (next: Locale) => {
    if (next === current) return;
    startTransition(async () => {
      // 1. Persist the choice: cookie (NEXT_LOCALE) + DB profile if authenticated.
      //    This ensures the language survives page reloads, new sessions, and
      //    other devices for logged-in users.
      await updateLocaleAction(next);
      // 2. Navigate to the same path under the new locale prefix.
      router.replace(pathname, { locale: next });
      // 3. Refresh server components so the new messages render immediately.
      router.refresh();
    });
  };

  if (variant === 'compact') {
    return (
      <div className="relative inline-block">
        <select
          aria-label="Langue"
          value={current}
          onChange={(e) => handleChange(e.target.value as Locale)}
          disabled={pending}
          className={cn(
            'appearance-none rounded-btn border border-border bg-card pl-7 pr-7 py-1.5 text-xs font-medium cursor-pointer',
            'w-auto transition-all duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeFlags[l]} {localeLabels[l]}
            </option>
          ))}
        </select>
        <Globe className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => handleChange(l)}
          disabled={pending}
          className={cn(
            'w-full flex items-center justify-between rounded-btn px-3 py-2 text-sm transition-colors',
            l === current
              ? 'bg-keeper/10 text-keeper font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <span className="flex items-center gap-2">
            <span>{localeFlags[l]}</span>
            {localeLabels[l]}
          </span>
          {l === current && <Check className="h-4 w-4" strokeWidth={2} />}
        </button>
      ))}
    </div>
  );
}
