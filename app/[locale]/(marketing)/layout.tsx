import { Link } from '@/lib/i18n/routing';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { LandingHeader } from '@/components/layout/landing-header';

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tNav = await getTranslations('nav');

  return (
    <div className="min-h-screen flex flex-col bg-background relative pt-20">
      <LandingHeader
        tNav={{
          features: tNav('features'),
          pricing: tNav('pricing'),
          help: tNav('help'),
          login: tNav('login'),
          signup: tNav('signup'),
        }}
      />
      {children}
      <Footer />
    </div>
  );
}

async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  return (
    <footer className="bg-[#0D0D12] border-t border-[#C5A059]/10 rounded-t-[4rem] mt-24 text-white">
      <div className="container py-14 grid gap-8 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div className="space-y-4 sm:col-span-2 md:col-span-1">
          <Logo />
          <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">{t('tagline')}</p>
          
          {/* Active Network status pulse dot */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Keeper Network : OPÉRATIONNEL
          </div>
        </div>
        <div>
          <div className="font-display font-semibold mb-4 text-[#C5A059]">{t('product')}</div>
          <ul className="space-y-2.5 text-muted-foreground">
            <li><Link href="/#features" className="hover:text-[#007AFF] transition-colors">{tNav('features')}</Link></li>
            <li><Link href="/#pricing" className="hover:text-[#007AFF] transition-colors">{tNav('pricing')}</Link></li>
            <li><Link href="/login" className="hover:text-[#007AFF] transition-colors">{tNav('login')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-display font-semibold mb-4 text-[#C5A059]">{t('legal')}</div>
          <ul className="space-y-2.5 text-muted-foreground">
            <li><Link href="/legal/terms" className="hover:text-[#007AFF] transition-colors">{t('termsLink')}</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-[#007AFF] transition-colors">{t('privacyLink')}</Link></li>
            <li><Link href="/legal/imprint" className="hover:text-[#007AFF] transition-colors">{t('mentionsLink')}</Link></li>
            <li><Link href="/legal/cookies" className="hover:text-[#007AFF] transition-colors">{t('cookiesLink')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-display font-semibold mb-4 text-[#C5A059]">{t('languages')}</div>
          <LocaleSwitcher variant="inline" />
        </div>
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="container py-6 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between items-center">
          <span>{t('copyright')}</span>
          <span>{t('rights')}</span>
        </div>
      </div>
    </footer>
  );
}
