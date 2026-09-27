import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getVisionClient } from '@/lib/ocr';
import {
  parseCarteGriseOcr,
  extractToLookupResult,
  type CarteGriseExtract,
} from '@/lib/vehicle-lookup/carte-grise-parser';
import { setCachedLookup } from '@/lib/vehicle-lookup/cache';
import { err } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/**
 * POST /api/vehicles/scan-carte-grise
 *
 * Accepts a multipart file ("file") containing a photo / PDF of a vehicle
 * registration document and returns the parsed fields ready to pre-fill
 * the onboarding form.
 *
 * Pipeline:
 *   1. Auth + rate-limit
 *   2. Google Vision text detection
 *   3. Region-aware parsing (EU harmonised / UK V5C / Maghreb)
 *   4. Cache the result by plate or VIN so a refresh of the page is free
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: await err('unauthenticated') }, { status: 401 });
    }

    const rl = await rateLimit(`cg-scan:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!rl.ok) {
      return NextResponse.json(
        { error: await err('tooManyScans') },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé (${file.type})` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop lourd (max 5 Mo).' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await runVisionOcr(buffer, file.type === 'application/pdf');
    if (!text) {
      return NextResponse.json(
        {
          error:
            await err('unreadableText'),
        },
        { status: 422 },
      );
    }

    const extract: CarteGriseExtract = parseCarteGriseOcr(text);

    if (extract.confidence < 30) {
      return NextResponse.json(
        {
          error:
            await err('docNotRecognised'),
          extract,
          fallback: 'manual-entry',
        },
        { status: 422 },
      );
    }

    // Cache by plate first, fall back to VIN. Non-blocking.
    const lookup = extractToLookupResult(extract);
    if (lookup) {
      const cacheKey = (extract.plate || extract.vin || '')
        .toUpperCase()
        .replace(/[\s-]/g, '');
      if (cacheKey) {
        setCachedLookup(cacheKey, lookup).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      extract,
      lookup,
    });
  } catch (err) {
    console.error('scan-carte-grise error:', err);
    const message = err instanceof Error ? err.message : 'Erreur OCR';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runVisionOcr(buffer: Buffer, isPdf: boolean): Promise<string> {
  const client = getVisionClient();
  if (isPdf) {
    const [response] = await client.batchAnnotateFiles({
      requests: [
        {
          inputConfig: { content: buffer, mimeType: 'application/pdf' },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          pages: [1],
        },
      ],
    });
    const pages = response.responses?.[0]?.responses || [];
    return pages.map((p) => p.fullTextAnnotation?.text || '').join('\n');
  }
  const [result] = await client.textDetection({ image: { content: buffer } });
  return result.fullTextAnnotation?.text ?? '';
}
