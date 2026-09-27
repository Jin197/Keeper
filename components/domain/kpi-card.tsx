import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { InfoTip } from '@/components/ui/info-tip';

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  delta?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'glass' | 'premium';
  hint?: string;
  /** Plain-language explanation of how the number is computed (renders an info "?"). */
  explain?: string;
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  delta,
  icon,
  variant = 'default',
  hint,
  explain,
}: KpiCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-eco'
      : trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <Card variant={variant} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {label}
          {explain && <InfoTip text={explain} />}
        </div>
        {icon && (
          <div className="rounded-btn bg-veloce/10 p-1.5 text-veloce">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono font-semibold text-2xl tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground font-mono">{unit}</span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {delta && (
            <span className={cn('flex items-center gap-0.5 font-medium', trendColor)}>
              <TrendIcon className="h-3 w-3" strokeWidth={2} />
              {delta}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
