'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduleTaskModal } from '@/components/domain/schedule-task-modal';
import {
  dismissTaskAction,
  snoozeTaskAction,
  completeTaskAction,
} from '@/server/actions/maintenance-tasks';
import type { MaintenanceTaskRecord } from '@/lib/types';

interface Props {
  task: MaintenanceTaskRecord;
}

export function AgendaActions({ task }: Props) {
  const t = useTranslations('agenda');
  const [pending, startTransition] = useTransition();
  const [openSchedule, setOpenSchedule] = useState(false);

  const handleSnooze = () => {
    const until = new Date();
    until.setDate(until.getDate() + 14);
    const iso = until.toISOString().slice(0, 10);
    startTransition(async () => {
      const res = await snoozeTaskAction({ taskId: task.id, until: iso });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('snoozedToast'));
    });
  };

  const handleDismiss = () => {
    startTransition(async () => {
      const res = await dismissTaskAction({ taskId: task.id });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('dismissedToast'));
    });
  };

  const handleComplete = () => {
    const mileageStr = window.prompt(t('promptMileage', { title: task.title }), '');
    if (!mileageStr) return;
    const mileage = Number(mileageStr);
    if (!Number.isFinite(mileage) || mileage < 0) {
      toast.error(t('invalidMileage'));
      return;
    }
    const costStr = window.prompt(t('promptCost'), '0');
    if (costStr === null) return;
    const cost = Number(costStr);
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error(t('invalidCost'));
      return;
    }
    const garage = window.prompt(t('promptGarage'), task.garageName || '');
    if (!garage || garage.trim().length === 0) {
      toast.error(t('garageRequired'));
      return;
    }
    startTransition(async () => {
      const res = await completeTaskAction({
        taskId: task.id,
        mileageKm: mileage,
        cost,
        garageName: garage.trim(),
        description: task.title,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('completedToast'));
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {task.status !== 'scheduled' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpenSchedule(true)}
          disabled={pending}
          className="h-7 text-xs"
        >
          {t('schedule')}
        </Button>
      )}
      {task.status === 'scheduled' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpenSchedule(true)}
          disabled={pending}
          className="h-7 text-xs"
        >
          {t('edit')}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSnooze}
        disabled={pending}
        className="h-7 text-xs gap-1"
      >
        <Clock className="h-3 w-3" />
        {t('snooze')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleComplete}
        disabled={pending}
        className="h-7 text-xs gap-1"
      >
        <Check className="h-3 w-3" />
        {t('done')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        disabled={pending}
        className="h-7 text-xs gap-1 text-muted-foreground"
      >
        <X className="h-3 w-3" />
        {t('dismiss')}
      </Button>

      <ScheduleTaskModal
        open={openSchedule}
        task={{
          id: task.id,
          vehicleId: task.vehicleId,
          category: task.category,
          title: task.title,
          description: task.description,
          reasoning: task.reasoning,
          confidence: task.confidence,
          estimatedCost: task.estimatedCost,
          dueAtDate: task.dueAtDate,
          dueAtKm: task.dueAtKm,
          source: task.source,
        }}
        onClose={() => setOpenSchedule(false)}
      />
    </div>
  );
}
