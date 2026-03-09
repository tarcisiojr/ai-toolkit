import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Explore');

  /* Definicao dos filtros com suas cores neon correspondentes */
  const filters = [
    { label: t('filterAll'), chipClass: 'chip-all' },
    { label: t('filterSkills'), chipClass: 'chip-cyan' },
    { label: t('filterMcps'), chipClass: 'chip-green' },
    { label: t('filterTemplates'), chipClass: 'chip-purple' },
    { label: t('filterConfigs'), chipClass: 'chip-orange' },
    { label: t('filterHooks'), chipClass: 'chip-pink' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Cabecalho da pagina */}
      <div className="mb-2">
        <h2 className="text-3xl font-bold">
          <span className="text-[#00d4ff]">&gt;</span> {t('title')}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
          {t('subtitle')}
        </p>
      </div>

      {/* Barra de busca com efeito glow */}
      <div className="mt-8">
        <div className="relative">
          {/* Icone de busca estilizado */}
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
              /
            </span>
          </div>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            className="search-glow w-full rounded-xl bg-white/[0.03] py-3.5 pl-10 pr-4 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b]"
          />
          {/* Indicador de atalho */}
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
              ESC
            </span>
          </div>
        </div>
      </div>

      {/* Filtros com chips neon */}
      <div className="mt-6 flex flex-wrap gap-3">
        {filters.map((filter) => (
          <button
            key={filter.label}
            className={`chip rounded-full px-4 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs ${filter.chipClass}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Grid para futuros cards (vazio por enquanto) */}
      <div className="mt-10">
        {/* Estado vazio estilizado como terminal */}
        <div className="glass rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
          {/* Icone ASCII art */}
          <div className="mx-auto mb-6 max-w-xs font-[family-name:var(--font-jetbrains)] text-sm leading-relaxed text-[#64748b]">
            <pre className="text-[#00d4ff]/30">
{`  _____
 |     |
 | 0 0 |
 |  _  |
 |_____|
`}
            </pre>
          </div>

          <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            <span className="text-[#00d4ff]">&gt;</span> {t('emptyTitle')}
          </div>
          <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            <span className="text-[#00ff88]">$</span> {t('emptySubtitle')}
          </div>

          {/* CTA para publicar */}
          <div className="mt-6">
            <a
              href={`/${locale}/publish`}
              className="btn-neon inline-block rounded-lg px-6 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
            >
              {t('publishButton')}
            </a>
          </div>
        </div>
      </div>

      {/* Grid placeholder para quando houver artefatos */}
      {/*
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        Cards de artefatos virao aqui
      </div>
      */}
    </div>
  );
}
