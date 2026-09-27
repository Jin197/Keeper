'use client';

import { Link } from '@/lib/i18n/routing';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Mail,
  Lock,
  Apple,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { FormError } from '@/components/ui/form-error';
import {
  loginAction,
  signInWithProvider,
  mfaLoginChallengeAction,
} from '@/server/actions/auth';
import { captchaStatusAction } from '@/server/actions/captcha';

const MFA_LOGIN_LABELS = {
  fr: {
    title: 'Code de vérification',
    subtitle: 'Saisissez le code à 6 chiffres affiché par votre app authenticator.',
    placeholder: 'Code à 6 chiffres',
    submit: 'Vérifier',
    back: 'Retour',
  },
  en: {
    title: 'Verification code',
    subtitle: 'Enter the 6-digit code shown by your authenticator app.',
    placeholder: '6-digit code',
    submit: 'Verify',
    back: 'Back',
  },
  es: {
    title: 'Código de verificación',
    subtitle: 'Introduce el código de 6 dígitos que muestra tu app autenticadora.',
    placeholder: 'Código de 6 dígitos',
    submit: 'Verificar',
    back: 'Volver',
  },
  ar: {
    title: 'رمز التحقق',
    subtitle: 'أدخل الرمز المكوّن من 6 أرقام المعروض في تطبيق المصادقة.',
    placeholder: 'الرمز المكوّن من 6 أرقام',
    submit: 'تحقق',
    back: 'رجوع',
  },
  pt: {
    title: 'Código de verificação',
    subtitle: 'Introduza o código de 6 dígitos apresentado pela sua app autenticadora.',
    placeholder: 'Código de 6 dígitos',
    submit: 'Verificar',
    back: 'Voltar',
  },
} as const;

// User-facing messages for the `?error=...` query param coming from
// /auth/callback (OAuth flow failures, code replay, expired state…).
const OAUTH_ERROR_LABELS: Record<
  string,
  Partial<Record<keyof typeof MFA_LOGIN_LABELS, string>>
> = {
  oauth_replay: {
    fr: 'Lien de connexion déjà utilisé. Réessaie en cliquant à nouveau sur le bouton Google ou Apple.',
    en: 'Login link already used. Click Google or Apple again to retry.',
    es: 'Enlace de inicio de sesión ya utilizado. Vuelve a hacer clic en Google o Apple.',
    ar: 'تم استخدام رابط تسجيل الدخول بالفعل. انقر مرة أخرى على زر Google أو Apple.',
    pt: 'Link de início de sessão já utilizado. Clica em Google ou Apple novamente.',
  },
  oauth_expired: {
    fr: 'La connexion a expiré. Réessaie.',
    en: 'Login session expired. Please retry.',
    es: 'La sesión de inicio expiró. Inténtalo de nuevo.',
    ar: 'انتهت صلاحية الجلسة. حاول مرة أخرى.',
    pt: 'A sessão de início expirou. Tenta novamente.',
  },
  oauth_failed: {
    fr: 'Connexion via fournisseur impossible. Réessaie.',
    en: 'Provider sign-in failed. Please retry.',
    es: 'Inicio de sesión con proveedor fallido. Inténtalo de nuevo.',
    ar: 'فشل تسجيل الدخول. حاول مرة أخرى.',
    pt: 'Falha no início de sessão. Tenta novamente.',
  },
  link_expired: {
    fr: "Ce lien a expiré. Demande un nouveau lien pour réinitialiser ton mot de passe.",
    en: 'This link has expired. Request a new password-reset link.',
    es: 'Este enlace ha expirado. Solicita uno nuevo para restablecer la contraseña.',
    ar: 'انتهت صلاحية هذا الرابط. اطلب رابطاً جديداً لإعادة تعيين كلمة المرور.',
    pt: 'Este link expirou. Solicita um novo link para repor a palavra-passe.',
  },
  oauth_exchange: {
    fr: 'Échec de l\'échange de code. Reconnecte-toi.',
    en: 'Code exchange failed. Please sign in again.',
    es: 'Error de intercambio de código. Vuelve a iniciar sesión.',
    ar: 'فشل تبادل الرمز. سجّل الدخول مرة أخرى.',
    pt: 'Falha na troca de código. Inicia sessão novamente.',
  },
  auth: {
    fr: 'Authentification impossible.',
    en: 'Authentication failed.',
    es: 'Autenticación fallida.',
    ar: 'فشل المصادقة.',
    pt: 'Falha de autenticação.',
  },
};

export default function LoginPage() {
  const t = useTranslations('auth');
  const rawLocale = useLocale();
  const mfaLabels =
    MFA_LOGIN_LABELS[rawLocale as keyof typeof MFA_LOGIN_LABELS] ?? MFA_LOGIN_LABELS.en;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);

  // Surface OAuth-callback errors (?error=oauth_replay etc.) as a toast,
  // then strip the query string so a hard refresh doesn't re-trigger it.
  // We read window.location directly (not useSearchParams) to avoid forcing
  // the whole page into dynamic rendering — that was crashing in production
  // with "Application error: a client-side exception has occurred".
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (!oauthError) return;
    try {
      const localeKey = rawLocale as keyof typeof MFA_LOGIN_LABELS;
      const msg =
        OAUTH_ERROR_LABELS[oauthError]?.[localeKey] ??
        OAUTH_ERROR_LABELS[oauthError]?.fr ??
        OAUTH_ERROR_LABELS.auth?.fr ??
        'Erreur de connexion';
      toast.error(msg);
    } catch {
      toast.error('Erreur de connexion');
    }
    // Clean URL without re-rendering the route stack.
    window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [email, setEmail] = useState('');
  // hCaptcha state — siteKey is provided by the server only after enough
  // failures accumulate. Until then the widget is not rendered at all.
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Poll the server on every email change (debounced) to detect when the
  // captcha threshold is crossed. Cheap call (Redis GET, no DB).
  useEffect(() => {
    if (!email) {
      setCaptchaSiteKey(null);
      return;
    }
    const handle = setTimeout(async () => {
      const status = await captchaStatusAction(email);
      setCaptchaSiteKey(status.required ? status.siteKey ?? null : null);
    }, 400);
    return () => clearTimeout(handle);
  }, [email]);

  const handleLogin = (formData: FormData) => {
    startTransition(async () => {
      setError(undefined);

      // If captcha is required, execute the invisible widget first to get a
      // fresh token, then inject it into the form payload.
      if (captchaSiteKey && captchaRef.current) {
        try {
          const result = await captchaRef.current.execute({ async: true });
          if (result?.response) {
            formData.set('hcaptcha_token', result.response);
          }
        } catch {
          setError('Vérification de sécurité requise');
          return;
        }
      }

      const res = await loginAction(formData);
      if (res?.mfaRequired) {
        setMfaFactorId(res.mfaRequired.factorId);
        return;
      }
      if (res?.error) {
        setError(res.error);
        // After a failure, re-check captcha state — the threshold may have
        // just been crossed by this very attempt.
        if (email) {
          const status = await captchaStatusAction(email);
          setCaptchaSiteKey(status.required ? status.siteKey ?? null : null);
        }
        // Reset captcha so the next attempt gets a fresh token.
        captchaRef.current?.resetCaptcha();
      }
    });
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    startTransition(async () => {
      setError(undefined);
      const res = await mfaLoginChallengeAction(mfaFactorId, mfaCode);
      if (res?.error) setError(res.error);
    });
  };

  const cancelMfa = () => {
    setMfaFactorId(null);
    setMfaCode('');
    setError(undefined);
  };

  const handleOAuth = (provider: 'google' | 'apple') => {
    startTransition(async () => {
      const res = await signInWithProvider(provider);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.url) window.location.href = res.url;
    });
  };

  // ── MFA challenge view: shown right after a successful password step
  // when the account has TOTP enabled. Replaces the password form until
  // the code is verified (server completes the redirect).
  if (mfaFactorId) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-btn bg-veloce/10 text-veloce p-2.5 shrink-0">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight">
              {mfaLabels.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mfaLabels.subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleMfaSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mfa-code">{mfaLabels.placeholder}</Label>
            <Input
              id="mfa-code"
              value={mfaCode}
              onChange={(e) =>
                setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="font-mono text-base tracking-widest text-center"
              required
              autoFocus
              disabled={pending}
            />
          </div>
          <FormError message={error} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={cancelMfa}
              disabled={pending}
            >
              {mfaLabels.back}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              disabled={pending || mfaCode.length !== 6}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mfaLabels.submit}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t('loginTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('loginSubtitle')}
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => handleOAuth('google')}
          disabled={pending}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
            <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          {t('loginCta')} Google
        </Button>
        {/* Apple Sign In: requires an Apple Developer account (99 $/y) and a
            configured Services ID + p8 key in Supabase. Hidden until then via
            NEXT_PUBLIC_APPLE_ENABLED. To re-enable: set the env var to 'true'
            in Vercel and configure the provider in Supabase Auth → Providers. */}
        {process.env.NEXT_PUBLIC_APPLE_ENABLED === 'true' && (
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => handleOAuth('apple')}
            disabled={pending}
          >
            <Apple className="h-4 w-4" />
            {t('loginCta')} Apple
          </Button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground uppercase tracking-wider">
            {t('or')}
          </span>
        </div>
      </div>

      <form action={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="ps-9"
              required
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <Link href="/forgot-password" className="text-xs text-veloce hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              className="ps-9 pe-10"
              required
              disabled={pending}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={
                showPassword
                  ? 'Masquer le mot de passe'
                  : 'Afficher le mot de passe'
              }
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
        <FormError message={error} />

        {/* Invisible hCaptcha widget — only mounted after the server signals
            that the failure threshold has been crossed for this email/IP. */}
        {captchaSiteKey && (
          <HCaptcha
            ref={captchaRef}
            sitekey={captchaSiteKey}
            size="invisible"
          />
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('loginButton')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/signup" className="text-veloce hover:underline font-medium">
          {t('createAccount')}
        </Link>
      </p>
    </div>
  );
}
