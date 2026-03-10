import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

/** Cores e icones por tipo de artefato para os cards */
const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  skill: { color: '#00d4ff', icon: '⚡', label: 'Skill' },
  mcp: { color: '#00ff88', icon: '🔌', label: 'MCP' },
  template: { color: '#a855f7', icon: '📦', label: 'Template' },
  config: { color: '#ff8800', icon: '⚙️', label: 'Config' },
  hook: { color: '#ff2d95', icon: '🪝', label: 'Hook' },
};

/** Filtros por tipo com valores correspondentes */
const FILTER_TYPES = [
  { value: '', chipClass: 'chip-all' },
  { value: 'skill', chipClass: 'chip-cyan' },
  { value: 'mcp', chipClass: 'chip-green' },
  { value: 'template', chipClass: 'chip-purple' },
  { value: 'config', chipClass: 'chip-orange' },
  { value: 'hook', chipClass: 'chip-pink' },
];

/** Tipagem de artefato retornado pelo Supabase */
interface ArtifactRow {
  id: string;
  scope: string;
  name: string;
  type: string;
  description: string | null;
  latest_version: string | null;
  keywords: string[] | null;
  tool_targets: string[] | null;
  total_downloads: number;
  created_at: string;
  updated_at: string;
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
};

export default async function ExplorePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q: searchQuery, type: filterType, sort: sortBy } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Explore');

  const supabase = await createClient();

  /* Flag: modo busca ou modo discovery */
  const isSearchMode = !!(searchQuery || filterType);

  /* Artefatos para resultado da busca/filtro */
  let artifacts: ArtifactRow[] = [];

  /* Artefatos para seções de discovery (trending/recentes) */
  let trendingArtifacts: ArtifactRow[] = [];
  let recentArtifacts: ArtifactRow[] = [];
  let updatedArtifacts: ArtifactRow[] = [];

  if (isSearchMode) {
    /* Modo busca: query por filtro e/ou texto */
    let query = supabase
      .from('artifacts')
      .select('*')
      .eq('visibility', 'public')
      .limit(30);

    /* Filtrar por tipo se selecionado */
    if (filterType && filterType !== '') {
      query = query.eq('type', filterType);
    }

    /* Busca textual se houver query */
    if (searchQuery && searchQuery.trim() !== '') {
      query = query.or(
        `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,scope.ilike.%${searchQuery}%`,
      );
    }

    /* Ordenacao */
    switch (sortBy) {
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'updated':
        query = query.order('updated_at', { ascending: false });
        break;
      default:
        query = query.order('total_downloads', { ascending: false });
    }

    const { data } = await query;
    artifacts = (data || []) as ArtifactRow[];
  } else {
    /* Modo discovery: buscar trending, recentes e atualizados em paralelo */
    const [trendingRes, recentRes, updatedRes] = await Promise.all([
      supabase
        .from('artifacts')
        .select('*')
        .eq('visibility', 'public')
        .eq('is_deprecated', false)
        .order('total_downloads', { ascending: false })
        .limit(6),
      supabase
        .from('artifacts')
        .select('*')
        .eq('visibility', 'public')
        .eq('is_deprecated', false)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('artifacts')
        .select('*')
        .eq('visibility', 'public')
        .eq('is_deprecated', false)
        .not('latest_version', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(6),
    ]);

    trendingArtifacts = (trendingRes.data || []) as ArtifactRow[];
    recentArtifacts = (recentRes.data || []) as ArtifactRow[];
    updatedArtifacts = (updatedRes.data || []) as ArtifactRow[];
  }

  /* Labels dos filtros traduzidos */
  const filterLabels: Record<string, string> = {
    '': t('filterAll'),
    skill: t('filterSkills'),
    mcp: t('filterMcps'),
    template: t('filterTemplates'),
    config: t('filterConfigs'),
    hook: t('filterHooks'),
  };

  /* Flag para discovery vazio (nenhum artefato publicado) */
  const isDiscoveryEmpty = !isSearchMode &&
    trendingArtifacts.length === 0 &&
    recentArtifacts.length === 0 &&
    updatedArtifacts.length === 0;

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

      {/* Barra de busca com form GET para server-side search */}
      <form method="GET" className="mt-8">
        {/* Preservar filtro de tipo ao buscar */}
        {filterType && <input type="hidden" name="type" value={filterType} />}
        <div className="relative">
          {/* Icone de busca estilizado */}
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
              /
            </span>
          </div>
          <input
            type="search"
            name="q"
            defaultValue={searchQuery || ''}
            placeholder={t('searchPlaceholder')}
            className="search-glow w-full rounded-xl bg-white/[0.03] py-3.5 pl-10 pr-4 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b]"
          />
          {/* Indicador de atalho */}
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
              ENTER
            </span>
          </div>
        </div>
      </form>

      {/* Filtros com chips neon — links que adicionam ?type=xxx */}
      <div className="mt-6 flex flex-wrap gap-3">
        {FILTER_TYPES.map((filter) => {
          const isActive = (filterType || '') === filter.value;
          const href = filter.value
            ? `/${locale}/explore?type=${filter.value}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`
            : `/${locale}/explore${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`;

          return (
            <a
              key={filter.value || 'all'}
              href={href}
              className={`chip rounded-full px-4 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs transition-all ${filter.chipClass} ${
                isActive
                  ? 'ring-2 ring-white/20 brightness-125'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              {filterLabels[filter.value]}
            </a>
          );
        })}
      </div>

      {/* ── Modo busca: resultados ── */}
      {isSearchMode && (
        <>
          {/* Contador de resultados */}
          {searchQuery && (
            <div className="mt-6 font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
              {t('searchResults', { count: artifacts.length, query: searchQuery })}
            </div>
          )}

          {/* Ordenacao */}
          {artifacts.length > 0 && (
            <div className="mt-4 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span>{t('sortBy')}:</span>
              {[
                { value: '', label: t('sortPopular') },
                { value: 'recent', label: t('sortRecent') },
                { value: 'updated', label: t('sortUpdated') },
              ].map((option) => {
                const isActiveSort = (sortBy || '') === option.value;
                const sortHref = `/${locale}/explore?${filterType ? `type=${filterType}&` : ''}${searchQuery ? `q=${encodeURIComponent(searchQuery)}&` : ''}${option.value ? `sort=${option.value}` : ''}`.replace(/[&?]$/, '');

                return (
                  <a
                    key={option.value || 'default'}
                    href={sortHref}
                    className={`rounded px-2 py-1 transition-colors ${
                      isActiveSort
                        ? 'bg-[#00d4ff]/10 text-[#00d4ff]'
                        : 'hover:bg-white/[0.04] hover:text-[#94a3b8]'
                    }`}
                  >
                    {option.label}
                  </a>
                );
              })}
            </div>
          )}

          {/* Grid de cards */}
          {artifacts.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {artifacts.map((artifact) => (
                <ArtifactCard key={artifact.id} artifact={artifact} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyState locale={locale} t={t} />
          )}
        </>
      )}

      {/* ── Modo discovery: seções trending/recentes/atualizados ── */}
      {!isSearchMode && (
        <>
          {isDiscoveryEmpty ? (
            <EmptyState locale={locale} t={t} />
          ) : (
            <div className="mt-10 space-y-12">
              {/* Seção Trending */}
              {trendingArtifacts.length > 0 && (
                <ArtifactSection
                  title={t('trending')}
                  icon="🔥"
                  artifacts={trendingArtifacts}
                  locale={locale}
                />
              )}

              {/* Seção Recém publicados */}
              {recentArtifacts.length > 0 && (
                <ArtifactSection
                  title={t('recentlyPublished')}
                  icon="✨"
                  artifacts={recentArtifacts}
                  locale={locale}
                />
              )}

              {/* Seção Recém atualizados */}
              {updatedArtifacts.length > 0 && (
                <ArtifactSection
                  title={t('recentlyUpdated')}
                  icon="🔄"
                  artifacts={updatedArtifacts}
                  locale={locale}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Componente de card de artefato reutilizavel */
function ArtifactCard({ artifact, locale }: { artifact: ArtifactRow; locale: string }) {
  const typeConf = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.skill;

  return (
    <a
      href={`/${locale}/a/${artifact.scope}/${artifact.name}`}
      className="glass group rounded-2xl p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      {/* Header do card: icone + tipo badge */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: `${typeConf.color}15` }}
        >
          {typeConf.icon}
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px]"
          style={{
            color: typeConf.color,
            backgroundColor: `${typeConf.color}15`,
            border: `1px solid ${typeConf.color}30`,
          }}
        >
          {typeConf.label}
        </span>
      </div>

      {/* Nome do artefato */}
      <div className="mt-3">
        <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold">
          <span className="text-[#64748b]">{artifact.scope}/</span>
          <span className="text-[#e2e8f0] transition-colors group-hover:text-white">
            {artifact.name}
          </span>
        </h3>
      </div>

      {/* Descricao truncada */}
      {artifact.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#94a3b8]">
          {artifact.description}
        </p>
      )}

      {/* Footer: versao + downloads */}
      <div className="mt-4 flex items-center justify-between font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
        <div className="flex items-center gap-3">
          {artifact.latest_version && (
            <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
              v{artifact.latest_version}
            </span>
          )}
          <span>{(artifact.total_downloads || 0).toLocaleString()} ↓</span>
        </div>
        {/* Ferramentas suportadas (primeiras 2) */}
        {artifact.tool_targets && artifact.tool_targets.length > 0 && (
          <div className="flex items-center gap-1">
            {artifact.tool_targets.slice(0, 2).map((tool: string) => (
              <span
                key={tool}
                className="rounded bg-white/[0.04] px-1.5 py-0.5"
                title={tool}
              >
                {tool.split('-')[0]}
              </span>
            ))}
            {artifact.tool_targets.length > 2 && (
              <span className="text-[#64748b]">+{artifact.tool_targets.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Keywords como tags */}
      {artifact.keywords && artifact.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {artifact.keywords.slice(0, 3).map((kw: string) => (
            <span
              key={kw}
              className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[9px] text-[#64748b]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

/** Seção com título e grid de artefatos */
function ArtifactSection({
  title,
  icon,
  artifacts,
  locale,
}: {
  title: string;
  icon: string;
  artifacts: ArtifactRow[];
  locale: string;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#e2e8f0]">
          {title}
        </h3>
        <div className="flex-1 border-t border-white/[0.06]" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {artifacts.map((artifact) => (
          <ArtifactCard key={artifact.id} artifact={artifact} locale={locale} />
        ))}
      </div>
    </section>
  );
}

/** Estado vazio estilizado como terminal */
function EmptyState({
  locale,
  t,
}: {
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <div className="mt-10">
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
            href={`/${locale}/dashboard/publish`}
            className="btn-neon inline-block rounded-lg px-6 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {t('publishButton')}
          </a>
        </div>
      </div>
    </div>
  );
}
