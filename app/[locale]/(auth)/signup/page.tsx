'use client';

import { signupCountryOptions } from '@/lib/countries';
import { currencyForCountry } from '@/lib/pricing';
import { currencies } from '@/lib/currencies';

import { Link } from '@/lib/i18n/routing';
import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Mail, Lock, User, Globe, Loader2, Apple, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormError } from '@/components/ui/form-error';
import { signupAction, signInWithProvider } from '@/server/actions/auth';

export default function SignupPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  // Country drives the price band and the default currency; the browser's
  // region is the best first guess for an anonymous visitor.
  const guessCountry = () => {
    if (typeof navigator === 'undefined') return locale === 'fr' ? 'FR' : 'GB';
    const region = navigator.language?.split('-')[1]?.toUpperCase();
    return region && /^[A-Z]{2}$/.test(region) ? region : locale === 'fr' ? 'FR' : 'GB';
  };
  const [country, setCountry] = useState<string>(guessCountry);
  const [currency, setCurrency] = useState<string>(() => currencyForCountry(guessCountry()));
  const countryOptions = signupCountryOptions(locale);

  // Live rule evaluation — matches lib/validators/password.ts exactly.
  // We display each rule below the input and color the satisfied ones green
  // so the user gets immediate, granular feedback as they type.
  const rules = [
    { id: 'length', ok: password.length >= 10, label: t('passwordRuleLength') },
    { id: 'upper', ok: /[A-Z]/.test(password), label: t('passwordRuleUpper') },
    { id: 'lower', ok: /[a-z]/.test(password), label: t('passwordRuleLower') },
    { id: 'digit', ok: /[0-9]/.test(password), label: t('passwordRuleDigit') },
  ] as const;

  const handleSubmit = (formData: FormData) => {
    formData.set('locale', locale);
    startTransition(async () => {
      setError(undefined);
      const res = await signupAction(formData);
      if (res?.error) setError(res.error);
    });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t('signupTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('signupSubtitle')}</p>
      </div>

      {/* Social Registration */}
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
        {/* Apple Sign In: gated behind NEXT_PUBLIC_APPLE_ENABLED until the
            Apple Developer account + Services ID + p8 key are wired up in
            Supabase Auth. Re-enable by setting the env var to 'true'. */}
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

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">{t('fullNameLabel')}</Label>
          <div className="relative">
            <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              id="fullName"
              name="fullName"
              placeholder={t('fullNamePlaceholder')}
              className="ps-9"
              required
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              className="ps-9"
              required
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('passwordLabel')}</Label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ps-9 pe-10"
              required
              minLength={10}
              disabled={pending}
              autoComplete="new-password"
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
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {rules.map((r) => (
              <li
                key={r.id}
                className={
                  r.ok
                    ? 'flex items-center gap-1.5 text-eco transition-colors'
                    : 'flex items-center gap-1.5 text-muted-foreground transition-colors'
                }
              >
                <Check
                  className={
                    r.ok
                      ? 'h-3 w-3 shrink-0'
                      : 'h-3 w-3 shrink-0 opacity-40'
                  }
                  strokeWidth={r.ok ? 3 : 2}
                />
                {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="country">{t('countryLabel')}</Label>
            <div className="relative">
              <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" strokeWidth={1.5} />
              <Select
                id="country"
                name="country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCurrency(currencyForCountry(e.target.value));
                }}
                className="ps-9"
                disabled={pending}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">{t('currencyLabel')}</Label>
            <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={pending}>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <FormError message={error} />

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('signupButton')}
        </Button>

        <p className="text-xs text-muted-foreground">
          {t('termsAcceptance')}{' '}
          <Link href="/legal/terms" className="text-veloce hover:underline">
            {t('termsLink')}
          </Link>{' '}
          {t('and')}{' '}
          <Link href="/legal/privacy" className="text-veloce hover:underline">
            {t('privacyLink')}
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="text-veloce hover:underline font-medium">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
