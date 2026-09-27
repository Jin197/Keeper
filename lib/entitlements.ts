import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/lib/types';

/** Paid tiers and the reverse trial all unlock the full product. */
export function hasPremiumAccess(profile: Pick<UserProfile, 'planTier' | 'isTrial'> | null | undefined): boolean {
  if (!profile) return false;
  return profile.planTier === 'premium' || profile.planTier === 'family' || !!profile.isTrial;
}

/**
 * Whether the caller may download the certified PDF for `vehicleId`.
 * True for premium/trial accounts, or when the vehicle's sale dossier was
 * bought outright (one-off purchase recorded by the Stripe webhook).
 */
export async function canExportCertificate(
  profile: UserProfile | null,
  vehicleId: string,
): Promise<{ allowed: boolean; via: 'premium' | 'purchase' | null }> {
  if (hasPremiumAccess(profile)) return { allowed: true, via: 'premium' };
  const supabase = createClient();
  const { data } = await supabase
    .from('vehicle_purchases')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('kind', 'sale_dossier')
    .limit(1)
    .maybeSingle();
  return data ? { allowed: true, via: 'purchase' } : { allowed: false, via: null };
}

export async function hasSaleDossierPurchase(vehicleId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('vehicle_purchases')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('kind', 'sale_dossier')
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
