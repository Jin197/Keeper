'use client';

import { useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DemoButton() {
  const t = useTranslations('components');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleActivateDemo = () => {
    startTransition(async () => {
      try {
        const { generateDemoDataAction } = await import('@/server/actions/demo');
        const res = await generateDemoDataAction();

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success(t('demoOn'), { description: t('demoOnHint'), duration: 5000 });
        
        router.refresh();
      } catch (err) {
        toast.error(t('demoError'));
      }
    });
  };

  return (
    <Button
      onClick={handleActivateDemo}
      disabled={pending}
      variant="outline"
      size="lg"
      className="mt-4 border-veloce text-veloce hover:bg-veloce/10 gap-2 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(0,122,255,0.15)] rounded-full px-6 py-2.5"
      aria-label={t('demoActivate')}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('demoGenerating')}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 text-veloce animate-pulse" />
          <span>{t('demoActivate')}</span>
        </>
      )}
    </Button>
  );
}
