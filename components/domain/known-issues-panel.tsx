import { getTranslations, getLocale } from 'next-intl/server';
import { AlertTriangle, ShieldCheck, Info, FileSearch, Megaphone, Users, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KnownIssuesReport, KnownIssueHighlight } from '@/lib/vehicle-data/known-issues';
import { SYSTEM_LABEL_KEY, type ModelFailureProfile } from '@/lib/vehicle-data/failure-rates';

interface Props {
  report: KnownIssuesReport;
  /** Compact = highlights only (vehicle overview). Full = every source block (health page). */
  variant?: 'compact' | 'full';
}

/**
 * What public authorities have recorded about this car / model. Server
 * component: the report is fetched by the page, so this stays a pure view.
 */
export async function KnownIssuesPanel({ report, variant = 'compact' }: Props) {
  const t = await getTranslations('knownIssues');
  const locale = await getLocale();
  const { mot, nhtsa, highlights, failureProfile } = report;
  const hasAnything = Boolean(mot) || Boolean(nhtsa && (nhtsa.recalls.length || nhtsa.complaintsTotal)) || Boolean(failureProfile);

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-keeper" />
            {t('title')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {mot && <Badge variant="outline">{t('sourceMot')}</Badge>}
          {nhtsa && <Badge variant="outline">{report.nhtsaIsPrimary ? t('sourceNhtsa') : t('sourceNhtsaProxy')}</Badge>}
        </div>
      </div>

      {report.country === 'GB' && !report.motAvailable && (
        <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-btn p-3">{t('motNotConfigured')}</p>
      )}

      {!hasAnything && <p className="text-sm text-muted-foreground">{t('empty')}</p>}

      {/* Headline stats */}
      {hasAnything && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mot && (
            <>
              <Stat
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label={t('motTests', { count: mot.tests.length, year: mot.tests.at(-1)?.completedDate.slice(0, 4) ?? '' })}
                value={t('motFailRate', { pct: Math.round(mot.failRate * 100) })}
              />
              {mot.motExpiryDate && (
                <Stat icon={<CalendarClock className="h-3.5 w-3.5" />} label={t('motExpiry', { date: fmtDate(mot.motExpiryDate) })} value={fmtDate(mot.motExpiryDate)} />
              )}
              {mot.annualMileageKm && (
                <Stat icon={<Info className="h-3.5 w-3.5" />} label={t('motMileage', { km: mot.annualMileageKm.toLocaleString(locale) })} value={`${Math.round(mot.annualMileageKm / 1000)}k km`} />
              )}
            </>
          )}
          {nhtsa && (
            <>
              <Stat
                icon={<Megaphone className="h-3.5 w-3.5" />}
                label={nhtsa.recalls.length ? t('recalls', { count: nhtsa.recalls.length }) : t('noRecalls')}
                value={String(nhtsa.recalls.length)}
                tone={nhtsa.recalls.length ? 'critical' : 'ok'}
              />
              <Stat icon={<Users className="h-3.5 w-3.5" />} label={t('complaints', { count: nhtsa.complaintsTotal })} value={String(nhtsa.complaintsTotal)} />
            </>
          )}
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <ul className="space-y-2">
          {(variant === 'compact' ? highlights.slice(0, 5) : highlights).map((h, i) => (
            <HighlightRow key={`${h.kind}-${i}`} h={h} labels={{ critical: t('severityCritical'), warning: t('severityWarning'), info: t('severityInfo') }} />
          ))}
        </ul>
      )}

      {/* Population base rates (DVSA) — shown in both variants: it is the layer nobody else has. */}
      {failureProfile && <FailureStats profile={failureProfile} compact={variant === 'compact'} />}

      {/* Full detail blocks */}
      {variant === 'full' && mot && mot.recentIssues.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('recentIssues')}</h3>
          <ul className="text-sm space-y-1.5">
            {mot.recentIssues.map((d, i) => (
              <li key={i} className="flex gap-2">
                <Badge variant={d.type === 'DANGEROUS' || d.type === 'MAJOR' || d.type === 'FAIL' ? 'danger' : d.type === 'MINOR' ? 'warning' : 'outline'} className="shrink-0 text-[9px]">
                  {d.type}
                </Badge>
                <span className="text-muted-foreground">{d.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {variant === 'full' && mot && mot.recurringAdvisories.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('recurring')}</h3>
          <p className="text-xs text-muted-foreground">{t('recurringHint')}</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {mot.recurringAdvisories.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {variant === 'full' && nhtsa && nhtsa.recalls.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('recalls', { count: nhtsa.recalls.length })}</h3>
          <ul className="space-y-3">
            {nhtsa.recalls.map((r) => (
              <li key={r.campaignNumber} className="rounded-btn border border-destructive/20 bg-destructive/5 p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.component}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.campaignNumber}{r.reportDate ? ` · ${fmtDate(r.reportDate)}` : ''}</span>
                </div>
                <p className="text-muted-foreground text-xs">{r.summary}</p>
                {r.remedy && (
                  <p className="text-xs">
                    <span className="font-medium">{t('recallRemedy')}: </span>
                    <span className="text-muted-foreground">{r.remedy}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {variant === 'full' && nhtsa && nhtsa.complaintClusters.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('complaintClusters')}</h3>
          <ul className="space-y-2">
            {nhtsa.complaintClusters.map((c) => (
              <li key={c.component} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.component}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.count} · {Math.round(c.share * 100)}%
                    {c.medianOdometerKm ? ` · ${t('complaintAround', { km: Math.round(c.medianOdometerKm / 1000) })}` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.max(4, Math.round(c.share * 100))}%` }} />
                </div>
                {c.sample && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">“{c.sample}”</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[10px] text-muted-foreground">{t('lastUpdated')}</p>
    </Card>
  );
}

function Stat({ icon, label, value, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: string; tone?: 'neutral' | 'critical' | 'ok' }) {
  const color = tone === 'critical' ? 'text-destructive' : tone === 'ok' ? 'text-eco' : 'text-foreground';
  return (
    <div className="rounded-btn border border-border bg-muted/30 p-3">
      <div className={`font-mono text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
        {icon}
        <span className="line-clamp-2">{label}</span>
      </div>
    </div>
  );
}

function HighlightRow({ h, labels }: { h: KnownIssueHighlight; labels: Record<KnownIssueHighlight['severity'], string> }) {
  const styles =
    h.severity === 'critical'
      ? { wrap: 'border-destructive/30 bg-destructive/5', badge: 'danger' as const, Icon: AlertTriangle, iconColor: 'text-destructive' }
      : h.severity === 'warning'
        ? { wrap: 'border-amber-500/30 bg-amber-500/5', badge: 'warning' as const, Icon: AlertTriangle, iconColor: 'text-amber-500' }
        : { wrap: 'border-border', badge: 'outline' as const, Icon: Info, iconColor: 'text-muted-foreground' };
  const { Icon } = styles;
  return (
    <li className={`rounded-btn border p-3 flex items-start gap-3 ${styles.wrap}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${styles.iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{h.title}</span>
          <Badge variant={styles.badge} className="text-[9px]">
            {labels[h.severity]}
          </Badge>
        </div>
        {h.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{h.detail}</p>}
      </div>
    </li>
  );
}

async function FailureStats({ profile, compact }: { profile: ModelFailureProfile; compact: boolean }) {
  const t = await getTranslations('knownIssues');
  const locale = await getLocale();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const shown = (compact ? profile.systems.slice(0, 4) : profile.systems.filter((s) => s.system !== 'other')).filter((s) => s.rate > 0);
  const max = Math.max(0.05, ...shown.map((s) => Math.max(s.rate, s.fleetRate ?? 0)));

  return (
    <section className="rounded-btn border border-keeper/20 bg-keeper/5 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{t('statsTitle')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {profile.basis === 'model'
            ? t('statsSubtitle', {
                tests: profile.tests.toLocaleString(locale),
                model: `${profile.make} ${profile.model}`,
                band: profile.kmBand,
                age: profile.ageBand ? t('statsAge', { age: profile.ageBand }) : '',
              })
            : t('statsFleetOnly', { band: profile.kmBand })}
        </p>
      </div>

      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-mono text-2xl font-semibold tabular-nums">{pct(profile.overallRate)}</span>
        <span className="text-muted-foreground">{t('statsOverall')}</span>
        {profile.fleetOverallRate != null && profile.basis === 'model' && (
          <span className="text-xs text-muted-foreground">
            · {t('statsFleet')} {pct(profile.fleetOverallRate)}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {shown.map((s) => {
          const worse = s.ratio != null && s.ratio >= 1.3;
          return (
            <li key={s.system} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t(SYSTEM_LABEL_KEY[s.system])}</span>
                <span className="font-mono tabular-nums">
                  {pct(s.rate)}
                  {worse && <span className="ml-1.5 text-amber-500">{t('worseThanFleet', { ratio: s.ratio!.toFixed(1) })}</span>}
                </span>
              </div>
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                <div className={`h-full ${worse ? 'bg-amber-500' : 'bg-keeper'}`} style={{ width: `${Math.max(3, (s.rate / max) * 100)}%` }} />
                {s.fleetRate != null && (
                  <div className="absolute top-0 h-full w-px bg-foreground/60" style={{ left: `${Math.min(99, (s.fleetRate / max) * 100)}%` }} title={`${t('statsFleet')} ${pct(s.fleetRate)}`} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground">{t('statsSource', { years: profile.sourceYears ?? '' })}</p>
    </section>
  );
}
