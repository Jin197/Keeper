import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getNearbyFuelPrices } from '@/lib/fuel-prices';

export const dynamic = 'force-dynamic';

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  grade: z.enum(['gasoline', 'gasoline_98', 'e10', 'diesel', 'e85', 'lpg']).default('gasoline'),
  radius: z.coerce.number().min(1).max(25).default(5),
  country: z.string().length(2).optional(),
});

/**
 * GET /api/fuel/nearby?lat=&lng=&grade=&radius=
 * Cheapest stations around a point, from the national open-data feed.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const rl = await rateLimit(`fuel-nearby:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const parsed = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid query' }, { status: 400 });
  }
  const { lat, lng, grade, radius, country } = parsed.data;
  const result = await getNearbyFuelPrices(lat, lng, grade, { radiusKm: radius, country });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
