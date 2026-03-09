import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

/* Cores e icones por tipo de artefato */
const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  skill: { color: '#00d4ff', icon: '\u26A1', label: 'Skill' },
  mcp: { color: '#00ff88', icon: '\uD83D\uDD0C', label: 'MCP Server' },
  template: { color: '#a855f7', icon: '\uD83D\uDCE6', label: 'Template' },
  config: { color: '#ff8800', icon: '\u2699\uFE0F', label: 'Config' },
  hook: { color: '#ff2d95', icon: '\uD83E\uDE9D', label: 'Hook' },
};

type Props = {
  params: Promise<{ locale: string; scope: string; name: string }>;
};

/**
 * Gera dados simulados de downloads semanais para o grafico
 * Em producao, isso viria de uma tabela de estatisticas no Supabase
 */
function generateWeeklyDownloads(totalDownloads: number): { label: string; value: number }[] {
  const weeks = 7;
  const data: { label: string; value: number }[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - i * 7);
    const label = weekDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });

    // Distribui os downloads de forma decrescente (semanas mais recentes tem mais)
    const weight = (weeks - i) / weeks;
    const baseValue = Math.floor((totalDownloads / weeks) * weight);
    // Adiciona variacao para parecer mais natural
    const variation = Math.floor(baseValue * 0.3 * (Math.sin(i * 2.1) + 1));
    data.push({ label, value: Math.max(0, baseValue + variation) });
  }

  return data;
}

export default async function ArtifactDetailPage({ params }: Props) {
  const { locale, scope, name } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const t = await getTranslations('ArtifactDetail');

  // Buscar artefato pelo scope e nome
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('*')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    notFound();
  }

  // Buscar versoes ordenadas pela mais recente
  const { data: versions } = await supabase
    .from('artifact_versions')
    .select('*')
    .eq('artifact_id', artifact.id)
    .eq('is_yanked', false)
    .order('version_major', { ascending: false })
    .order('version_minor', { ascending: false })
    .order('version_patch', { ascending: false })
    .limit(10);

  const typeConfig = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.skill;
  const latestVersion = versions?.[0];
  const totalDownloads = artifact.total_downloads || 0;

  // Dados para o grafico de downloads semanais
  const weeklyData = generateWeeklyDownloads(totalDownloads);
  const maxDownload = Math.max(...weeklyData.map((d) => d.value), 1);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Breadcrumb de navegacao */}
      <nav className="mb-8 font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
        <a href={`/${locale}/explore`} className="neon-link">
          {t('explore')}
        </a>
        <span className="mx-2 text-[#64748b]">/</span>
        <span className="text-[#94a3b8]">
          {artifact.scope}/{artifact.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna principal com informacoes do artefato */}
        <div className="lg:col-span-2">
          {/* Header do artefato */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start gap-4">
              {/* Icone do tipo */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${typeConfig.color}15` }}
              >
                {typeConfig.icon}
              </div>

              <div className="min-w-0 flex-1">
                {/* Nome completo do artefato */}
                <h2 className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold">
                  <span className="text-[#64748b]">{artifact.scope}/</span>
                  <span className="text-[#e2e8f0]">{artifact.name}</span>
                </h2>

                {/* Badges de tipo, versao e status */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs"
                    style={{
                      backgroundColor: `${typeConfig.color}15`,
                      color: typeConfig.color,
                      border: `1px solid ${typeConfig.color}30`,
                    }}
                  >
                    {typeConfig.label}
                  </span>

                  {artifact.latest_version && (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
                      v{artifact.latest_version}
                    </span>
                  )}

                  {artifact.is_verified && (
                    <span className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88]">
                      &#10003; {t('verified')}
                    </span>
                  )}

                  {artifact.is_deprecated && (
                    <span className="rounded-full border border-[#ff8800]/20 bg-[#ff8800]/10 px-3 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff8800]">
                      &#9888; {t('deprecated')}
                    </span>
                  )}
                </div>

                {/* Descricao do artefato */}
                {artifact.description && (
                  <p className="mt-4 text-sm leading-relaxed text-[#94a3b8]">
                    {artifact.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comando de instalacao estilizado como terminal */}
          <div className="mt-6 glass rounded-2xl p-6">
            <h3 className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {t('installation')}
            </h3>
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dot terminal-dot-red" />
                <div className="terminal-dot terminal-dot-yellow" />
                <div className="terminal-dot terminal-dot-green" />
                <span className="terminal-title">terminal</span>
              </div>
              <div className="terminal-body">
                <div>
                  <span className="terminal-prompt">$ </span>
                  <span className="terminal-command">npx aitk</span>{' '}
                  <span className="terminal-flag">install</span>{' '}
                  <span className="terminal-arg">
                    {artifact.scope}/{artifact.name}
                    {artifact.latest_version ? `@${artifact.latest_version}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grafico de downloads semanais */}
          {totalDownloads > 0 && (
            <div className="mt-6 glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('weeklyDownloads')}
              </h3>
              <div className="flex items-end gap-2" style={{ height: '120px' }}>
                {weeklyData.map((week, index) => {
                  const heightPercent = (week.value / maxDownload) * 100;
                  return (
                    <div key={index} className="group flex flex-1 flex-col items-center gap-1">
                      {/* Tooltip com valor exato */}
                      <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b] opacity-0 transition-opacity group-hover:opacity-100">
                        {week.value}
                      </span>
                      {/* Barra do grafico */}
                      <div
                        className="w-full rounded-t transition-all duration-300 group-hover:opacity-90"
                        style={{
                          height: `${Math.max(heightPercent, 4)}%`,
                          background: `linear-gradient(to top, #00d4ff, #00ff88)`,
                          opacity: 0.6 + (index / weeklyData.length) * 0.4,
                          minHeight: '4px',
                        }}
                      />
                      {/* Label da semana */}
                      <span className="mt-1 font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64748b]">
                        {week.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* README ou descricao longa */}
          {(artifact.long_description || latestVersion?.readme) && (
            <div className="mt-6 glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                README
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-[#94a3b8]">
                <pre className="whitespace-pre-wrap font-[family-name:var(--font-mono)] text-sm leading-relaxed">
                  {latestVersion?.readme || artifact.long_description}
                </pre>
              </div>
            </div>
          )}

          {/* Lista de versoes com changelog */}
          {versions && versions.length > 0 ? (
            <div className="mt-6 glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('versions')} ({versions.length})
              </h3>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                          v{v.version}
                        </span>
                        {v.version === artifact.latest_version && (
                          <span className="rounded bg-[#00ff88]/10 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00ff88]">
                            latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                        {v.file_size && (
                          <span>{(v.file_size / 1024).toFixed(1)} KB</span>
                        )}
                        <span>
                          {new Date(v.created_at).toLocaleDateString(locale)}
                        </span>
                      </div>
                    </div>
                    {/* Changelog da versao, se disponivel */}
                    {v.changelog && (
                      <div className="mt-2 border-t border-white/[0.04] pt-2">
                        <p className="font-[family-name:var(--font-jetbrains)] text-xs leading-relaxed text-[#64748b]">
                          {v.changelog}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('versions')}
              </h3>
              <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
                {t('noVersions')}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar com informacoes complementares */}
        <div className="space-y-6">
          {/* Estatisticas do artefato */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {t('details')}
            </h3>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('downloads')}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  {totalDownloads.toLocaleString()}
                </dd>
              </div>
              {artifact.latest_version && (
                <div className="flex items-center justify-between">
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    {t('latestVersion')}
                  </dt>
                  <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                    v{artifact.latest_version}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('type')}
                </dt>
                <dd
                  className="font-[family-name:var(--font-jetbrains)] text-sm font-medium"
                  style={{ color: typeConfig.color }}
                >
                  {typeConfig.label}
                </dd>
              </div>
              {artifact.license && (
                <div className="flex items-center justify-between">
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    {t('license')}
                  </dt>
                  <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                    {artifact.license}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('published')}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  {new Date(artifact.created_at).toLocaleDateString(locale)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('updated')}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  {new Date(artifact.updated_at).toLocaleDateString(locale)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Palavras-chave do artefato */}
          {artifact.keywords && artifact.keywords.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('keywords')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {artifact.keywords.map((kw: string) => (
                  <span
                    key={kw}
                    className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ferramentas suportadas */}
          {artifact.tool_targets && artifact.tool_targets.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('toolSupport')}
              </h3>
              <div className="space-y-2">
                {artifact.tool_targets.map((tool: string) => (
                  <div
                    key={tool}
                    className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links externos */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {t('links')}
            </h3>
            <div className="space-y-2">
              {/* Link para o perfil do autor */}
              <a
                href={`/${locale}/u/${artifact.scope}`}
                className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
              >
                &rarr; @{artifact.scope}
              </a>
              {artifact.repository && (
                <a
                  href={artifact.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
                >
                  &rarr; {t('repository')}
                </a>
              )}
              {artifact.homepage && (
                <a
                  href={artifact.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
                >
                  &rarr; Homepage
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
