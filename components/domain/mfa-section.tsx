'use client';

import { useEffect, useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { Smartphone, ShieldCheck, ShieldOff, Copy, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/input';
import { Confirm } from '@/components/ui/confirm';
import {
  enrollMfaAction,
  verifyMfaEnrollmentAction,
  disableMfaAction,
  getVerifiedTotpFactor,
} from '@/server/actions/mfa';

const MFA_LABELS = {
  fr: {
    title: 'Authentification à deux facteurs',
    subtitle: 'Protégez votre compte avec un code à 6 chiffres généré par une app comme Google Authenticator.',
    activate: 'Activer',
    activeBadge: 'Activé',
    scanInstructions: 'Scannez ce QR code avec votre app authenticator, puis saisissez le code à 6 chiffres affiché.',
    manualSecret: 'Ou saisissez ce code manuellement',
    copy: 'Copier',
    codePlaceholder: 'Code à 6 chiffres',
    verify: 'Vérifier et activer',
    cancel: 'Annuler',
    disable: 'Désactiver',
    disableConfirmTitle: 'Désactiver la double authentification ?',
    disableConfirmDesc: 'Votre compte sera moins protégé contre les vols de mot de passe. Vous pourrez la réactiver à tout moment.',
    activatedToast: 'Double authentification activée',
    disabledToast: 'Double authentification désactivée',
    copiedToast: 'Code copié',
  },
  en: {
    title: 'Two-factor authentication',
    subtitle: 'Protect your account with a 6-digit code from an authenticator app like Google Authenticator.',
    activate: 'Enable',
    activeBadge: 'Enabled',
    scanInstructions: 'Scan this QR code with your authenticator app, then enter the 6-digit code displayed.',
    manualSecret: 'Or enter this code manually',
    copy: 'Copy',
    codePlaceholder: '6-digit code',
    verify: 'Verify and enable',
    cancel: 'Cancel',
    disable: 'Disable',
    disableConfirmTitle: 'Disable two-factor authentication?',
    disableConfirmDesc: 'Your account will be less protected against password theft. You can re-enable it any time.',
    activatedToast: 'Two-factor authentication enabled',
    disabledToast: 'Two-factor authentication disabled',
    copiedToast: 'Code copied',
  },
  es: {
    title: 'Autenticación de dos factores',
    subtitle: 'Protege tu cuenta con un código de 6 dígitos de una app como Google Authenticator.',
    activate: 'Activar',
    activeBadge: 'Activado',
    scanInstructions: 'Escanea este código QR con tu app autenticadora y, a continuación, introduce el código de 6 dígitos mostrado.',
    manualSecret: 'O introduce este código manualmente',
    copy: 'Copiar',
    codePlaceholder: 'Código de 6 dígitos',
    verify: 'Verificar y activar',
    cancel: 'Cancelar',
    disable: 'Desactivar',
    disableConfirmTitle: '¿Desactivar la autenticación de dos factores?',
    disableConfirmDesc: 'Tu cuenta estará menos protegida frente al robo de contraseñas. Puedes reactivarla en cualquier momento.',
    activatedToast: 'Autenticación de dos factores activada',
    disabledToast: 'Autenticación de dos factores desactivada',
    copiedToast: 'Código copiado',
  },
  ar: {
    title: 'المصادقة الثنائية',
    subtitle: 'احمِ حسابك برمز مكوّن من 6 أرقام يتم إنشاؤه بواسطة تطبيق مثل Google Authenticator.',
    activate: 'تفعيل',
    activeBadge: 'مفعّل',
    scanInstructions: 'امسح رمز QR هذا باستخدام تطبيق المصادقة، ثم أدخل الرمز المكوّن من 6 أرقام الظاهر فيه.',
    manualSecret: 'أو أدخل هذا الرمز يدوياً',
    copy: 'نسخ',
    codePlaceholder: 'الرمز المكوّن من 6 أرقام',
    verify: 'التحقق والتفعيل',
    cancel: 'إلغاء',
    disable: 'تعطيل',
    disableConfirmTitle: 'تعطيل المصادقة الثنائية؟',
    disableConfirmDesc: 'سيكون حسابك أقل حماية من سرقة كلمات المرور. يمكنك إعادة تفعيلها في أي وقت.',
    activatedToast: 'تم تفعيل المصادقة الثنائية',
    disabledToast: 'تم تعطيل المصادقة الثنائية',
    copiedToast: 'تم نسخ الرمز',
  },
  pt: {
    title: 'Autenticação de dois fatores',
    subtitle: 'Proteja a sua conta com um código de 6 dígitos gerado por uma app como Google Authenticator.',
    activate: 'Ativar',
    activeBadge: 'Ativado',
    scanInstructions: 'Digitalize este código QR com a sua app autenticadora e, em seguida, introduza o código de 6 dígitos apresentado.',
    manualSecret: 'Ou introduza este código manualmente',
    copy: 'Copiar',
    codePlaceholder: 'Código de 6 dígitos',
    verify: 'Verificar e ativar',
    cancel: 'Cancelar',
    disable: 'Desativar',
    disableConfirmTitle: 'Desativar a autenticação de dois fatores?',
    disableConfirmDesc: 'A sua conta ficará menos protegida contra o roubo de palavras-passe. Pode reativá-la a qualquer momento.',
    activatedToast: 'Autenticação de dois fatores ativada',
    disabledToast: 'Autenticação de dois fatores desativada',
    copiedToast: 'Código copiado',
  },
} as const;

type Stage = 'idle' | 'qr' | 'verifying';

export function MfaSection() {
  const rawLocale = useLocale();
  const labels =
    MFA_LABELS[rawLocale as keyof typeof MFA_LABELS] ?? MFA_LABELS.en;
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [stage, setStage] = useState<Stage>('idle');
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const isEnrolled = factorId !== null;

  const handleStartEnroll = () => {
    startTransition(async () => {
      setError(null);
      const res = await enrollMfaAction();
      if ('error' in res) {
        setError(res.error);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(res.uri, {
          margin: 1,
          color: { dark: '#FFFFFF', light: '#00000000' },
          width: 220,
        });
        setQrDataUrl(dataUrl);
      } catch {
        setQrDataUrl(null);
      }
      setSecret(res.secret);
      setPendingFactorId(res.factorId);
      setStage('qr');
    });
  };

  const handleVerify = () => {
    if (!pendingFactorId) return;
    startTransition(async () => {
      setError(null);
      setStage('verifying');
      const res = await verifyMfaEnrollmentAction(pendingFactorId, code);
      if ('error' in res) {
        setError(res.error);
        setStage('qr');
        return;
      }
      setFactorId(pendingFactorId);
      setPendingFactorId(null);
      setQrDataUrl(null);
      setSecret(null);
      setCode('');
      setStage('idle');
      toast.success(labels.activatedToast);
    });
  };

  const handleDisable = () => {
    if (!factorId) return;
    setShowDisableConfirm(false);
    startTransition(async () => {
      const res = await disableMfaAction(factorId);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      setFactorId(null);
      toast.success(labels.disabledToast);
    });
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(labels.copiedToast);
    } catch {
      // clipboard API blocked — no-op
    }
  };

  // Reset code input when stage changes
  useEffect(() => {
    if (stage === 'idle') setCode('');
  }, [stage]);

  // Fetch current MFA state once, on mount. Done client-side so the parent
  // Settings page can stay a Client Component without needing a Server wrapper.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const factor = await getVerifiedTotpFactor();
      if (cancelled) return;
      setFactorId(factor?.id ?? null);
      setLoadingInitial(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingInitial) {
    return (
      <Card className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {labels.title}…
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={
            isEnrolled
              ? 'rounded-btn bg-eco/10 text-eco p-2 shrink-0'
              : 'rounded-btn bg-muted text-muted-foreground p-2 shrink-0'
          }
        >
          {isEnrolled ? (
            <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Smartphone className="h-4 w-4" strokeWidth={2} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-base font-semibold flex items-center gap-2 flex-wrap">
            {labels.title}
            {isEnrolled && (
              <Badge variant="success" className="text-[10px]">
                {labels.activeBadge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{labels.subtitle}</p>
        </div>
        {isEnrolled && stage === 'idle' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDisableConfirm(true)}
            disabled={pending}
            className="shrink-0"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            {labels.disable}
          </Button>
        )}
        {!isEnrolled && stage === 'idle' && (
          <Button size="sm" onClick={handleStartEnroll} disabled={pending} className="shrink-0">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {labels.activate}
          </Button>
        )}
      </div>

      {stage === 'qr' && (
        <div className="rounded-card border border-border bg-card/60 p-4 space-y-4">
          <p className="text-sm">{labels.scanInstructions}</p>

          {qrDataUrl && (
            <div className="flex justify-center bg-anthra/40 rounded-card p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code TOTP" width={220} height={220} />
            </div>
          )}

          {secret && (
            <div className="space-y-1.5">
              <Label htmlFor="mfa-secret">{labels.manualSecret}</Label>
              <div className="flex gap-2">
                <Input
                  id="mfa-secret"
                  value={secret}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {labels.copy}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="mfa-code">{labels.codePlaceholder}</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="font-mono text-base tracking-widest text-center"
            />
          </div>

          {error && <div className="text-xs text-destructive">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStage('idle');
                setQrDataUrl(null);
                setSecret(null);
                setPendingFactorId(null);
                setError(null);
              }}
              disabled={pending}
            >
              {labels.cancel}
            </Button>
            <Button
              size="sm"
              onClick={handleVerify}
              disabled={pending || code.length !== 6}
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {labels.verify}
            </Button>
          </div>
        </div>
      )}

      {!isEnrolled && stage === 'idle' && error && (
        <div className="text-xs text-destructive">{error}</div>
      )}

      <Confirm
        open={showDisableConfirm}
        title={labels.disableConfirmTitle}
        description={labels.disableConfirmDesc}
        confirmLabel={labels.disable}
        cancelLabel={labels.cancel}
        destructive
        onConfirm={handleDisable}
        onCancel={() => setShowDisableConfirm(false)}
      />
    </Card>
  );
}
