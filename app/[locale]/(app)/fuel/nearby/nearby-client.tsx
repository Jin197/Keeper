'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { LocateFixed, Loader2, MapPin, Navigation, Clock, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { KpiCard } from '@/components/domain/kpi-card';
import { formatPrice } from '@/lib/pricing';
import type { FuelGrade, NearbyFuelResult } from '@/lib/fuel-prices/types';

type ApiResult = NearbyFuelResult | { unavailable: true; country: string | null; reason: 'no-provider' | 'not-configured' };

interface Props {
  defaultGrade: FuelGrade;
  profileCountry: string | null;
  coverage: { country: string; configured: boolean; source: string }[];
}

const GRADES: FuelGrade[] = ['diesel', 'gasoline', 'e10', 'gasoline_98', 'e85', 'lpg'];
const RADII = [3, 5, 10, 20];

export function NearbyFuelClient({ defaultGrade, profileCountry, coverage }: Props) {
  const t = useTranslations('fuelNearby');
  const locale = useLocale();
  const [grade, setGrade] = useState<FuelGrade>(defaultGrade);
  const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'denied' | 'ok'>('idle');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('denied');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('ok');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const fetchPrices = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng), grade, radius: String(radius) });
      const res = await fetch(`/api/fuel/nearby?${qs}`);
      if (!res.ok) throw new Error();
      setResult((await res.json()) as ApiResult);
    } catch {
      setResult({ unavailable: true, country: profileCountry, reason: 'no-provider' });
    } finally {
      setLoading(false);
    }
  }, [coords, grade, radius, profileCountry]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Ask once on mount — most users land here wanting exactly this.
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regionName = (cc: string | null) => {
    if (!cc) return '—';
    try {
      return new Intl.DisplayNames([locale], { type: 'region' }).of(cc) ?? cc;
    } catch {
      return cc;
    }
  };

  const covered = coverage.filter((c) => c.configured).map((c) => regionName(c.country)).join(', ');

  return (
    <div className="space-y-5">
      {/* Controls */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            {t('grade')}
            <Select value={grade} onChange={(e) => setGrade(e.target.value as FuelGrade)}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {t(g)}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            {t('radius')}
            <Select value={String(radius)} onChange={(e) => setRadius(Number(e.target.value))}>
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} {t('km')}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <Button onClick={locate} disabled={geoState === 'locating'} className="gap-2">
          {geoState === 'locating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {geoState === 'locating' ? t('locating') : t('locate')}
        </Button>
      </Card>

      {geoState === 'denied' && <p className="text-sm text-amber-500">{t('denied')}</p>}

      {loading && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}
        </p>
      )}

      {result && 'unavailable' in result && !loading && (
        <Card className="p-5 text-sm text-muted-foreground">
          {result.reason === 'not-configured'
            ? t('notConfigured', { country: regionName(result.country) })
            : t('unsupported', { country: regionName(result.country) })}
          {covered && <span className="block mt-1 text-xs">({covered})</span>}
        </Card>
      )}

      {result && !('unavailable' in result) && !loading && (
        <>
          {result.stations.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">{t('noStations', { radius })}</Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KpiCard
                  label={t('cheapest')}
                  value={formatPrice(result.stations[0].price, result.currency, locale)}
                  hint={`${result.stations[0].name} · ${t('distance', { km: result.stations[0].distanceKm })}`}
                  icon={<TrendingDown className="h-4 w-4 text-eco" />}
                />
                <KpiCard
                  label={t('spread')}
                  value={formatPrice(result.spreadPerLitre, result.currency, locale)}
                  hint={t('spreadHint')}
                />
                <KpiCard
                  label={t('savings')}
                  value={formatPrice(result.savingsPerFillVsMedian, result.currency, locale)}
                  hint={t('savingsHint')}
                  variant="premium"
                />
              </div>

              <Card className="divide-y divide-border">
                {result.stations.map((s, i) => (
                  <div key={s.id} className="p-4 flex items-center gap-4">
                    <div className={`rounded-btn p-2.5 shrink-0 ${i === 0 ? 'bg-eco/15 text-eco' : 'bg-muted text-muted-foreground'}`}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {s.brand ? `${s.brand} · ` : ''}
                        {s.name}
                        {i === 0 && (
                          <Badge variant="success" className="ml-2 text-[9px]">
                            {t('cheapest')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.address}
                        {s.postcode ? `, ${s.postcode}` : ''} {s.city} · {t('distance', { km: s.distanceKm })}
                        {s.isOpen && (
                          <span className="ml-1 inline-flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {t('open24')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold tabular-nums">{formatPrice(s.price, s.currency, locale)}</div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-keeper hover:underline inline-flex items-center gap-1"
                      >
                        <Navigation className="h-3 w-3" /> {t('navigate')}
                      </a>
                    </div>
                  </div>
                ))}
              </Card>
              <p className="text-[11px] text-muted-foreground">
                <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {t('source', { source: result.source })}
                </a>
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
