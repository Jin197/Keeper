'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ExternalLink,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { KpiCard } from '@/components/domain/kpi-card';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import type {
  TrafficFine,
  FineStatus,
  InfractionCategory,
} from '@/lib/types';
import {
  calculateFineMetrics,
  currentAmountDue,
  daysUntilNextThreshold,
  URGENT_THRESHOLD_DAYS,
} from '@/lib/computations/fines';
import {
  addFineManuallyAction,
  markFineAsPaidAction,
  contestFineAction,
  type AddFineInput,
} from '@/server/actions/fines';

const ANTAI_BASE_URL = 'https://www.antai.gouv.fr/';

interface Props {
  vehicleId: string;
  fines: TrafficFine[];
  totalVehicleSpend: number;
  currency?: string;
}

export function FineTrackerPanel({
  vehicleId,
  fines,
  totalVehicleSpend,
  currency = 'EUR',
}: Props) {
  const metrics = useMemo(
    () => calculateFineMetrics(fines, totalVehicleSpend),
    [fines, totalVehicleSpend],
  );
  const [openAdd, setOpenAdd] = useState(false);
  const [openContest, setOpenContest] = useState<TrafficFine | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Solde de points"
          value={String(metrics.pointsLeft)}
          unit={`/ 12`}
          variant={metrics.pointsLeft <= 4 ? 'premium' : 'default'}
          icon={<Scale className="h-4 w-4" />}
          hint="Estimation déclarative — solde de votre permis"
        />
        <KpiCard
          label="Pertes sèches"
          value={formatCurrency(metrics.totalCost, currency)}
          variant={metrics.totalCost > 0 ? 'glass' : 'default'}
          icon={<Receipt className="h-4 w-4" />}
          hint="Amendes payées + montants dus actuels"
        />
        <KpiCard
          label="Impact sur le TCO"
          value={`${metrics.impactRatioPct}`}
          unit="%"
          variant="default"
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="Part des amendes dans vos dépenses véhicule"
        />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display font-semibold text-base">
              Historique des amendes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fines.length === 0
                ? "Aucune amende enregistrée."
                : `${fines.length} amende${fines.length > 1 ? 's' : ''} suivie${fines.length > 1 ? 's' : ''}`}
              {metrics.outstanding.count > 0 && (
                <>
                  {' · '}
                  <span className="text-amber-500">
                    {metrics.outstanding.count} impayée
                    {metrics.outstanding.count > 1 ? 's' : ''} (
                    {formatCurrency(metrics.outstanding.total, currency)})
                  </span>
                </>
              )}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpenAdd(true)}
            className="bg-keeper hover:bg-keeper/90 text-white rounded-full gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une amende
          </Button>
        </div>

        {fines.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2.5 pr-3 font-medium">Notification</th>
                  <th className="py-2.5 pr-3 font-medium">Catégorie</th>
                  <th className="py-2.5 pr-3 font-medium">Statut</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Points</th>
                  <th className="py-2.5 pr-3 font-medium text-right">
                    Initial
                  </th>
                  <th className="py-2.5 pr-3 font-medium text-right">À régler</th>
                  <th className="py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((fine) => (
                  <FineRow
                    key={fine.id}
                    fine={fine}
                    currency={currency}
                    onContest={() => setOpenContest(fine)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-5 text-[10px] text-muted-foreground/60 italic">
          Données déclaratives. Keeper n'est pas affilié à l'ANTAI. Les
          calculs sont indicatifs.
        </p>
      </Card>

      <AnimatePresence>
        {openAdd && (
          <AddFineModal
            vehicleId={vehicleId}
            currency={currency}
            onClose={() => setOpenAdd(false)}
          />
        )}
        {openContest && (
          <ContestFineModal
            fine={openContest}
            onClose={() => setOpenContest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────

function FineRow({
  fine,
  currency,
  onContest,
}: {
  fine: TrafficFine;
  currency: string;
  onContest: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const due = currentAmountDue(fine);
  const daysLeft = daysUntilNextThreshold(fine);
  const isUrgent =
    fine.status === 'unpaid' &&
    daysLeft !== null &&
    daysLeft <= URGENT_THRESHOLD_DAYS;

  const handleMarkPaid = () => {
    startTransition(async () => {
      const res = await markFineAsPaidAction({
        fineId: fine.id,
        amountPaid: due,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Amende marquée comme payée.');
    });
  };

  const openAntai = () => {
    const params = new URLSearchParams();
    if (fine.noticeNumber) params.set('numero', fine.noticeNumber);
    if (fine.documentKey) params.set('cle', fine.documentKey);
    const url =
      params.toString().length > 0
        ? `${ANTAI_BASE_URL}?${params.toString()}`
        : ANTAI_BASE_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!fine.noticeNumber || !fine.documentKey) {
      toast.info(
        "Saisis ton numéro d'avis sur la page ANTAI — Keeper ne peut pas pré-remplir tant qu'il n'est pas connu.",
      );
    }
  };

  return (
    <tr
      className={cn(
        'border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30',
        fine.status === 'cancelled' && 'opacity-50 line-through',
      )}
    >
      <td className="py-3 pr-3 align-top">
        <div className="text-sm font-mono">{formatDate(fine.notificationDate)}</div>
        {fine.infractionDate && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Infraction · {formatDate(fine.infractionDate)}
          </div>
        )}
      </td>
      <td className="py-3 pr-3 align-top">
        <span className="text-sm">{labelForCategory(fine.category)}</span>
        {fine.noticeNumber && (
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
            N° {fine.noticeNumber}
          </div>
        )}
      </td>
      <td className="py-3 pr-3 align-top">
        <StatusBadge status={fine.status} isUrgent={isUrgent} />
        {isUrgent && daysLeft !== null && (
          <div className="text-[10px] text-destructive font-semibold mt-1">
            Majoration dans {daysLeft}j
          </div>
        )}
      </td>
      <td className="py-3 pr-3 align-top text-right font-mono text-sm">
        {fine.pointsDeducted > 0 ? `-${fine.pointsDeducted}` : '—'}
      </td>
      <td className="py-3 pr-3 align-top text-right font-mono text-sm">
        {formatCurrency(fine.amountInitial, currency)}
      </td>
      <td className="py-3 pr-3 align-top text-right">
        <div
          className={cn(
            'font-mono text-sm font-semibold',
            fine.status === 'unpaid' && due > fine.amountInitial && 'text-destructive',
          )}
        >
          {formatCurrency(due, currency)}
        </div>
      </td>
      <td className="py-3 align-top text-right">
        {fine.status === 'unpaid' && (
          <div className="flex justify-end gap-1.5 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openAntai}
              className="h-7 text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Payer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleMarkPaid}
              disabled={pending}
              className="h-7 text-xs"
            >
              Marquer payée
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onContest}
              className="h-7 text-xs"
            >
              Contester
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Status badge ──────────────────────────────────────────────────

function StatusBadge({ status, isUrgent }: { status: FineStatus; isUrgent: boolean }) {
  const map: Record<
    FineStatus,
    { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' | 'default' }
  > = {
    unpaid: { label: 'Impayée', variant: isUrgent ? 'danger' : 'warning' },
    paid_minored: { label: 'Payée minorée', variant: 'success' },
    paid_normal: { label: 'Payée', variant: 'success' },
    paid_majored: { label: 'Payée majorée', variant: 'warning' },
    paid_late_majored: { label: 'Payée tardivement', variant: 'danger' },
    contested: { label: 'Contestée', variant: 'default' },
    cancelled: { label: 'Annulée', variant: 'muted' },
  };
  const entry = map[status];
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function labelForCategory(c: InfractionCategory): string {
  const labels: Record<InfractionCategory, string> = {
    speeding: 'Excès de vitesse',
    parking: 'Stationnement',
    bus_lane: 'Voie de bus',
    red_light: 'Feu rouge',
    phone_driving: 'Téléphone au volant',
    seatbelt: 'Ceinture',
    alcohol: 'Alcool',
    drugs: 'Stupéfiants',
    other: 'Autre',
  };
  return labels[c];
}

// ─── Empty state ───────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-4 rounded-card border border-dashed border-border/60 bg-muted/10 px-6 py-10 text-center">
      <ShieldCheck className="mx-auto h-7 w-7 text-eco mb-3" strokeWidth={1.5} />
      <p className="text-sm font-medium">Aucune amende enregistrée.</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        Dès que vous recevez un avis ANTAI, ajoutez-le ici pour suivre les
        échéances, les points et l'impact sur votre TCO.
      </p>
    </div>
  );
}

// ─── Add fine modal ────────────────────────────────────────────────

function AddFineModal({
  vehicleId,
  currency,
  onClose,
}: {
  vehicleId: string;
  currency: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().split('T')[0];
  const [category, setCategory] = useState<InfractionCategory>('speeding');
  const [infractionDate, setInfractionDate] = useState(today);
  const [notificationDate, setNotificationDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [points, setPoints] = useState('0');
  const [notice, setNotice] = useState('');
  const [docKey, setDocKey] = useState('');
  const [status, setStatus] = useState<FineStatus>('unpaid');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: AddFineInput = {
      vehicleId,
      category,
      infractionDate,
      notificationDate,
      status,
      pointsDeducted: Number(points || 0),
      amountInitial: Number(amount || 0),
      noticeNumber: notice || null,
      documentKey: docKey || null,
    };
    startTransition(async () => {
      const res = await addFineManuallyAction(input);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Amende ajoutée.');
      onClose();
    });
  };

  return (
    <ModalShell title="Ajouter une amende" onClose={onClose} disabled={pending}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Catégorie</Label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as InfractionCategory)
              }
              className="w-full rounded-btn border border-border bg-card px-3 py-1.5 text-sm"
            >
              <option value="speeding">Excès de vitesse</option>
              <option value="parking">Stationnement</option>
              <option value="bus_lane">Voie de bus</option>
              <option value="red_light">Feu rouge</option>
              <option value="phone_driving">Téléphone au volant</option>
              <option value="seatbelt">Ceinture</option>
              <option value="alcohol">Alcool</option>
              <option value="drugs">Stupéfiants</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Statut</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FineStatus)}
              className="w-full rounded-btn border border-border bg-card px-3 py-1.5 text-sm"
            >
              <option value="unpaid">Impayée</option>
              <option value="paid_minored">Payée minorée</option>
              <option value="paid_normal">Payée normale</option>
              <option value="paid_majored">Payée majorée</option>
              <option value="paid_late_majored">Payée tardivement</option>
              <option value="contested">Contestée</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date d'infraction</Label>
            <Input
              type="date"
              value={infractionDate}
              onChange={(e) => setInfractionDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date de notification</Label>
            <Input
              type="date"
              value={notificationDate}
              onChange={(e) => setNotificationDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Montant initial ({currency})
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Points retirés (0-6)</Label>
            <Input
              type="number"
              min={0}
              max={6}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Numéro d'avis (optionnel)</Label>
            <Input
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              placeholder="Le numéro figure en haut à droite de l'avis"
              className="font-mono"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Clé du document (optionnel)</Label>
            <Input
              value={docKey}
              onChange={(e) => setDocKey(e.target.value)}
              placeholder="6 caractères situés sous le numéro d'avis"
              className="font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-keeper hover:bg-keeper/90 text-white"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Contest modal ─────────────────────────────────────────────────

function ContestFineModal({
  fine,
  onClose,
}: {
  fine: TrafficFine;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      toast.error('Indiquez une raison (10 caractères minimum).');
      return;
    }
    startTransition(async () => {
      const res = await contestFineAction({ fineId: fine.id, reason });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Amende marquée comme contestée.');
      onClose();
    });
  };

  return (
    <ModalShell
      title="Contester l'amende"
      onClose={onClose}
      disabled={pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          La contestation officielle se fait sur antai.gouv.fr. Keeper
          enregistre votre raison pour votre suivi personnel.
        </p>
        <div className="space-y-1">
          <Label className="text-xs">Raison</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            className="w-full rounded-card border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Décrivez les circonstances ou les éléments justifiant votre contestation."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer la contestation'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Shared modal shell ────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  disabled,
  children,
}: {
  title: string;
  onClose: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={() => !disabled && onClose()}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-card border border-border bg-card shadow-elevated overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}
