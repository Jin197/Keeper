import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFuelReceipt } from '@/lib/ocr';
import { rateLimit } from '@/lib/rate-limit';
import { isTrialActive } from '@/lib/trial';
import { err } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FREE_QUOTA = 5; // OCR scans per month for free tier
const RATE_LIMIT_MAX = 30; // per user per minute (defence in depth)
const RATE_LIMIT_WINDOW = 60_000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: await err('unauthenticated') }, { status: 401 });
    }

    // Rate limit per user
    const rl = await rateLimit(`ocr:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!rl.ok) {
      return NextResponse.json(
        { error: await err('rateLimited') },
        { status: 429 },
      );
    }

    // Premium gate: free tier has FREE_QUOTA / month
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, ocr_credits_used, created_at')
      .eq('id', user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const isTrial = isTrialActive(profile.created_at ?? undefined, profile.plan_tier);
    const isPremium = profile.plan_tier === 'premium' || profile.plan_tier === 'family' || isTrial;

    if (
      !isPremium &&
      (profile.ocr_credits_used ?? 0) >= FREE_QUOTA
    ) {
      return NextResponse.json(
        {
          error: `Quota gratuit dépassé (${FREE_QUOTA}/mois). Passez Premium pour un OCR illimité.`,
        },
        { status: 402 },
      );
    }

    // Parse multipart
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé (${file.type})` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop lourd (max 5 Mo)` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseFuelReceipt(buffer);

    // Log credit consumption in audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ocr.scan',
      entity_type: 'profile',
      entity_id: user.id,
      payload: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        plan_tier: profile.plan_tier,
        credits_used_before: profile.ocr_credits_used ?? 0,
      },
    });

    // Increment OCR usage for free tier
    if (profile.plan_tier === 'free') {
      await supabase
        .from('profiles')
        .update({ ocr_credits_used: (profile.ocr_credits_used ?? 0) + 1 })
        .eq('id', user.id);
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur OCR';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
