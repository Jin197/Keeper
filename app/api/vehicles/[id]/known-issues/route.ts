import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVehicle, getProfile } from '@/lib/data';
import { getKnownIssues } from '@/lib/vehicle-data/known-issues';

export const dynamic = 'force-dynamic';

/** GET /api/vehicles/:id/known-issues — official recalls, complaints, MOT history. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const [vehicle, profile] = await Promise.all([getVehicle(id), getProfile()]);
  if (!vehicle || vehicle.userId !== user.id) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }
  const report = await getKnownIssues(vehicle, profile?.country);
  return NextResponse.json(report, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
