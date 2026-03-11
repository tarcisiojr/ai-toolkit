import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');

  return (
    <div className="relative overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-24 text-center">
        {/* Badge de versao */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]" />
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
            v{process.env.NEXT_PUBLIC_APP_VERSION} — beta
          </span>
        </div>

        {/* Titulo principal */}
        <h2 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {t('title')}{' '}
          <span className="glow-cyan-text bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">
            {t('titleHighlight')}
          </span>
        </h2>

        {/* Subtitulo com efeito de digitacao */}
        <div className="mx-auto mt-6 max-w-2xl">
          <p className="typing-effect font-[family-name:var(--font-jetbrains)] text-base text-[#94a3b8] sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Terminal Window */}
        <div className="mx-auto mt-12 max-w-xl">
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot terminal-dot-red" />
              <div className="terminal-dot terminal-dot-yellow" />
              <div className="terminal-dot terminal-dot-green" />
              <span className="terminal-title">~/.local/bin/aitk</span>
            </div>
            <div className="terminal-body text-left">
              {/* Linha de comentario */}
              <div>
                <span className="terminal-comment">{t('terminalComment')}</span>
              </div>
              {/* Comando principal */}
              <div className="mt-1">
                <span className="terminal-prompt">$ </span>
                <span className="terminal-command">npx</span>{' '}
                <span className="terminal-flag">aitk-cli</span>{' '}
                <span className="terminal-command">install</span>{' '}
                <span className="terminal-arg">{t('terminalArg')}</span>
              </div>
              {/* Saida simulada */}
              <div className="mt-3">
                <span className="text-[#64748b]">  ✓ </span>
                <span className="text-[#00ff88]">{t('terminalOutput')}</span>
              </div>
              <div>
                <span className="text-[#64748b]">  → </span>
                <span className="text-[#94a3b8]">{t('terminalPath')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botoes de acao */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`/${locale}/explore`}
            className="btn-solid rounded-lg px-6 py-3 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {t('exploreButton')}
          </a>
          <a
            href={`/${locale}/docs`}
            className="btn-neon rounded-lg px-6 py-3 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {t('docsButton')}
          </a>
        </div>
      </section>

      {/* Divisor com gradiente */}
      <div className="divider-gradient mx-auto max-w-4xl" />

      {/* ===== STATS SECTION ===== */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Stat 1 */}
          <div className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:bg-white/[0.04]">
            <div className="stat-value text-4xl lg:text-5xl">5</div>
            <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
              {t('statTypes')}
            </div>
          </div>
          {/* Stat 2 */}
          <div className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:bg-white/[0.04]">
            <div className="stat-value text-4xl lg:text-5xl">6+</div>
            <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
              {t('statTools')}
            </div>
          </div>
          {/* Stat 3 */}
          <div className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:bg-white/[0.04]">
            <div className="stat-value text-4xl lg:text-5xl">100%</div>
            <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
              open source
            </div>
          </div>
        </div>
      </section>

      {/* Divisor */}
      <div className="divider-gradient mx-auto max-w-4xl" />

      {/* ===== FEATURE CARDS ===== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h3 className="text-2xl font-bold sm:text-3xl">
            <span className="text-[#00d4ff]">&lt;</span>
            {t('artifactsTitle')}
            <span className="text-[#00d4ff]">/&gt;</span>
          </h3>
          <p className="mt-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {t('artifactsSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card: Skills */}
          <div className="feature-card feature-card-cyan glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00d4ff]/10 text-xl">
                ⚡
              </span>
              <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#00d4ff]">
                {t('skillsTitle')}
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-[#94a3b8]">
              {t('skillsDesc')}
            </p>
            <div className="mt-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#00d4ff]">$</span> aitk install @scope/skill
            </div>
          </div>

          {/* Card: MCP Servers */}
          <div className="feature-card feature-card-green glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00ff88]/10 text-xl">
                🔌
              </span>
              <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#00ff88]">
                {t('mcpTitle')}
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-[#94a3b8]">
              {t('mcpDesc')}
            </p>
            <div className="mt-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#00ff88]">$</span> aitk install @scope/mcp
            </div>
          </div>

          {/* Card: Templates */}
          <div className="feature-card feature-card-purple glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#a855f7]/10 text-xl">
                📦
              </span>
              <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#a855f7]">
                {t('templatesTitle')}
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-[#94a3b8]">
              {t('templatesDesc')}
            </p>
            <div className="mt-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#a855f7]">$</span> aitk init @scope/template
            </div>
          </div>

          {/* Card: Configs */}
          <div className="feature-card feature-card-orange glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8800]/10 text-xl">
                ⚙️
              </span>
              <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#ff8800]">
                {t('configsTitle')}
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-[#94a3b8]">
              {t('configsDesc')}
            </p>
            <div className="mt-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#ff8800]">$</span> aitk install @scope/config
            </div>
          </div>

          {/* Card: Hooks */}
          <div className="feature-card feature-card-pink glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff2d95]/10 text-xl">
                🪝
              </span>
              <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#ff2d95]">
                {t('hooksTitle')}
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-[#94a3b8]">
              {t('hooksDesc')}
            </p>
            <div className="mt-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#ff2d95]">$</span> aitk install @scope/hook
            </div>
          </div>
        </div>
      </section>

      {/* Divisor */}
      <div className="divider-gradient mx-auto max-w-4xl" />

      {/* ===== COMO FUNCIONA ===== */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h3 className="text-2xl font-bold sm:text-3xl">
            <span className="font-[family-name:var(--font-jetbrains)] text-[#00ff88]">{'{'}</span>
            {' '}{t('howItWorks')}{' '}
            <span className="font-[family-name:var(--font-jetbrains)] text-[#00ff88]">{'}'}</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Passo 1 */}
          <div className="relative text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00d4ff]/20 bg-[#00d4ff]/5">
              <span className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-[#00d4ff]">
                01
              </span>
            </div>
            <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold">
              {t('step1Title')}
            </h4>
            <p className="mt-2 text-sm text-[#94a3b8]">
              {t('step1Desc')}
            </p>
            <div className="mt-3 inline-block rounded-lg bg-white/[0.03] px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#00d4ff]">$</span> aitk publish
            </div>
            {/* Conector (visivel apenas em md+) */}
            <div className="absolute right-0 top-8 hidden h-[2px] w-8 bg-gradient-to-r from-[#00d4ff]/50 to-transparent md:block" />
          </div>

          {/* Passo 2 */}
          <div className="relative text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/5">
              <span className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-[#00ff88]">
                02
              </span>
            </div>
            <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold">
              {t('step2Title')}
            </h4>
            <p className="mt-2 text-sm text-[#94a3b8]">
              {t('step2Desc')}
            </p>
            <div className="mt-3 inline-block rounded-lg bg-white/[0.03] px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#00ff88]">$</span> aitk install @user/skill
            </div>
            {/* Conector */}
            <div className="absolute right-0 top-8 hidden h-[2px] w-8 bg-gradient-to-r from-[#00ff88]/50 to-transparent md:block" />
          </div>

          {/* Passo 3 */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#a855f7]/20 bg-[#a855f7]/5">
              <span className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-[#a855f7]">
                03
              </span>
            </div>
            <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold">
              {t('step3Title')}
            </h4>
            <p className="mt-2 text-sm text-[#94a3b8]">
              {t('step3Desc')}
            </p>
            <div className="mt-3 inline-block rounded-lg bg-white/[0.03] px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#a855f7]">$</span> aitk share
            </div>
          </div>
        </div>
      </section>

      {/* Divisor */}
      <div className="divider-gradient mx-auto max-w-4xl" />

      {/* ===== CTA SECTION ===== */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h3 className="text-2xl font-bold sm:text-3xl">
          {t('ctaTitle')}
        </h3>
        <p className="mx-auto mt-4 max-w-lg font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
          {t('ctaDesc')}
        </p>

        {/* Terminal mini */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left font-[family-name:var(--font-jetbrains)] text-sm">
            <span className="text-[#00ff88]">$ </span>
            <span className="text-[#e2e8f0]">npx aitk-cli</span>{' '}
            <span className="text-[#00d4ff]">explore</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`/${locale}/explore`}
            className="btn-solid rounded-lg px-8 py-3 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {t('ctaExplore')}
          </a>
          <a
            href="https://github.com/tarcisiojr/ai-toolkit"
            className="btn-neon rounded-lg px-8 py-3 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
