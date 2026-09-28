import 'server-only';
import type {
  MaintenanceTaskRecord,
  MaintenanceTaskInstructions,
} from '@/lib/types';

interface RenderArgs {
  userFullName: string | null;
  userEmail: string;
  vehicleLabel: string;
  task: MaintenanceTaskRecord;
  phase: 'warning' | 'urgent' | 'overdue';
  locale: string;
  appUrl: string;
}

export function renderMaintenanceReminderEmail({
  userFullName,
  vehicleLabel,
  task,
  phase,
  locale,
  appUrl,
}: RenderArgs): { subject: string; html: string; text: string } {
  const labels = LABELS[locale as keyof typeof LABELS] ?? LABELS.fr;
  const name = userFullName?.split(' ')[0] ?? '';
  const scheduledLabel = task.scheduledFor
    ? formatDate(task.scheduledFor, locale)
    : '';
  const subject =
    phase === 'overdue'
      ? labels.subjectOverdue(task.title, vehicleLabel)
      : phase === 'urgent'
        ? labels.subjectUrgent(task.title, vehicleLabel)
        : labels.subjectWarning(task.title, vehicleLabel);

  const instructions = task.instructions as MaintenanceTaskInstructions | null;
  const checklistHtml =
    instructions?.checklist?.length
      ? `<ul style="padding-left:18px;color:#3d3d40;line-height:1.5">${instructions.checklist
          .map((i) => `<li>${escapeHtml(i)}</li>`)
          .join('')}</ul>`
      : '';
  const toolsHtml =
    instructions?.tools?.length
      ? `<p style="font-size:13px;color:#7a7a82;margin:14px 0 4px"><strong>${labels.toolsHeader}</strong></p>
         <p style="font-size:13px;color:#3d3d40;line-height:1.5">${instructions.tools
           .map((t) => escapeHtml(t))
           .join(' · ')}</p>`
      : '';
  const tutorialHtml = instructions?.tutorialUrl
    ? `<p style="margin-top:14px"><a href="${escapeAttr(instructions.tutorialUrl)}" style="color:#007AFF;text-decoration:none">${labels.tutorialLink} →</a></p>`
    : '';
  const ctaUrl = `${appUrl}/maintenance/agenda`;

  const accentColor =
    phase === 'overdue' ? '#DC2626' : phase === 'urgent' ? '#F59E0B' : '#007AFF';
  const phaseLabel =
    phase === 'overdue'
      ? labels.phaseOverdue
      : phase === 'urgent'
        ? labels.phaseUrgent
        : labels.phaseWarning;

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Inter',-apple-system,Segoe UI,sans-serif;color:#e7e7eb">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0b">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="540" style="max-width:540px;background:#16161a;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
          <tr>
            <td style="padding:32px 28px 8px">
              <div style="text-transform:uppercase;letter-spacing:2px;font-size:11px;color:${accentColor};font-weight:600">${escapeHtml(phaseLabel)}</div>
              <h1 style="font-size:22px;font-weight:700;margin:8px 0 4px;color:#fff;line-height:1.3">${escapeHtml(labels.heading(name))}</h1>
              <p style="font-size:14px;color:#9b9ba1;margin:0">${escapeHtml(labels.subheading(task.title, vehicleLabel, scheduledLabel))}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px">
              <div style="background:#0e0e11;border:1px solid rgba(255,255,255,0.04);border-radius:16px;padding:20px">
                <div style="font-size:13px;color:#9b9ba1;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">${escapeHtml(labels.taskHeader)}</div>
                <div style="font-size:17px;color:#fff;font-weight:600;margin-bottom:14px">${escapeHtml(task.title)}</div>
                ${task.description ? `<p style="font-size:13px;color:#bfbfc6;line-height:1.5;margin:0 0 14px">${escapeHtml(task.description)}</p>` : ''}
                ${checklistHtml}
                ${toolsHtml}
                ${tutorialHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 28px" align="center">
              <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:9999px;font-size:14px">${escapeHtml(labels.cta)}</a>
              <p style="font-size:11px;color:#7a7a82;margin:16px 0 0">${escapeHtml(labels.footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    labels.heading(name),
    '',
    labels.subheading(task.title, vehicleLabel, scheduledLabel),
    '',
    `→ ${task.title}`,
    task.description ? task.description : '',
    instructions?.checklist?.length
      ? '\n' + instructions.checklist.map((i) => `• ${i}`).join('\n')
      : '',
    '',
    `${labels.cta}: ${ctaUrl}`,
    '',
    labels.footer,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

const LABELS = {
  fr: {
    phaseWarning: 'Rappel',
    phaseUrgent: 'À faire bientôt',
    phaseOverdue: 'En retard',
    subjectWarning: (t: string, v: string) => `Rappel : ${t} planifiée pour ${v}`,
    subjectUrgent: (t: string, v: string) => `Demain : ${t} sur ${v}`,
    subjectOverdue: (t: string, v: string) => `En retard : ${t} sur ${v}`,
    heading: (name: string) => (name ? `Bonjour ${name},` : 'Bonjour,'),
    subheading: (t: string, v: string, d: string) =>
      `Votre ${t.toLowerCase()} sur ${v} est planifiée pour le ${d}.`,
    taskHeader: 'Intervention',
    toolsHeader: 'Outils nécessaires',
    tutorialLink: 'Voir le tutoriel détaillé',
    cta: 'Ouvrir mon agenda Keeper',
    footer:
      'Cet email a été envoyé automatiquement par Keeper. Ne pas répondre.',
  },
  en: {
    phaseWarning: 'Reminder',
    phaseUrgent: 'Due soon',
    phaseOverdue: 'Overdue',
    subjectWarning: (t: string, v: string) => `Reminder: ${t} scheduled on ${v}`,
    subjectUrgent: (t: string, v: string) => `Tomorrow: ${t} on ${v}`,
    subjectOverdue: (t: string, v: string) => `Overdue: ${t} on ${v}`,
    heading: (name: string) => (name ? `Hi ${name},` : 'Hi,'),
    subheading: (t: string, v: string, d: string) =>
      `Your ${t.toLowerCase()} on ${v} is scheduled on ${d}.`,
    taskHeader: 'Service',
    toolsHeader: 'Tools needed',
    tutorialLink: 'View tutorial',
    cta: 'Open my Keeper agenda',
    footer: 'Sent automatically by Keeper. Please do not reply.',
  },
  es: {
    phaseWarning: 'Recordatorio',
    phaseUrgent: 'Próximamente',
    phaseOverdue: 'Atrasado',
    subjectWarning: (t: string, v: string) => `Recordatorio: ${t} programado para ${v}`,
    subjectUrgent: (t: string, v: string) => `Mañana: ${t} en ${v}`,
    subjectOverdue: (t: string, v: string) => `Atrasado: ${t} en ${v}`,
    heading: (name: string) => (name ? `Hola ${name},` : 'Hola,'),
    subheading: (t: string, v: string, d: string) =>
      `Tu ${t.toLowerCase()} en ${v} está programado para el ${d}.`,
    taskHeader: 'Intervención',
    toolsHeader: 'Herramientas necesarias',
    tutorialLink: 'Ver tutorial',
    cta: 'Abrir mi agenda Keeper',
    footer: 'Enviado automáticamente por Keeper. No responda.',
  },
  ar: {
    phaseWarning: 'تذكير',
    phaseUrgent: 'قريباً',
    phaseOverdue: 'متأخر',
    subjectWarning: (t: string, v: string) => `تذكير: ${t} مجدولة في ${v}`,
    subjectUrgent: (t: string, v: string) => `غداً: ${t} على ${v}`,
    subjectOverdue: (t: string, v: string) => `متأخر: ${t} على ${v}`,
    heading: (name: string) => (name ? `مرحباً ${name}،` : 'مرحباً،'),
    subheading: (t: string, v: string, d: string) =>
      `${t} الخاصة بـ ${v} مجدولة في ${d}.`,
    taskHeader: 'الخدمة',
    toolsHeader: 'الأدوات المطلوبة',
    tutorialLink: 'عرض الدليل',
    cta: 'فتح جدول Keeper',
    footer: 'تم الإرسال تلقائياً من Keeper. الرجاء عدم الرد.',
  },
  pt: {
    phaseWarning: 'Lembrete',
    phaseUrgent: 'Em breve',
    phaseOverdue: 'Atrasado',
    subjectWarning: (t: string, v: string) => `Lembrete: ${t} agendada para ${v}`,
    subjectUrgent: (t: string, v: string) => `Amanhã: ${t} em ${v}`,
    subjectOverdue: (t: string, v: string) => `Atrasado: ${t} em ${v}`,
    heading: (name: string) => (name ? `Olá ${name},` : 'Olá,'),
    subheading: (t: string, v: string, d: string) =>
      `O ${t.toLowerCase()} em ${v} está agendado para ${d}.`,
    taskHeader: 'Serviço',
    toolsHeader: 'Ferramentas necessárias',
    tutorialLink: 'Ver tutorial',
    cta: 'Abrir minha agenda Keeper',
    footer: 'Enviado automaticamente pela Keeper. Por favor não responda.',
  },
} as const;

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
