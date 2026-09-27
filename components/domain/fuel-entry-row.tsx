'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Fuel, Zap, ScanLine, Hand } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FuelEntry } from '@/lib/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

export function FuelEntryRow({ entry }: { entry: FuelEntry }) {
  const t = useTranslations('components');
  const locale = useLocale();
  const isElectric = entry.energyType === 'electric';
  const Icon = isElectric ? Zap : Fuel;
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/40 rounded-card transition-colors">
      <div
        className={`shrink-0 rounded-btn p-2.5 ${isElectric ? 'bg-eco/10 text-eco' : 'bg-amber-500/10 text-amber-500'}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium truncate">
          {entry.stationName}
          {entry.stationCity && (
            <span className="text-muted-foreground font-normal">
              · {entry.stationCity}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{formatDate(entry.occurredAt, locale)}</span>
          <span>·</span>
          <span className="font-mono tabular-nums">
            {formatNumber(entry.quantity, locale, { maximumFractionDigits: 1 })} {entry.unit}
          </span>
          {entry.ocrSource === 'ocr' ? (
            <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
              <ScanLine className="h-2.5 w-2.5" /> OCR
            </Badge>
          ) : (
            <Badge variant="muted" className="text-[10px] px-1.5 py-0 h-4">
              <Hand className="h-2.5 w-2.5" /> {t('manual')}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono font-semibold tabular-nums">
          {formatCurrency(entry.totalPrice, entry.currency)}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {formatCurrency(entry.unitPrice, entry.currency)}/{entry.unit}
        </div>
      </div>
    </div>
  );
}
