import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';
import { getMaintenanceEntries, getVehicles, getProfile } from '@/lib/data';
import { err } from '@/lib/errors';
import { translatorFor, intlTagFor } from '@/lib/i18n/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VELOCE = rgb(0, 0.478, 1);
const ECO = rgb(0.18, 0.8, 0.443);
const ANTHRA = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.45, 0.45, 0.45);

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: await err('unauthenticated') }, { status: 401 });
  }

  // Premium gate
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: await err('profileNotFound') }, { status: 404 });
  }
  if (profile.planTier !== 'premium' && profile.planTier !== 'family' && !profile.isTrial) {
    return NextResponse.json(
      { error: await err('exportProOnly') },
      { status: 402 },
    );
  }

  const [entries, vehicles] = await Promise.all([
    getMaintenanceEntries(),
    getVehicles(),
  ]);

  // The document follows the account's language, like the per-vehicle dossier.
  const t = translatorFor(profile.locale, 'logPdf');
  const intl = intlTagFor(profile.locale);

  const pdf = await PDFDocument.create();
  pdf.setTitle(t('docTitle', { name: profile.fullName }));
  pdf.setAuthor('Velocewealth');
  pdf.setSubject(t('subject'));
  pdf.setProducer('Velocewealth');
  pdf.setCreator('Velocewealth');
  pdf.setCreationDate(new Date());

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 50;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const drawHeader = () => {
    page.drawText('VELOCEWEALTH', {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: VELOCE,
    });
    page.drawText(t('title'), {
      x: margin,
      y: y - 18,
      size: 18,
      font: fontBold,
      color: ANTHRA,
    });
    page.drawText(
      t('generated', {
        date: new Date().toLocaleDateString(intl, { day: '2-digit', month: 'long', year: 'numeric' }),
        name: profile.fullName,
      }),
      {
        x: margin,
        y: y - 36,
        size: 9,
        font,
        color: MUTED,
      },
    );
    y -= 60;
  };

  const drawIntegrityBox = () => {
    const head = entries[0];
    const boxH = 70;
    page.drawRectangle({
      x: margin,
      y: y - boxH,
      width: A4.w - 2 * margin,
      height: boxH,
      color: rgb(0.91, 0.97, 0.94),
      borderColor: ECO,
      borderWidth: 0.5,
    });
    page.drawText(t('integrity'), {
      x: margin + 12,
      y: y - 18,
      size: 11,
      font: fontBold,
      color: ANTHRA,
    });
    page.drawText(
      t('headHash', { hash: head?.hash.slice(0, 32) ?? t('noHash') }),
      {
        x: margin + 12,
        y: y - 34,
        size: 8,
        font: fontMono,
        color: ANTHRA,
      },
    );
    page.drawText(
      t('chained', { count: entries.length }),
      {
        x: margin + 12,
        y: y - 48,
        size: 9,
        font,
        color: MUTED,
      },
    );
    page.drawText(
      t('locked'),
      {
        x: margin + 12,
        y: y - 60,
        size: 8,
        font,
        color: MUTED,
      },
    );
    y -= boxH + 20;
  };

  const drawEntry = (e: (typeof entries)[number]) => {
    const blockH = 80;
    if (y - blockH < margin) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
    const v = vehicles.find((veh) => veh.id === e.vehicleId);
    const date = new Date(e.occurredAt).toLocaleDateString(intl, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    page.drawText(date, { x: margin, y, size: 9, font: fontBold, color: VELOCE });
    page.drawText(`${e.mileageKm.toLocaleString(intl)} km`, {
      x: margin + 90,
      y,
      size: 9,
      font,
      color: MUTED,
    });
    page.drawText(`${e.cost.toFixed(2)} ${e.currency}`, {
      x: A4.w - margin - 80,
      y,
      size: 11,
      font: fontBold,
      color: ANTHRA,
    });
    page.drawText(e.description.slice(0, 70), {
      x: margin,
      y: y - 14,
      size: 11,
      font: fontBold,
      color: ANTHRA,
    });
    page.drawText(
      `${v ? `${v.make} ${v.model} · ${v.plate}` : ''} · ${e.garageName}`,
      {
        x: margin,
        y: y - 28,
        size: 9,
        font,
        color: MUTED,
      },
    );
    page.drawText(`hash: ${e.hash.slice(0, 32)}…`, {
      x: margin,
      y: y - 42,
      size: 7,
      font: fontMono,
      color: MUTED,
    });
    // Separator
    page.drawLine({
      start: { x: margin, y: y - 56 },
      end: { x: A4.w - margin, y: y - 56 },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= blockH;
  };

  drawHeader();
  drawIntegrityBox();

  if (entries.length === 0) {
    page.drawText(t('empty'), {
      x: margin,
      y,
      size: 11,
      font,
      color: MUTED,
    });
  } else {
    for (const e of entries) {
      drawEntry(e);
    }
  }

  // Footer on each page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(t('page', { current: i + 1, total: pages.length }), {
      x: margin,
      y: 30,
      size: 8,
      font,
      color: MUTED,
    });
    p.drawText('velocewealth.app', {
      x: A4.w - margin - 80,
      y: 30,
      size: 8,
      font,
      color: VELOCE,
    });
  });

  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes) as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${t('filename')}-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
