'use client';

import { useEffect, useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Loader2,
  Mail,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  requestAccountDeletionAction,
  deleteAccountAction,
  getAccountDeletionPreviewAction,
} from '@/server/actions/gdpr';
import { logoutAction } from '@/server/actions/auth';
import { CONFIRMATION_PHRASES } from '@/lib/security/account-deletion-phrases';

type Stats = {
  vehicles: number;
  fuelEntries: number;
  maintenanceEntries: number;
  hasActiveSubscription: boolean;
};

const EMPTY_STATS: Stats = {
  vehicles: 0,
  fuelEntries: 0,
  maintenanceEntries: 0,
  hasActiveSubscription: false,
};

type Locale = 'fr' | 'en' | 'es' | 'ar' | 'pt';

const LABELS: Record<
  Locale,
  {
    triggerBtn: string;
    deleting: string;
    modalTitle: string;
    close: string;
    // Step 1 — danger panel
    step1Heading: string;
    step1Subtitle: string;
    consequences: (s: Stats) => string[];
    requestCode: string;
    sending: string;
    // Step 2 — verification
    step2Heading: string;
    step2Subtitle: string;
    otpLabel: string;
    passwordLabel: string;
    phraseLabel: (phrase: string) => string;
    phrasePlaceholder: string;
    confirmFinal: string;
    finalLoading: string;
    cancel: string;
    resendCode: string;
    // Step 3 — success
    step3Heading: string;
    step3Body: string;
    redirecting: string;
    // Errors
    sentToast: string;
    rateLimitedToast: string;
    invalidCodeToast: string;
    invalidPwdToast: string;
    invalidPhraseToast: string;
    genericErr: string;
  }
> = {
  fr: {
    triggerBtn: 'Supprimer mon compte définitivement',
    deleting: 'Suppression en cours...',
    modalTitle: 'Supprimer définitivement votre compte',
    close: 'Fermer',
    step1Heading: 'Ce qui va être effacé',
    step1Subtitle:
      'Cette action est immédiate et irréversible. Aucune sauvegarde n\'est conservée.',
    consequences: (s) => [
      `${s.vehicles} véhicule${s.vehicles > 1 ? 's' : ''} et leurs photos`,
      `${s.fuelEntries} relevé${s.fuelEntries > 1 ? 's' : ''} de carburant`,
      `${s.maintenanceEntries} intervention${s.maintenanceEntries > 1 ? 's' : ''} d'entretien et leurs factures`,
      ...(s.hasActiveSubscription
        ? ['Votre abonnement Premium sera annulé immédiatement (sans remboursement)']
        : []),
      'Votre historique de connexion et vos appareils de confiance',
      'Vos préférences, langue, devise et profil',
    ],
    requestCode: 'Recevoir le code par email',
    sending: 'Envoi...',
    step2Heading: 'Confirmer la suppression',
    step2Subtitle:
      'Saisissez le code à 6 chiffres reçu par email et la phrase de confirmation exacte.',
    otpLabel: 'Code reçu par email (6 chiffres)',
    passwordLabel: 'Votre mot de passe actuel',
    phraseLabel: (p) => `Tapez exactement : ${p}`,
    phrasePlaceholder: CONFIRMATION_PHRASES.fr,
    confirmFinal: 'Supprimer définitivement',
    finalLoading: 'Suppression...',
    cancel: 'Annuler',
    resendCode: 'Renvoyer un code',
    step3Heading: 'Votre compte a été supprimé',
    step3Body:
      'Toutes vos données ont été effacées. Merci d\'avoir essayé Keeper.',
    redirecting: 'Redirection...',
    sentToast: 'Code envoyé à votre adresse email',
    rateLimitedToast:
      'Vous avez déjà demandé un code récemment. Vérifiez votre boîte.',
    invalidCodeToast: 'Code incorrect ou expiré',
    invalidPwdToast: 'Mot de passe incorrect',
    invalidPhraseToast: 'Phrase de confirmation incorrecte',
    genericErr: 'Une erreur est survenue',
  },
  en: {
    triggerBtn: 'Delete my account permanently',
    deleting: 'Deleting...',
    modalTitle: 'Permanently delete your account',
    close: 'Close',
    step1Heading: 'What will be erased',
    step1Subtitle:
      'This action is immediate and irreversible. No backup is kept.',
    consequences: (s) => [
      `${s.vehicles} vehicle${s.vehicles > 1 ? 's' : ''} and their photos`,
      `${s.fuelEntries} fuel record${s.fuelEntries > 1 ? 's' : ''}`,
      `${s.maintenanceEntries} maintenance entr${s.maintenanceEntries > 1 ? 'ies' : 'y'} and their invoices`,
      ...(s.hasActiveSubscription
        ? ['Your Premium subscription will be canceled immediately (no refund)']
        : []),
      'Your login history and trusted devices',
      'Your preferences, language, currency and profile',
    ],
    requestCode: 'Send code to my email',
    sending: 'Sending...',
    step2Heading: 'Confirm deletion',
    step2Subtitle:
      'Enter the 6-digit code received by email and the exact confirmation phrase.',
    otpLabel: '6-digit code from email',
    passwordLabel: 'Your current password',
    phraseLabel: (p) => `Type exactly: ${p}`,
    phrasePlaceholder: CONFIRMATION_PHRASES.en,
    confirmFinal: 'Delete permanently',
    finalLoading: 'Deleting...',
    cancel: 'Cancel',
    resendCode: 'Resend a code',
    step3Heading: 'Your account has been deleted',
    step3Body:
      'All your data has been erased. Thank you for trying Keeper.',
    redirecting: 'Redirecting...',
    sentToast: 'Code sent to your email',
    rateLimitedToast: 'You already requested a code recently. Check your inbox.',
    invalidCodeToast: 'Invalid or expired code',
    invalidPwdToast: 'Wrong password',
    invalidPhraseToast: 'Wrong confirmation phrase',
    genericErr: 'An error occurred',
  },
  es: {
    triggerBtn: 'Eliminar mi cuenta definitivamente',
    deleting: 'Eliminando...',
    modalTitle: 'Eliminar definitivamente tu cuenta',
    close: 'Cerrar',
    step1Heading: 'Lo que se borrará',
    step1Subtitle:
      'Esta acción es inmediata e irreversible. No se conserva ninguna copia de seguridad.',
    consequences: (s) => [
      `${s.vehicles} vehículo${s.vehicles > 1 ? 's' : ''} y sus fotos`,
      `${s.fuelEntries} registro${s.fuelEntries > 1 ? 's' : ''} de combustible`,
      `${s.maintenanceEntries} mantenimiento${s.maintenanceEntries > 1 ? 's' : ''} y sus facturas`,
      ...(s.hasActiveSubscription
        ? ['Tu suscripción Premium será cancelada inmediatamente (sin reembolso)']
        : []),
      'Tu historial de conexión y dispositivos de confianza',
      'Tus preferencias, idioma, moneda y perfil',
    ],
    requestCode: 'Enviar código por correo',
    sending: 'Enviando...',
    step2Heading: 'Confirmar eliminación',
    step2Subtitle:
      'Introduce el código de 6 dígitos recibido por correo y la frase de confirmación exacta.',
    otpLabel: 'Código de 6 dígitos del correo',
    passwordLabel: 'Tu contraseña actual',
    phraseLabel: (p) => `Escribe exactamente: ${p}`,
    phrasePlaceholder: CONFIRMATION_PHRASES.es,
    confirmFinal: 'Eliminar definitivamente',
    finalLoading: 'Eliminando...',
    cancel: 'Cancelar',
    resendCode: 'Reenviar un código',
    step3Heading: 'Tu cuenta ha sido eliminada',
    step3Body:
      'Todos tus datos han sido borrados. Gracias por probar Keeper.',
    redirecting: 'Redirigiendo...',
    sentToast: 'Código enviado a tu correo',
    rateLimitedToast:
      'Ya has solicitado un código recientemente. Revisa tu bandeja.',
    invalidCodeToast: 'Código incorrecto o expirado',
    invalidPwdToast: 'Contraseña incorrecta',
    invalidPhraseToast: 'Frase de confirmación incorrecta',
    genericErr: 'Ocurrió un error',
  },
  ar: {
    triggerBtn: 'حذف حسابي نهائياً',
    deleting: 'جاري الحذف...',
    modalTitle: 'حذف حسابك نهائياً',
    close: 'إغلاق',
    step1Heading: 'ما الذي سيتم محوه',
    step1Subtitle:
      'هذا الإجراء فوري ولا يمكن التراجع عنه. لا يتم الاحتفاظ بأي نسخة احتياطية.',
    consequences: (s) => [
      `${s.vehicles} مركبة وصورها`,
      `${s.fuelEntries} سجل وقود`,
      `${s.maintenanceEntries} عملية صيانة وفواتيرها`,
      ...(s.hasActiveSubscription
        ? ['سيتم إلغاء اشتراك Premium الخاص بك فوراً (بدون استرداد)']
        : []),
      'سجل تسجيل الدخول والأجهزة الموثوقة',
      'تفضيلاتك واللغة والعملة والملف الشخصي',
    ],
    requestCode: 'إرسال الرمز إلى البريد',
    sending: 'جاري الإرسال...',
    step2Heading: 'تأكيد الحذف',
    step2Subtitle:
      'أدخل الرمز المكوّن من 6 أرقام الذي وصلك بالبريد وعبارة التأكيد بدقة.',
    otpLabel: 'الرمز المكوّن من 6 أرقام من البريد',
    passwordLabel: 'كلمة المرور الحالية',
    phraseLabel: (p) => `اكتب بدقة: ${p}`,
    phrasePlaceholder: CONFIRMATION_PHRASES.ar,
    confirmFinal: 'حذف نهائياً',
    finalLoading: 'جاري الحذف...',
    cancel: 'إلغاء',
    resendCode: 'إعادة إرسال الرمز',
    step3Heading: 'تم حذف حسابك',
    step3Body:
      'تم محو جميع بياناتك. شكراً لتجربتك Keeper.',
    redirecting: 'إعادة التوجيه...',
    sentToast: 'تم إرسال الرمز إلى بريدك',
    rateLimitedToast: 'لقد طلبت رمزاً مؤخراً. تحقق من البريد.',
    invalidCodeToast: 'رمز غير صحيح أو منتهي',
    invalidPwdToast: 'كلمة مرور خاطئة',
    invalidPhraseToast: 'عبارة تأكيد خاطئة',
    genericErr: 'حدث خطأ',
  },
  pt: {
    triggerBtn: 'Excluir minha conta permanentemente',
    deleting: 'Excluindo...',
    modalTitle: 'Excluir permanentemente sua conta',
    close: 'Fechar',
    step1Heading: 'O que será apagado',
    step1Subtitle:
      'Esta ação é imediata e irreversível. Nenhuma cópia de segurança é mantida.',
    consequences: (s) => [
      `${s.vehicles} veículo${s.vehicles > 1 ? 's' : ''} e suas fotos`,
      `${s.fuelEntries} registro${s.fuelEntries > 1 ? 's' : ''} de combustível`,
      `${s.maintenanceEntries} manutenç${s.maintenanceEntries > 1 ? 'ões' : 'ão'} e suas faturas`,
      ...(s.hasActiveSubscription
        ? ['Sua assinatura Premium será cancelada imediatamente (sem reembolso)']
        : []),
      'Seu histórico de login e dispositivos confiáveis',
      'Suas preferências, idioma, moeda e perfil',
    ],
    requestCode: 'Enviar código para o email',
    sending: 'Enviando...',
    step2Heading: 'Confirmar exclusão',
    step2Subtitle:
      'Introduza o código de 6 dígitos recebido por email e a frase de confirmação exata.',
    otpLabel: 'Código de 6 dígitos do email',
    passwordLabel: 'A sua palavra-passe atual',
    phraseLabel: (p) => `Escreva exatamente: ${p}`,
    phrasePlaceholder: CONFIRMATION_PHRASES.pt,
    confirmFinal: 'Excluir permanentemente',
    finalLoading: 'Excluindo...',
    cancel: 'Cancelar',
    resendCode: 'Reenviar um código',
    step3Heading: 'Sua conta foi excluída',
    step3Body:
      'Todos os seus dados foram apagados. Obrigado por experimentar a Keeper.',
    redirecting: 'Redirecionando...',
    sentToast: 'Código enviado para o seu email',
    rateLimitedToast: 'Já solicitou um código recentemente. Verifique a caixa.',
    invalidCodeToast: 'Código inválido ou expirado',
    invalidPwdToast: 'Palavra-passe incorreta',
    invalidPhraseToast: 'Frase de confirmação incorreta',
    genericErr: 'Ocorreu um erro',
  },
};

type Stage = 'idle' | 'danger' | 'verify' | 'done';

export function DeleteAccountFlow() {
  const rawLocale = useLocale();
  const t = LABELS[rawLocale as Locale] ?? LABELS.en;
  const localeKey = (rawLocale as Locale in LABELS ? rawLocale : 'fr') as Locale;
  const expectedPhrase = CONFIRMATION_PHRASES[localeKey];

  const [stage, setStage] = useState<Stage>('idle');
  const [otp, setOtp] = useState('');
  const [phrase, setPhrase] = useState('');
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [pending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Lazy stats fetch: only triggered when the user actually opens the modal,
  // so settings/profile renders don't make an extra round-trip on every load.
  useEffect(() => {
    if (stage !== 'danger') return;
    let cancelled = false;
    (async () => {
      const s = await getAccountDeletionPreviewAction();
      if (!cancelled) setStats(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [stage]);

  const close = () => {
    if (pending || stage === 'done') return;
    setStage('idle');
    setOtp('');
    setPhrase('');
  };

  const requestCode = () => {
    if (resendCooldown > 0) return;
    startTransition(async () => {
      const res = await requestAccountDeletionAction();
      if ('error' in res && res.error) {
        // Backend rate-limit means a code from the previous request is still
        // valid for up to 15 min — keep the user on the verify screen so they
        // can paste it instead of being stuck on the danger panel.
        if (res.error.includes('déjà')) {
          toast.info(t.rateLimitedToast);
          setResendCooldown(60);
          setStage('verify');
          return;
        }
        toast.error(res.error);
        return;
      }
      toast.success(t.sentToast);
      setResendCooldown(60);
      setStage('verify');
    });
  };

  const confirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await deleteAccountAction(otp, phrase);
      if ('error' in res && res.error) {
        if (res.error.includes('Code')) toast.error(t.invalidCodeToast);
        else if (res.error.includes('Phrase'))
          toast.error(t.invalidPhraseToast);
        else toast.error(res.error);
        return;
      }
      setStage('done');
    });
  };

  // Once the account is gone, log out (clear cookies) then send the user
  // back to the marketing landing.
  useEffect(() => {
    if (stage !== 'done') return;
    const timer = setTimeout(async () => {
      try {
        await logoutAction();
      } catch {
        window.location.replace('/login');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs font-semibold rounded-full flex items-center gap-1.5"
        onClick={() => setStage('danger')}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t.triggerBtn}
      </Button>

      <AnimatePresence>
        {stage !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-card border border-destructive/30 bg-card shadow-elevated overflow-hidden"
            >
              {/* Header strip */}
              <div className="flex items-start gap-3 p-5 border-b border-border bg-destructive/5">
                <div className="rounded-btn bg-destructive/15 text-destructive p-2 shrink-0">
                  <ShieldAlert className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-base font-bold">
                    {t.modalTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={pending || stage === 'done'}
                  className="text-muted-foreground hover:text-foreground shrink-0 disabled:opacity-30"
                  aria-label={t.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  {stage === 'danger' && (
                    <motion.div
                      key="danger"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          {t.step1Heading}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.step1Subtitle}
                        </p>
                      </div>
                      <ul className="space-y-1.5 text-sm bg-muted/40 rounded-card p-4">
                        {t.consequences(stats).map((c, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-foreground"
                          >
                            <span className="text-destructive mt-0.5">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={close}
                          disabled={pending}
                        >
                          {t.cancel}
                        </Button>
                        <Button
                          type="button"
                          onClick={requestCode}
                          disabled={pending}
                          className="bg-destructive hover:bg-destructive/90 text-white"
                        >
                          {pending && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          <Mail className="h-3.5 w-3.5" />
                          {pending ? t.sending : t.requestCode}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {stage === 'verify' && (
                    <motion.form
                      key="verify"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                      onSubmit={confirmDelete}
                    >
                      <div>
                        <h3 className="font-semibold text-sm">
                          {t.step2Heading}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.step2Subtitle}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="del-otp">{t.otpLabel}</Label>
                        <Input
                          id="del-otp"
                          value={otp}
                          onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                          autoFocus
                          className="font-mono text-base tracking-widest text-center"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="del-phrase">
                          {t.phraseLabel(expectedPhrase)}
                        </Label>
                        <Input
                          id="del-phrase"
                          value={phrase}
                          onChange={(e) => setPhrase(e.target.value)}
                          required
                          placeholder={t.phrasePlaceholder}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                          type="button"
                          onClick={requestCode}
                          disabled={pending || resendCooldown > 0}
                          className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50 disabled:no-underline font-mono"
                        >
                          {resendCooldown > 0
                            ? `${t.resendCode} (${resendCooldown}s)`
                            : t.resendCode}
                        </button>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={close}
                            disabled={pending}
                          >
                            {t.cancel}
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              pending ||
                              otp.length !== 6 ||
                              phrase.trim() === ''
                            }
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            {pending && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            <Trash2 className="h-3.5 w-3.5" />
                            {pending ? t.finalLoading : t.confirmFinal}
                          </Button>
                        </div>
                      </div>
                    </motion.form>
                  )}

                  {stage === 'done' && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="py-8 text-center space-y-3"
                    >
                      <div className="rounded-full bg-eco/10 text-eco h-14 w-14 mx-auto flex items-center justify-center">
                        <Trash2 className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-display text-lg font-bold">
                        {t.step3Heading}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {t.step3Body}
                      </p>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-2 pt-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t.redirecting}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
