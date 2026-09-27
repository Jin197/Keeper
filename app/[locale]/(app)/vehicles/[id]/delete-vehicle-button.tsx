'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { deleteVehicleAction } from '@/server/actions/vehicles';

export function DeleteVehicleButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const t = useTranslations('vehicleEdit');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteVehicleAction(id);
      if (res?.error) {
        toast.error(res.error);
        setOpen(false);
        return;
      }
      toast.success(t('deleted'), { description: t('deletedHint', { label }) });
      router.push('/vehicles');
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t('deleteAria')}
        className="text-muted-foreground hover:text-destructive"
        disabled={pending}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
      </Button>
      <Confirm
        open={open}
        title={t('deleteTitle')}
        description={t('deleteBody')}
        confirmLabel={pending ? t('deleting') : t('deleteConfirm')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
