import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations();

  // Locale alternativo para o seletor de idioma
  const otherLocale = locale === 'pt-BR' ? 'en' : 'pt-BR';
  const otherLocaleLabel = locale === 'pt-BR' ? 'EN' : 'PT';

  return (
    <NextIntlClientProvider messages={messages}>
      {/* Code rain no fundo */}
      <div className="code-rain" aria-hidden="true" />

      {/* Grid pattern overlay */}
      <div className="bg-grid-fade pointer-events-none fixed inset-0 z-0" aria-hidden="true" />

      {/* Conteudo principal */}
      <div className="relative z-10">
        {/* Header com efeito glassmorphism */}
        <header className="glass-strong sticky top-0 z-50 border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            {/* Logo com efeito neon */}
            <h1 className="font-[family-name:var(--font-jetbrains)] text-xl font-bold tracking-tight">
              <a href={`/${locale}`} className="group flex items-center gap-1">
                {/* "AI" com glow especial */}
                <span className="glow-cyan-text text-[#00d4ff] transition-all duration-300 group-hover:brightness-125">
                  AI
                </span>
                <span className="text-[#e2e8f0] transition-colors duration-300 group-hover:text-white">
                  Toolkit
                </span>
                {/* Indicador de status "online" */}
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.5)] glow-pulse" />
              </a>
            </h1>

            {/* Navegacao */}
            <nav className="flex items-center gap-6">
              <a
                href={`/${locale}/explore`}
                className="neon-link font-[family-name:var(--font-mono)] text-sm tracking-wide"
              >
                {t('Header.explore')}
              </a>
              <a
                href={`/${otherLocale}`}
                className="rounded border border-white/10 px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[#64748b] transition-colors hover:text-[#00d4ff]"
              >
                {otherLocaleLabel}
              </a>
              <a
                href={`/${locale}/login`}
                className="btn-neon rounded-lg px-4 py-2 font-[family-name:var(--font-mono)] text-sm tracking-wide"
              >
                {t('Header.login')}
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        {/* Footer minimalista */}
        <footer className="border-t border-white/[0.06] py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                <span className="text-[#00d4ff]">&gt;</span> AI Toolkit &mdash; {t('Footer.openSource')}
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/tarcisiojr/ai-toolkit"
                  className="neon-link text-xs font-[family-name:var(--font-mono)]"
                >
                  GitHub
                </a>
                <a
                  href={`/${locale}/docs`}
                  className="neon-link text-xs font-[family-name:var(--font-mono)]"
                >
                  Docs
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
