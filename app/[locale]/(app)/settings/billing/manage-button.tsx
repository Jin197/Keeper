'use client';

import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface Props {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  label?: React.ReactNode;
  className?: string;
}

export function ManageSubscriptionButton({
  variant = 'outline',
  size = 'md',
  label,
  className,
}: Props) {
  const t = useTranslations('preferences');
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setPending(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={pending}
      className={className}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label ?? (
        <>
          {t('manageSubscription')} <ExternalLink className="h-3 w-3" />
        </>
      )}
    </Button>
  );
}
