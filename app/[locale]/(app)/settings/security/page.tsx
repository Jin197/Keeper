'use client';

import { useState, useTransition } from 'react';
import { Key, AlertTriangle, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { exportUserDataAction } from '@/server/actions/gdpr';
import { useLocale } from 'next-intl';
import { MfaSection } from '@/components/domain/mfa-section';
import { TrustedDevicesSection } from '@/components/domain/trusted-devices-section';
import { DeleteAccountFlow } from '@/components/domain/delete-account-flow';

const TRANSLATIONS = {
  fr: {
    password: "Mot de passe",
    passwordUpdated: "Mis à jour il y a 3 mois",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    update: "Mettre à jour",
    twoFactor: "Authentification à deux facteurs",
    twoFactorSub: "Une protection supplémentaire pour votre compte",
    disabled: "Désactivé",
    appAuthenticator: "App authenticator",
    sms: "SMS",
    activeSessions: "Sessions actives",
    activeSessionsSub: "Appareils connectés à votre compte",
    current: "Actuel",
    disconnect: "Déconnecter",
    myData: "Mes données (RGPD)",
    exportData: "Exporter mes données",
    deleteAccount: "Supprimer mon compte",
    exporting: "Exportation...",
    deleting: "Suppression...",
    noSuspiciousActivity: "Aucune activité suspecte détectée",
    lastLogin: "Dernière connexion il y a 2 minutes depuis Lyon, France.",
    deleteConfirmTitle: "Supprimer définitivement le compte ?",
    deleteConfirmDesc: "Cette action est irréversible et supprimera l'ensemble de vos véhicules, dépenses énergétiques, historiques d'entretien et données personnelles de nos serveurs conformément à la réglementation RGPD.",
    deleteConfirmLabel: "Supprimer mon compte",
    cancelDeleteLabel: "Conserver mon compte",
    exportError: "Erreur lors de l’exportation des données.",
    exportGenericError: "Une erreur est survenue lors de l’export des données.",
    deleteError: "Erreur lors de la suppression du compte.",
    deleteGenericError: "Une erreur est survenue lors de la suppression de votre compte."
  },
  en: {
    password: "Password",
    passwordUpdated: "Updated 3 months ago",
    currentPassword: "Current password",
    newPassword: "New password",
    update: "Update",
    twoFactor: "Two-factor authentication",
    twoFactorSub: "Extra protection for your account",
    disabled: "Disabled",
    appAuthenticator: "App authenticator",
    sms: "SMS",
    activeSessions: "Active sessions",
    activeSessionsSub: "Devices logged into your account",
    current: "Current",
    disconnect: "Log out",
    myData: "My Data (GDPR)",
    exportData: "Export my data",
    deleteAccount: "Delete my account",
    exporting: "Exporting...",
    deleting: "Deleting...",
    noSuspiciousActivity: "No suspicious activity detected",
    lastLogin: "Last login 2 minutes ago from Lyon, France.",
    deleteConfirmTitle: "Delete account permanently?",
    deleteConfirmDesc: "This action is irreversible and will delete all your vehicles, energy expenses, maintenance history, and personal data from our servers in compliance with GDPR regulations.",
    deleteConfirmLabel: "Delete my account",
    cancelDeleteLabel: "Keep my account",
    exportError: "Error exporting data.",
    exportGenericError: "An error occurred while exporting data.",
    deleteError: "Error deleting account.",
    deleteGenericError: "An error occurred while deleting your account."
  },
  es: {
    password: "Contraseña",
    passwordUpdated: "Actualizada hace 3 meses",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    update: "Actualizar",
    twoFactor: "Autenticación de dos factores",
    twoFactorSub: "Una protección adicional para tu cuenta",
    disabled: "Desactivado",
    appAuthenticator: "App authenticator",
    sms: "SMS",
    activeSessions: "Sesiones activas",
    activeSessionsSub: "Dispositivos conectados a tu cuenta",
    current: "Actual",
    disconnect: "Cerrar sesión",
    myData: "Mis datos (RGPD)",
    exportData: "Exportar mis datos",
    deleteAccount: "Eliminar mi cuenta",
    exporting: "Exportando...",
    deleting: "Eliminando...",
    noSuspiciousActivity: "No se ha detectado actividad sospechosa",
    lastLogin: "Última conexión hace 2 minutos desde Lyon, Francia.",
    deleteConfirmTitle: "¿Eliminar cuenta definitivamente?",
    deleteConfirmDesc: "Esta acción es irreversible y eliminará todos tus vehículos, gastos de energía, historial de mantenimiento y datos personales de nuestros servidores de conformidad con la normativa RGPD.",
    deleteConfirmLabel: "Eliminar mi cuenta",
    cancelDeleteLabel: "Conservar mi cuenta",
    exportError: "Error al exportar los datos.",
    exportGenericError: "Se produjo un error al exportar los datos.",
    deleteError: "Error al eliminar la cuenta.",
    deleteGenericError: "Se produjo un error al eliminar tu cuenta."
  },
  ar: {
    password: "كلمة المرور",
    passwordUpdated: "تم التحديث منذ 3 أشهر",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    update: "تحديث",
    twoFactor: "المصادقة الثنائية",
    twoFactorSub: "حماية إضافية لحسابك",
    disabled: "معطل",
    appAuthenticator: "تطبيق المصادقة",
    sms: "رسالة قصيرة SMS",
    activeSessions: "الجلسات النشطة",
    activeSessionsSub: "الأجهزة المتصلة بحسابك",
    current: "الحالي",
    disconnect: "تسجيل الخروج",
    myData: "بياناتي (GDPR)",
    exportData: "تصدير بياناتي",
    deleteAccount: "حذف حسابي",
    exporting: "جاري التصدير...",
    deleting: "جاري الحذف...",
    noSuspiciousActivity: "لم يتم اكتشاف أي نشاط مشبوه",
    lastLogin: "آخر تسجيل دخول منذ دقيقتين من ليون، فرنسا.",
    deleteConfirmTitle: "هل تريد حذف حسابك نهائياً؟",
    deleteConfirmDesc: "هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى حذف جميع مركباتك، ومصروفات الطاقة، وسجل الصيانة، وبياناتك الشخصية من خوادمنا امتثالاً للوائح GDPR.",
    deleteConfirmLabel: "حذف حسابي",
    cancelDeleteLabel: "الاحتفاظ بحسابي",
    exportError: "خطأ أثناء تصدير البيانات.",
    exportGenericError: "حدث خطأ أثناء تصدير البيانات.",
    deleteError: "خطأ أثناء حذف الحساب.",
    deleteGenericError: "حدث خطأ أثناء حذف حسابك."
  },
  pt: {
    password: "Senha",
    passwordUpdated: "Atualizada há 3 meses",
    currentPassword: "Senha atual",
    newPassword: "Nova senha",
    update: "Atualizar",
    twoFactor: "Autenticação de dois fatores",
    twoFactorSub: "Uma proteção adicional para sua conta",
    disabled: "Desativado",
    appAuthenticator: "App authenticator",
    sms: "SMS",
    activeSessions: "Sessões ativas",
    activeSessionsSub: "Dispositivos conectados à sua conta",
    current: "Atual",
    disconnect: "Desconectar",
    myData: "Meus dados (RGPD)",
    exportData: "Exportar meus dados",
    deleteAccount: "Excluir minha conta",
    exporting: "Exportando...",
    deleting: "Excluindo...",
    noSuspiciousActivity: "Nenhuma atividade suspeita detectada",
    lastLogin: "Último login há 2 minutos de Lyon, França.",
    deleteConfirmTitle: "Excluir conta definitivamente?",
    deleteConfirmDesc: "Esta ação é irreversível e excluirá todos os seus veículos, despesas de energia, histórico de manutenção e dados pessoais de nossos servidores em conformidade com os regulamentos do RGPD.",
    deleteConfirmLabel: "Excluir minha conta",
    cancelDeleteLabel: "Manter minha conta",
    exportError: "Erro ao exportar dados.",
    exportGenericError: "Ocorreu um erro ao exportar dados.",
    deleteError: "Erro ao excluir a conta.",
    deleteGenericError: "Ocorreu um erro ao excluir a sua conta."
  }
};

export default function SecurityPage() {
  const locale = useLocale();
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const [isExporting, startExport] = useTransition();

  const handleExport = () => {
    startExport(async () => {
      try {
        const result = await exportUserDataAction();
        if (result.ok && result.data) {
          const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result.data, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute('href', dataStr);
          downloadAnchor.setAttribute('download', `velocewealth-export-${result.data.userId || 'data'}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
        } else {
          alert(result.error || t.exportError);
        }
      } catch (err) {
        alert(t.exportGenericError);
      }
    });
  };

  // Legacy single-click delete removed — secure 3-factor flow is now in
  // the <DeleteAccountFlow /> component rendered in the data card below.

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-btn bg-[#007AFF]/10 text-[#007AFF] p-2.5">
            <Key className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-base font-semibold">{t.password}</h2>
            <p className="text-xs text-muted-foreground">
              {t.passwordUpdated}
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="current">{t.currentPassword}</Label>
            <PasswordInput
              id="current"
              name="currentPassword"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">{t.newPassword}</Label>
            <PasswordInput
              id="new"
              name="newPassword"
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button>{t.update}</Button>
        </div>
      </Card>

      <MfaSection />

      <TrustedDevicesSection />

      <Card className="p-6">
        <h2 className="font-display text-base font-semibold mb-3">
          {t.myData}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" /> {isExporting ? t.exporting : t.exportData}
          </Button>
          <DeleteAccountFlow />
        </div>
      </Card>

      <Card className="p-4 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" strokeWidth={2} />
          <div>
            <div className="font-medium">{t.noSuspiciousActivity}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t.lastLogin}
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
