import 'server-only';

interface DeletionOtpEmailOpts {
  fullName: string | null;
  email: string;
  otp: string;
  expiresInMinutes: number;
  locale: string;
}

const SUBJECTS: Record<string, string> = {
  fr: 'Code de confirmation : suppression de votre compte Keeper',
  en: 'Confirmation code: delete your Keeper account',
  es: 'Código de confirmación: eliminación de tu cuenta Keeper',
  ar: 'رمز التأكيد: حذف حساب Keeper الخاص بك',
  pt: 'Código de confirmação: exclusão da sua conta Keeper',
};

const COPY: Record<
  string,
  {
    greeting: (name: string) => string;
    intro: string;
    codeLabel: string;
    validity: (m: number) => string;
    warningTitle: string;
    warningBody: string;
    ignore: string;
    footer: string;
    altDirective: string;
  }
> = {
  fr: {
    greeting: (n) => `Bonjour ${n},`,
    intro:
      'Vous avez demandé la suppression définitive de votre compte Keeper. Saisissez le code ci-dessous dans la page de confirmation pour terminer la procédure.',
    codeLabel: 'Votre code de confirmation',
    validity: (m) => `Ce code est valable ${m} minutes.`,
    warningTitle: 'Action irréversible',
    warningBody:
      'Une fois confirmée, votre suppression de compte est immédiate et définitive. Tous vos véhicules, dépenses énergétiques, historiques d\'entretien et fichiers seront effacés de nos serveurs. Tout abonnement actif sera annulé.',
    ignore:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et changez votre mot de passe par précaution.",
    footer:
      'Cet email a été envoyé automatiquement. Ne pas répondre. Keeper · Sécurité.',
    altDirective:
      'Saisissez le code de suppression suivant dans Keeper.',
  },
  en: {
    greeting: (n) => `Hi ${n},`,
    intro:
      'You requested the permanent deletion of your Keeper account. Enter the code below on the confirmation page to complete the process.',
    codeLabel: 'Your confirmation code',
    validity: (m) => `This code is valid for ${m} minutes.`,
    warningTitle: 'Irreversible action',
    warningBody:
      'Once confirmed, your account deletion is immediate and permanent. All your vehicles, fuel expenses, maintenance history and files will be erased from our servers. Any active subscription will be canceled.',
    ignore:
      "If you didn't initiate this request, ignore this email and change your password as a precaution.",
    footer:
      'This email was sent automatically. Do not reply. Keeper · Security.',
    altDirective:
      'Enter the following deletion code in Keeper.',
  },
  es: {
    greeting: (n) => `Hola ${n},`,
    intro:
      'Has solicitado la eliminación definitiva de tu cuenta Keeper. Introduce el código que aparece a continuación en la página de confirmación para completar el proceso.',
    codeLabel: 'Tu código de confirmación',
    validity: (m) => `Este código es válido durante ${m} minutos.`,
    warningTitle: 'Acción irreversible',
    warningBody:
      'Una vez confirmada, la eliminación de tu cuenta es inmediata y definitiva. Todos tus vehículos, gastos de combustible, historiales de mantenimiento y archivos se borrarán de nuestros servidores. Cualquier suscripción activa será cancelada.',
    ignore:
      'Si no iniciaste esta solicitud, ignora este correo y cambia tu contraseña como precaución.',
    footer:
      'Este correo se envió automáticamente. No responder. Keeper · Seguridad.',
    altDirective:
      'Introduce el siguiente código de eliminación en Keeper.',
  },
  ar: {
    greeting: (n) => `مرحباً ${n}،`,
    intro:
      'لقد طلبت حذف حسابك في Keeper بشكل دائم. أدخل الرمز أدناه في صفحة التأكيد لإكمال العملية.',
    codeLabel: 'رمز التأكيد الخاص بك',
    validity: (m) => `هذا الرمز صالح لمدة ${m} دقيقة.`,
    warningTitle: 'إجراء لا رجعة فيه',
    warningBody:
      'بمجرد التأكيد، يتم حذف حسابك فوراً وبشكل نهائي. سيتم مسح جميع مركباتك ومصاريف الوقود وسجلات الصيانة والملفات من خوادمنا. سيتم إلغاء أي اشتراك نشط.',
    ignore:
      'إذا لم تكن قد بدأت هذا الطلب، تجاهل هذا البريد الإلكتروني وقم بتغيير كلمة المرور احتياطاً.',
    footer:
      'تم إرسال هذا البريد الإلكتروني تلقائياً. لا ترد. Keeper · الأمن.',
    altDirective:
      'أدخل رمز الحذف التالي في Keeper.',
  },
  pt: {
    greeting: (n) => `Olá ${n},`,
    intro:
      'Solicitou a exclusão permanente da sua conta Keeper. Introduza o código abaixo na página de confirmação para concluir o processo.',
    codeLabel: 'O seu código de confirmação',
    validity: (m) => `Este código é válido durante ${m} minutos.`,
    warningTitle: 'Ação irreversível',
    warningBody:
      'Uma vez confirmada, a exclusão da sua conta é imediata e definitiva. Todos os seus veículos, despesas de combustível, históricos de manutenção e ficheiros serão apagados dos nossos servidores. Qualquer subscrição ativa será cancelada.',
    ignore:
      'Se não iniciou este pedido, ignore este email e altere a sua palavra-passe por precaução.',
    footer:
      'Este email foi enviado automaticamente. Não responder. Keeper · Segurança.',
    altDirective:
      'Introduza o seguinte código de exclusão no Keeper.',
  },
};

export interface AccountDeletionEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render the dark-themed account-deletion OTP email.
 *
 * Style targets: anthracite background (#121212), Keeper accent (#007AFF),
 * Eco green for the "warning resolved if ignored" tone (#2ECC71).
 * Hand-rolled HTML with inline styles + table layout — the email rendering
 * subset (Gmail/Outlook/iOS Mail) doesn't tolerate modern CSS.
 */
export function renderAccountDeletionEmail(
  opts: DeletionOtpEmailOpts,
): AccountDeletionEmail {
  const t = COPY[opts.locale] ?? COPY.en;
  const subject = SUBJECTS[opts.locale] ?? SUBJECTS.en;
  const name = opts.fullName ?? opts.email.split('@')[0] ?? 'utilisateur';
  const text = `${t.greeting(name)}\n\n${t.intro}\n\n${t.codeLabel}: ${opts.otp}\n${t.validity(opts.expiresInMinutes)}\n\n${t.warningTitle}\n${t.warningBody}\n\n${t.ignore}\n\n${t.footer}`;

  const html = `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#e5e7eb;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent">${escapeHtml(t.altDirective)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0a0a0b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#121214;border:1px solid #1f2024;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #1f2024;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#ffffff;">
                    keeper
                  </td>
                  <td align="right" style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">
                    SÉCURITÉ
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="margin:0 0 16px;font-size:15px;color:#e5e7eb;">${escapeHtml(t.greeting(name))}</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#cbd5e1;">${escapeHtml(t.intro)}</p>

              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">${escapeHtml(t.codeLabel)}</p>
              <div style="background:linear-gradient(135deg,#0a4fc8 0%, #0086ff 100%);border-radius:12px;padding:24px;text-align:center;margin-bottom:12px;">
                <div style="font-family:'JetBrains Mono','SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:0.32em;color:#ffffff;">${escapeHtml(opts.otp)}</div>
              </div>
              <p style="margin:0 0 28px;font-size:12px;color:#9ca3af;">${escapeHtml(t.validity(opts.expiresInMinutes))}</p>

              <!-- Warning block -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1a0f10;border:1px solid #3a1c1d;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#fca5a5;">${escapeHtml(t.warningTitle)}</p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#e5e7eb;">${escapeHtml(t.warningBody)}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#9ca3af;">${escapeHtml(t.ignore)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;border-top:1px solid #1f2024;">
              <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.5;">${escapeHtml(t.footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
