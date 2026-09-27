import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/domain/page-header';
import { BackLink } from '@/components/layout/back-link';
import { getProfile, getVehicles } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';
import { fuelPriceCountries } from '@/lib/fuel-prices';
import { NearbyFuelClient } from './nearby-client';
import type { FuelGrade } from '@/lib/fuel-prices/types';

export const dynamic = 'force-dynamic';

export default async function NearbyFuelPage() {
  const t = await getTranslations('fuelNearby');
  const tNav = await getTranslations('nav');
  const [profile, vehicles] = isSupabaseConfigured()
    ? await Promise.all([getProfile(), getVehicles()])
    : [null, []];

  // Default grade from the first thermal vehicle's most recent energy type
  // is a nicety we don't have here (fuel entries are per vehicle); diesel vs
  // petrol is the split that matters and the user can switch in one tap.
  const defaultGrade: FuelGrade = vehicles.some((v) => v.fuelType === 'electric') && vehicles.every((v) => v.fuelType === 'electric')
    ? 'gasoline'
    : 'diesel';

  return (
    <div className="container py-6 lg:py-8 space-y-6">
      <BackLink href="/dashboard" label={tNav('home')} />
      <PageHeader title={t('title')} description={t('subtitle')} />
      <NearbyFuelClient
        defaultGrade={defaultGrade}
        profileCountry={profile?.country ?? null}
        coverage={fuelPriceCountries()}
      />
    </div>
  );
}
