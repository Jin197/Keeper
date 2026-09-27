'use client';

import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface SpendChartProps {
  data: { label: string; total: number; energy: number; maint: number; insurance?: number }[];
  currency?: string;
}

export function SpendChart({ data, currency = 'EUR' }: SpendChartProps) {
  const t = useTranslations('insights');
  const hasInsurance = data.some((d) => d.insurance !== undefined && d.insurance > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="energy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#007AFF" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="maint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="insurance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5A059" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#C5A059" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            stroke="currentColor"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            stroke="currentColor"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            tickFormatter={(v) => `${v}€`}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value: number) => `${value.toFixed(2)} ${currency}`}
          />
          {hasInsurance && (
            <Area
              type="monotone"
              dataKey="insurance"
              stackId="1"
              stroke="#C5A059"
              fill="url(#insurance)"
              strokeWidth={2}
              name={t('chartInsurance')}
            />
          )}
          <Area
            type="monotone"
            dataKey="energy"
            stackId="1"
            stroke="#007AFF"
            fill="url(#energy)"
            strokeWidth={2}
            name={t('chartEnergy')}
          />
          <Area
            type="monotone"
            dataKey="maint"
            stackId="1"
            stroke="#2ECC71"
            fill="url(#maint)"
            strokeWidth={2}
            name={t('chartMaintenance')}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
