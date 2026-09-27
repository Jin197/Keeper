'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface EnergyMixProps {
  thermal: number;
  electric: number;
  thermalVolume?: number;
  electricVolume?: number;
}

export function EnergyMix({ thermal, electric, thermalVolume = 0, electricVolume = 0 }: EnergyMixProps) {
  const t = useTranslations('components');
  const data = [
    { key: 'thermal', name: t('thermal'), value: Math.round(thermal * 100), color: '#F59E0B' },
    { key: 'electric', name: t('electric'), value: Math.round(electric * 100), color: '#2ECC71' },
  ];

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number) => `${v}%`}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mix</div>
          <div className="font-mono text-sm font-semibold">{data[1].value}%</div>
          <div className="text-[10px] text-eco">{t('electricShort')}</div>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm flex-1">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
            </div>
            <div className="font-mono tabular-nums text-right flex items-center gap-1.5">
              <span className="font-semibold">{d.value}%</span>
              {d.key === 'thermal' && thermalVolume > 0 && (
                <span className="text-[10px] text-muted-foreground">({thermalVolume.toFixed(0)} L)</span>
              )}
              {d.key === 'electric' && electricVolume > 0 && (
                <span className="text-[10px] text-muted-foreground">({electricVolume.toFixed(0)} kWh)</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
