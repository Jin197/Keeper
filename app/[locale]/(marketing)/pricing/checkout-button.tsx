'use client';

import { useRouter } from '@/lib/i18n/routing';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

interface Props extends Omit<ButtonProps, 'onClick'> {
  interval: 'monthly' | 'yearly';
  label: string;
}

export function CheckoutButton({ interval, label, ...rest }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'subscription', interval }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/signup?next=/pricing`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setPending(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={pending} {...rest}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
