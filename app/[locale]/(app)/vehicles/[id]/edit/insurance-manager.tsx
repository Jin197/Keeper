'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  setInsuranceModeAction,
  upsertInsuranceRecordAction,
  deleteInsuranceRecordAction,
} from '@/server/actions/insurance';
import type { InsuranceRecord } from '@/lib/types';

interface Props {
  vehicleId: string;
  currency: string;
  initialMode: 'fixed' | 'variable';
  initialFixedAmount: number | null;
  initialProvider: string;
  onProviderChange: (v: string) => void;
  initialRecords: InsuranceRecord[];
}

export function InsuranceManager({
  vehicleId,
  currency,
  initialMode,
  initialFixedAmount,
  initialProvider,
  onProviderChange,
  initialRecords,
}: Props) {
  const t = useTranslations('insuranceManager');
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'fixed' | 'variable'>(initialMode);
  const [fixedAmount, setFixedAmount] = useState<string>(
    initialFixedAmount != null ? String(initialFixedAmount) : '',
  );
  const [records, setRecords] = useState<InsuranceRecord[]>(initialRecords);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [newMonth, setNewMonth] = useState<string>(thisMonth);
  const [newAmount, setNewAmount] = useState('');

  const handleModeChange = (next: 'fixed' | 'variable') => {
    if (next === mode) return;
    setMode(next);
    startTransition(async () => {
      const res = await setInsuranceModeAction({
        vehicleId,
        mode: next,
        fixedAmount: next === 'fixed' && fixedAmount ? Number(fixedAmount) : null,
      });
      if (res.error) toast.error(res.error);
      else
        toast.success(next === 'fixed' ? t('fixedOn') : t('variableOn'));
    });
  };

  const handleFixedBlur = () => {
    if (mode !== 'fixed') return;
    const amount = Number(fixedAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    startTransition(async () => {
      const res = await setInsuranceModeAction({
        vehicleId,
        mode: 'fixed',
        fixedAmount: amount,
      });
      if (res.error) toast.error(res.error);
    });
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonth || !newAmount) {
      toast.error(t('selectMonthAmount'));
      return;
    }
    const amount = Number(newAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error(t('invalidAmount'));
      return;
    }
    startTransition(async () => {
      const res = await upsertInsuranceRecordAction({
        vehicleId,
        month: newMonth,
        amount,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const monthIso = `${newMonth.slice(0, 7)}-01`;
      setRecords((prev) => {
        const without = prev.filter((r) => r.month !== monthIso);
        return [
          {
            id: res.id ?? crypto.randomUUID(),
            vehicleId,
            userId: '',
            month: monthIso,
            amount,
            currency,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...without,
        ].sort((a, b) => b.month.localeCompare(a.month));
      });
      setNewAmount('');
      toast.success(t('saved'));
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteInsuranceRecordAction(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const total = records.reduce((s, r) => s + r.amount, 0);
  const average =
    records.length > 0 ? Math.round(total / records.length) : null;

  return (
    <Card className="p-5 space-y-5">
      {/* Provider */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('insurer')}</Label>
        <Input
          value={initialProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          placeholder={t('insurerPlaceholder')}
        />
      </div>

      {/* Mode toggle */}
      <div className="space-y-2">
        <Label className="text-xs">{t('premiumType')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('fixed')}
            disabled={pending}
            className={cn(
              'rounded-card border p-3 text-left transition-all',
              mode === 'fixed'
                ? 'border-keeper bg-keeper/5 ring-2 ring-keeper/20'
                : 'border-border bg-card hover:border-border/80',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-keeper" />
              <span className="font-semibold text-sm">{t('fixed')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{t('fixedHint')}</p>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('variable')}
            disabled={pending}
            className={cn(
              'rounded-card border p-3 text-left transition-all',
              mode === 'variable'
                ? 'border-keeper bg-keeper/5 ring-2 ring-keeper/20'
                : 'border-border bg-card hover:border-border/80',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">{t('variable')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{t('variableHint')}</p>
          </button>
        </div>
      </div>

      {/* Fixed-mode amount */}
      {mode === 'fixed' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('monthly', { currency })}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            onBlur={handleFixedBlur}
            placeholder="80"
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">{t('autoSaved')}</p>
        </div>
      )}

      {/* Variable-mode records */}
      {mode === 'variable' && (
        <div className="space-y-3">
          <form
            onSubmit={handleAddRecord}
            className="rounded-card border border-border bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
          >
            <div className="space-y-1">
              <Label className="text-[11px]">{t('month')}</Label>
              <Input
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">{t('amount', { currency })}</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="92.50"
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={pending}
                className="bg-keeper hover:bg-keeper/90 text-white gap-1 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {t('add')}
              </Button>
            </div>
          </form>

          {records.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              {t('empty')}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">
                  {t('summary', { count: records.length, total: formatCurrency(total, currency) })}
                  {average != null && t('average', { avg: formatCurrency(average, currency) })}
                </div>
              </div>
              <div className="rounded-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t('colMonth')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('colAmount')}</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-border/40 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 font-mono">
                          {formatMonth(r.month, locale)}
                        </td>
                        <td className="px-3 py-2 font-mono text-right">
                          {formatCurrency(r.amount, r.currency)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={pending}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                            aria-label={t('delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Badge variant="muted" className="text-[10px]">
                {t('note')}
              </Badge>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function formatMonth(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
