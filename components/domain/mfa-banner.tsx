'use client';

import { useLocale } from 'next-intl';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

interface Props {
  /** Whole days left in the grace window. 0 when expired. */
  daysRemaining: number;
  /** True once grace expired and MFA must be enabled to keep navigating. */
  mustEnable: boolean;
}

type Locale = 'fr' | 'en' | 'es' | 'ar' | 'pt';

const LABELS: Record<
  Locale,
  {
    encourage: (days: number) => string;
    nudge: string;
    mandatory: string;
    cta: string;
  }
> = {
  fr: {
    encourage: (d) =>
      `Sécurisez votre compte avec la 2FA — ${d} jour${d > 1 ? 's' : ''} restant${d > 1 ? 's' : ''} avant qu'elle ne devienne obligatoire.`,
    nudge: 'Sécurisez votre compte en activant la double authentification.',
    mandatory:
      "L'activation de la 2FA est désormais obligatoire. Configurez-la pour reprendre une utilisation normale.",
    cta: 'Activer maintenant',
  },
  en: {
    encourage: (d) =>
      `Secure your account with 2FA — ${d} day${d > 1 ? 's' : ''} left before it becomes mandatory.`,
    nudge: 'Secure your account by turning on two-factor authentication.',
    mandatory:
      '2FA is now mandatory. Set it up to resume normal usage of your account.',
    cta: 'Enable now',
  },
  es: {
    encourage: (d) =>
      `Protege tu cuenta con 2FA — quedan ${d} día${d > 1 ? 's' : ''} antes de que sea obligatoria.`,
    nudge: 'Protege tu cuenta activando la autenticación de dos factores.',
    mandatory:
      'La 2FA ahora es obligatoria. Configúrala para seguir usando tu cuenta normalmente.',
    cta: 'Activar ahora',
  },
  ar: {
    encourage: (d) =>
      `قم بتأمين حسابك بالمصادقة الثنائية — متبقي ${d} يوم قبل أن تصبح إلزامية.`,
    nudge: 'قم بتأمين حسابك عبر تفعيل المصادقة الثنائية.',
    mandatory:
      'أصبحت المصادقة الثنائية إلزامية الآن. قم بتفعيلها لاستئناف الاستخدام العادي.',
    cta: 'تفعيل الآن',
  },
  pt: {
    encourage: (d) =>
      `Proteja a sua conta com 2FA — restam ${d} dia${d > 1 ? 's' : ''} antes de se tornar obrigatória.`,
    nudge: 'Proteja a sua conta ativando a autenticação de dois fatores.',
    mandatory:
      'A 2FA passou a ser obrigatória. Configure-a para retomar a utilização normal da sua conta.',
    cta: 'Ativar agora',
  },
};

/**
 * Persistent header banner shown on every authenticated page while the
 * user has NOT enabled MFA. Three tones:
 *   - mustEnable=true:              red/destructive, the app will redirect
 *                                   non-settings pages until MFA is on.
 *   - grace still running:          blue/keeper reminder with a countdown.
 *   - no deadline (MFA optional):   blue/keeper nudge, no countdown.
 *
 * That last branch matters while `MFA_MANDATORY` is off in mfa-status.ts:
 * grace still expires, so daysRemaining reaches 0, but nothing becomes
 * mandatory — showing "0 days left before it becomes mandatory" would be
 * both broken copy and an empty threat.
 *
 * The banner itself doesn't gate navigation — the layout's redirect logic
 * does that. This is just the visible nudge + the canonical CTA target.
 */
export function MfaBanner({ daysRemaining, mustEnable }: Props) {
  const rawLocale = useLocale();
  const t = LABELS[rawLocale as Locale] ?? LABELS.en;

  const message = mustEnable
    ? t.mandatory
    : daysRemaining > 0
      ? t.encourage(daysRemaining)
      : t.nudge;

  return (
    <div
      role="alert"
      className={cn(
        'border-b text-sm transition-colors',
        mustEnable
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-keeper/20 bg-keeper/5 text-foreground',
      )}
    >
      <div className="container py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {mustEnable ? (
            <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={2} />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0 text-keeper" strokeWidth={2} />
          )}
          <span className="leading-tight">{message}</span>
        </div>
        <Link
          href="/settings/security"
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full border transition-colors shrink-0',
            mustEnable
              ? 'border-destructive/40 hover:bg-destructive/20 text-destructive bg-destructive/5'
              : 'border-keeper/30 hover:bg-keeper/15 text-keeper',
          )}
        >
          {t.cta}
        </Link>
      </div>
    </div>
  );
}
