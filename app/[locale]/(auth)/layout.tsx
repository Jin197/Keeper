import { Link } from '@/lib/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/locale-switcher';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthLayoutContent>{children}</AuthLayoutContent>;
}

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');
  const tFooter = useTranslations('footer');
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <LocaleSwitcher />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {tFooter('copyright')} · {tFooter('tagline')}
        </div>
      </div>

      <div className="hidden lg:flex relative bg-anthra overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-keeper/30 via-transparent to-eco/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,122,255,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-end p-10 text-white">
          <blockquote className="font-display text-2xl font-semibold leading-snug max-w-md">
            {t('testimonial')}
          </blockquote>
          <div className="mt-4 text-sm text-white/70">
            {t('testimonialAuthor')}
          </div>
        </div>
      </div>
    </div>
  );
}
