import { NextResponse } from 'next/server';
import { lookupVehicle, detectInputType, isValidFrenchPlate } from '@/lib/vehicle-lookup/router';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { err } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * API Route: Vehicle Lookup — Routeur Intelligent International
 *
 * Accepte :
 * - ?plate=AA-123-AA  (plaque FR, UK, ou autre)
 * - ?vin=WVWZZZ3CZWE...  (VIN 17 caractères)
 * - ?q=<n'importe quoi>  (détection automatique)
 *
 * Cascade : Cache Redis → SIV/DVLA → NHTSA → Erreur gracieuse
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: await err('unauthenticated') }, { status: 401 });
    }

    // ── Rate-limiting (5 requêtes par minute) ──────────────────────
    const rl = await rateLimit(`vlookup:${user.id}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez patienter une minute.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const plate = searchParams.get('plate')?.toUpperCase().replace(/\s/g, '') || '';
    const vin = searchParams.get('vin')?.toUpperCase().replace(/\s/g, '') || '';
    const q = searchParams.get('q')?.toUpperCase().replace(/\s/g, '') || '';

    // Déterminer l'input principal
    const input = vin || plate || q;

    if (!input || input.length < 4) {
      return NextResponse.json(
        { error: await err('plateOrVinRequired') },
        { status: 400 }
      );
    }

    // ── Validation anti-abus côté serveur ──────────────────────────
    // Si c'est clairement une plaque FR, valider le format avant d'appeler l'API payante
    const inputType = detectInputType(input);
    if (inputType === 'plate-fr' && !isValidFrenchPlate(input)) {
      return NextResponse.json(
        { error: await err('invalidFrenchPlate') },
        { status: 422 }
      );
    }

    // ── Routage intelligent ────────────────────────────────────────
    const response = await lookupVehicle(input);

    if (!response.success) {
      // Erreur avec suggestion de fallback pour le frontend
      const status = response.fallback === 'try-vin' ? 404 : 422;
      return NextResponse.json(
        {
          error: response.errorKey ? await err(response.errorKey) : await err('generic'),
          fallback: response.fallback,
          inputType: response.inputType,
        },
        { status }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Lookup API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
