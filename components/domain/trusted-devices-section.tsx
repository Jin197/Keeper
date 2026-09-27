'use client';

import { useEffect, useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Monitor, MapPin, Loader2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Confirm } from '@/components/ui/confirm';
import {
  listTrustedDevicesAction,
  revokeTrustedDeviceAction,
  type TrustedDeviceRow,
} from '@/server/actions/trusted-devices';

const LABELS = {
  fr: {
    title: 'Appareils de confiance',
    subtitle:
      'Les navigateurs reconnus depuis vos connexions précédentes. Révoquez tout appareil que vous ne reconnaissez pas.',
    empty: 'Aucun appareil de confiance pour l\'instant.',
    current: 'Cet appareil',
    revoke: 'Révoquer',
    revokeConfirmTitle: 'Révoquer cet appareil ?',
    revokeConfirmDesc:
      'La prochaine connexion depuis ce navigateur sera traitée comme une nouvelle session (vous recevrez une notification).',
    revoked: 'Appareil révoqué',
    revokeError: 'Échec de la révocation',
    lastSeen: 'Dernière connexion',
    cancel: 'Annuler',
    refresh: 'Actualiser',
  },
  en: {
    title: 'Trusted devices',
    subtitle:
      'Browsers we recognize from your previous logins. Revoke any device you don\'t recognize.',
    empty: 'No trusted devices yet.',
    current: 'This device',
    revoke: 'Revoke',
    revokeConfirmTitle: 'Revoke this device?',
    revokeConfirmDesc:
      'The next login from this browser will be treated as a new session (you\'ll get a notification email).',
    revoked: 'Device revoked',
    revokeError: 'Revoke failed',
    lastSeen: 'Last seen',
    cancel: 'Cancel',
    refresh: 'Refresh',
  },
  es: {
    title: 'Dispositivos de confianza',
    subtitle:
      'Navegadores reconocidos de tus inicios de sesión anteriores. Revoca cualquier dispositivo que no reconozcas.',
    empty: 'Aún no hay dispositivos de confianza.',
    current: 'Este dispositivo',
    revoke: 'Revocar',
    revokeConfirmTitle: '¿Revocar este dispositivo?',
    revokeConfirmDesc:
      'El próximo inicio de sesión desde este navegador se tratará como una nueva sesión (recibirás una notificación).',
    revoked: 'Dispositivo revocado',
    revokeError: 'Error al revocar',
    lastSeen: 'Última conexión',
    cancel: 'Cancelar',
    refresh: 'Actualizar',
  },
  ar: {
    title: 'الأجهزة الموثوقة',
    subtitle:
      'المتصفحات التي تم التعرف عليها من عمليات تسجيل الدخول السابقة. قم بإلغاء أي جهاز لا تعرفه.',
    empty: 'لا توجد أجهزة موثوقة بعد.',
    current: 'هذا الجهاز',
    revoke: 'إلغاء',
    revokeConfirmTitle: 'إلغاء هذا الجهاز؟',
    revokeConfirmDesc:
      'سيتم التعامل مع تسجيل الدخول التالي من هذا المتصفح كجلسة جديدة (ستتلقى إشعاراً).',
    revoked: 'تم إلغاء الجهاز',
    revokeError: 'فشل الإلغاء',
    lastSeen: 'آخر اتصال',
    cancel: 'إلغاء',
    refresh: 'تحديث',
  },
  pt: {
    title: 'Dispositivos confiáveis',
    subtitle:
      'Navegadores reconhecidos dos seus inícios de sessão anteriores. Revogue qualquer dispositivo que não reconheça.',
    empty: 'Ainda não há dispositivos confiáveis.',
    current: 'Este dispositivo',
    revoke: 'Revogar',
    revokeConfirmTitle: 'Revogar este dispositivo?',
    revokeConfirmDesc:
      'O próximo início de sessão a partir deste navegador será tratado como uma nova sessão (receberá uma notificação).',
    revoked: 'Dispositivo revogado',
    revokeError: 'Falha ao revogar',
    lastSeen: 'Última ligação',
    cancel: 'Cancelar',
    refresh: 'Atualizar',
  },
} as const;

export function TrustedDevicesSection() {
  const rawLocale = useLocale();
  const t = LABELS[rawLocale as keyof typeof LABELS] ?? LABELS.en;

  const [devices, setDevices] = useState<TrustedDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      const rows = await listTrustedDevicesAction();
      setDevices(rows);
      setLoading(false);
    });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await listTrustedDevicesAction();
      if (!cancelled) {
        setDevices(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevoke = (id: string) => {
    setConfirmId(null);
    startTransition(async () => {
      const res = await revokeTrustedDeviceAction(id);
      if ('error' in res && res.error) {
        toast.error(t.revokeError);
        return;
      }
      toast.success(t.revoked);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-btn bg-veloce/10 text-veloce p-2 shrink-0">
          <Monitor className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-base font-semibold">{t.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={pending}
          className="shrink-0"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t.refresh}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.title}…
        </div>
      ) : devices.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t.empty}</div>
      ) : (
        <ul className="divide-y divide-border">
          {devices.map((d) => (
            <li
              key={d.id}
              className="py-3 flex items-start gap-3 first:pt-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{d.label}</span>
                  {d.isCurrent && (
                    <Badge variant="success" className="text-[10px]">
                      {t.current}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  {d.lastIp && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {d.lastIp}
                    </span>
                  )}
                  <span>
                    {t.lastSeen}:{' '}
                    {new Date(d.lastSeenAt).toLocaleString(rawLocale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmId(d.id)}
                disabled={pending}
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.revoke}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Confirm
        open={confirmId !== null}
        title={t.revokeConfirmTitle}
        description={t.revokeConfirmDesc}
        confirmLabel={t.revoke}
        cancelLabel={t.cancel}
        destructive
        onConfirm={() => confirmId && handleRevoke(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </Card>
  );
}
