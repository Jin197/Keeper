'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { AvatarUpload } from '@/components/domain/avatar-upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormError } from '@/components/ui/form-error';
import { Confirm } from '@/components/ui/confirm';
import { useUser } from '@/components/user-context';
import { updateProfileAction } from '@/server/actions/profile';
import { DeleteAccountFlow } from '@/components/domain/delete-account-flow';
import { getCurrenciesByRegion } from '@/lib/currencies';
import { signupCountryOptions } from '@/lib/countries';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/i18n/routing';

const TRANSLATIONS = {
  fr: {
    changePhoto: "Changer la photo",
    identity: "Identité",
    fullName: "Nom complet",
    email: "Email",
    location: "Localisation",
    language: "Langue",
    country: "Pays",
    currency: "Devise",
    save: "Enregistrer",
    profileUpdated: "Profil mis à jour",
    dangerZone: "Zone de danger",
    dangerZoneDesc: "La suppression de votre compte est définitive et irréversible. Toutes vos données associées (profil, véhicules, factures, analyses prédictives PHM) seront irrémédiablement effacées de nos serveurs conformément aux exigences du RGPD.",
    deleteAccountBtn: "Supprimer mon compte définitivement",
    deleting: "Suppression en cours...",
    deleteConfirmTitle: "Supprimer définitivement votre compte ?",
    deleteConfirmDesc: "Cette action est irréversible et supprimera l'ensemble de vos données, véhicules et dépenses de nos serveurs.",
    deleteConfirmLabel: "Supprimer mon compte",
    cancelDeleteLabel: "Conserver mon compte",
    deleteSuccess: "Compte supprimé avec succès",
    deleteError: "Erreur lors de la suppression du compte.",
    deleteGenericError: "Une erreur est survenue lors de la suppression de votre compte.",
    countries: {
      FR: "France",
      BE: "Belgique",
      CH: "Suisse",
      MA: "Maroc",
      SN: "Sénégal",
      CI: "Côte d'Ivoire",
      CA: "Canada",
      US: "États-Unis",
      GB: "Royaume-Uni",
      ES: "Espagne",
      PT: "Portugal"
    } as Record<string, string>
  },
  en: {
    changePhoto: "Change photo",
    identity: "Identity",
    fullName: "Full name",
    email: "Email",
    location: "Location",
    language: "Language",
    country: "Country",
    currency: "Currency",
    save: "Save",
    profileUpdated: "Profile updated",
    dangerZone: "Danger Zone",
    dangerZoneDesc: "Deleting your account is permanent and irreversible. All associated data (profile, vehicles, bills, predictive PHM analysis) will be permanently deleted from our servers in compliance with GDPR.",
    deleteAccountBtn: "Delete my account permanently",
    deleting: "Deleting...",
    deleteConfirmTitle: "Delete account permanently?",
    deleteConfirmDesc: "This action is irreversible and will delete all your data, vehicles, and expenses from our servers.",
    deleteConfirmLabel: "Delete my account",
    cancelDeleteLabel: "Keep my account",
    deleteSuccess: "Account successfully deleted",
    deleteError: "Error deleting account.",
    deleteGenericError: "An error occurred while deleting your account.",
    countries: {
      FR: "France",
      BE: "Belgium",
      CH: "Switzerland",
      MA: "Morocco",
      SN: "Senegal",
      CI: "Ivory Coast",
      CA: "Canada",
      US: "United States",
      GB: "United Kingdom",
      ES: "Spain",
      PT: "Portugal"
    } as Record<string, string>
  },
  es: {
    changePhoto: "Cambiar foto",
    identity: "Identidad",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    location: "Ubicación",
    language: "Idioma",
    country: "País",
    currency: "Moneda",
    save: "Guardar",
    profileUpdated: "Perfil actualizado",
    dangerZone: "Zona de peligro",
    dangerZoneDesc: "La eliminación de tu cuenta es definitiva e irreversible. Todos tus datos asociados (perfil, vehículos, facturas, análisis predictivos PHM) se borrarán de forma permanente de nuestros servidores de conformidad con el RGPD.",
    deleteAccountBtn: "Eliminar mi cuenta definitivamente",
    deleting: "Eliminando...",
    deleteConfirmTitle: "¿Eliminar definitivamente tu cuenta?",
    deleteConfirmDesc: "Esta acción es irreversible y eliminará todos tus datos, vehículos y gastos de nuestros servidores.",
    deleteConfirmLabel: "Eliminar mi cuenta",
    cancelDeleteLabel: "Conservar mi cuenta",
    deleteSuccess: "Cuenta eliminada con éxito",
    deleteError: "Error al eliminar la cuenta.",
    deleteGenericError: "Se produjo un error al eliminar tu cuenta.",
    countries: {
      FR: "Francia",
      BE: "Bélgica",
      CH: "Suiza",
      MA: "Marruecos",
      SN: "Senegal",
      CI: "Costa de Marfil",
      CA: "Canadá",
      US: "Estados Unidos",
      GB: "Reino Unido",
      ES: "España",
      PT: "Portugal"
    } as Record<string, string>
  },
  ar: {
    changePhoto: "تغيير الصورة",
    identity: "الهوية",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    location: "الموقع",
    language: "اللغة",
    country: "البلد",
    currency: "العملة",
    save: "حفظ",
    profileUpdated: "تم تحديث الملف الشخصي",
    dangerZone: "منطقة الخطر",
    dangerZoneDesc: "حذف حسابك نهائي ولا يمكن التراجع عنه. سيتم مسح جميع بياناتك المرتبطة (الملف الشخصي، المركبات، الفواتير، تحليلات PHM التنبؤية) نهائياً من خوادمنا امتثالاً للائحة العامة لحماية البيانات (GDPR).",
    deleteAccountBtn: "حذف حسابي نهائياً",
    deleting: "جاري الحذف...",
    deleteConfirmTitle: "هل تريد حذف حسابك نهائياً؟",
    deleteConfirmDesc: "هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى حذف جميع بياناتك ومركباتك ومصروفاتك من خوادمنا.",
    deleteConfirmLabel: "حذف حسابي",
    cancelDeleteLabel: "الاحتفاظ بحسابي",
    deleteSuccess: "تم حذف الحساب بنجاح",
    deleteError: "خطأ أثناء حذف الحساب.",
    deleteGenericError: "حدث خطأ أثناء حذف حسابك.",
    countries: {
      FR: "فرنسا",
      BE: "بلجيكا",
      CH: "سويسرا",
      MA: "المغرب",
      SN: "السنغال",
      CI: "ساحل العاج",
      CA: "كندا",
      US: "الولايات المتحدة",
      GB: "المملكة المتحدة",
      ES: "إسبانيا",
      PT: "البرتغال"
    } as Record<string, string>
  },
  pt: {
    changePhoto: "Alterar foto",
    identity: "Identidade",
    fullName: "Nome completo",
    email: "E-mail",
    location: "Localização",
    language: "Idioma",
    country: "País",
    currency: "Moeda",
    save: "Salvar",
    profileUpdated: "Perfil atualizado",
    dangerZone: "Zona de perigo",
    dangerZoneDesc: "A exclusão da sua conta é definitiva e irreversível. Todos os seus dados associados (perfil, veículos, faturas, análises preditivas PHM) serão permanentemente apagados dos nossos servidores em conformidade com o RGPD.",
    deleteAccountBtn: "Excluir minha conta permanentemente",
    deleting: "Excluindo...",
    deleteConfirmTitle: "Excluir definitivamente sua conta?",
    deleteConfirmDesc: "Esta ação é irreversível e excluirá todos os seus dados, veículos e despesas de nossos servidores.",
    deleteConfirmLabel: "Excluir minha conta",
    cancelDeleteLabel: "Manter minha conta",
    deleteSuccess: "Conta excluída com sucesso",
    deleteError: "Erro ao excluir a conta.",
    deleteGenericError: "Ocorreu um erro ao excluir a sua conta.",
    countries: {
      FR: "França",
      BE: "Bélgica",
      CH: "Suíça",
      MA: "Marrocos",
      SN: "Senegal",
      CI: "Costa do Marfim",
      CA: "Canadá",
      US: "Estados Unidos",
      GB: "Reino Unido",
      ES: "Espanha",
      PT: "Portugal"
    } as Record<string, string>
  }
};

export default function ProfileSettingsPage() {
  const user = useUser();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const [pending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(undefined);
      const res = await updateProfileAction(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(t.profileUpdated);
      // If the user changed their preferred language, navigate to the matching
      // URL prefix so the entire app re-renders in that language. Without this
      // the cookie is set but `localePrefix: 'as-needed'` keeps the active
      // URL (e.g. /fr/...) as the source of truth and the UI stays stale.
      if (res.locale && res.locale !== locale) {
        router.replace(pathname, { locale: res.locale as Locale });
        router.refresh();
      }
    });
  };

  // Legacy single-click delete removed — the secure 3-factor flow lives in
  // <DeleteAccountFlow /> which renders its own button + modal below.

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <div>
            <div className="font-display text-lg font-semibold truncate">
              {user.fullName}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
          <AvatarUpload
            fullName={user.fullName}
            initialAvatarUrl={user.avatarUrl ?? null}
            size="lg"
          />
        </Card>

        <Card className="p-6 space-y-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t.identity}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t.fullName}</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={user.fullName}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t.location}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="locale">{t.language}</Label>
              <Select id="locale" name="locale" defaultValue={user.locale}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
                <option value="pt">Português</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">{t.country}</Label>
              <Select id="country" name="country" defaultValue={user.country}>
                {/* Full list, labelled in the UI language; the country also sets the price band. */}
                {signupCountryOptions(locale).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">{t.currency}</Label>
              <Select id="currency" name="currency" defaultValue={user.currency}>
                {getCurrenciesByRegion().map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        <FormError message={error} />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.save}
          </Button>
        </div>
      </form>

      {/* Danger Zone — secure 3-factor account deletion (OTP + password + phrase) */}
      <Card className="p-6 border border-destructive/20 bg-destructive/5 space-y-4 rounded-card">
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h3 className="font-display text-base font-semibold text-white">{t.dangerZone}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t.dangerZoneDesc}
            </p>
          </div>
        </div>
        <div className="flex justify-start">
          <DeleteAccountFlow />
        </div>
      </Card>
    </div>
  );
}
