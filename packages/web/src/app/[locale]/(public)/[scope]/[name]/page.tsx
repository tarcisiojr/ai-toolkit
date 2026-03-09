import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

/* Cores e ícones por tipo de artefato */
const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  skill: { color: '#00d4ff', icon: '⚡', label: 'Skill' },
  mcp: { color: '#00ff88', icon: '🔌', label: 'MCP Server' },
  template: { color: '#a855f7', icon: '📦', label: 'Template' },
  config: { color: '#ff8800', icon: '⚙️', label: 'Config' },
  hook: { color: '#ff2d95', icon: '🪝', label: 'Hook' },
};

type Props = {
  params: Promise<{ locale: string; scope: string; name: string }>;
};

export default async function ArtifactDetailPage({ params }: Props) {
  const { locale, scope, name } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  // Buscar artefato
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('*')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    notFound();
  }

  // Buscar versões
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
  const isPtBr = locale === 'pt-BR';

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
        <a href={`/${locale}/explore`} className="neon-link">
          {isPtBr ? 'Explorar' : 'Explore'}
        </a>
        <span className="mx-2 text-[#64748b]">/</span>
        <span className="text-[#94a3b8]">
          {artifact.scope}/{artifact.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2">
          {/* Header do artefato */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start gap-4">
              {/* Ícone do tipo */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${typeConfig.color}15` }}
              >
                {typeConfig.icon}
              </div>

              <div className="min-w-0 flex-1">
                {/* Nome completo */}
                <h2 className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold">
                  <span className="text-[#64748b]">{artifact.scope}/</span>
                  <span className="text-[#e2e8f0]">{artifact.name}</span>
                </h2>

                {/* Badge de tipo */}
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
                      ✓ {isPtBr ? 'Verificado' : 'Verified'}
                    </span>
                  )}

                  {artifact.is_deprecated && (
                    <span className="rounded-full border border-[#ff8800]/20 bg-[#ff8800]/10 px-3 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff8800]">
                      ⚠ {isPtBr ? 'Descontinuado' : 'Deprecated'}
                    </span>
                  )}
                </div>

                {/* Descrição */}
                {artifact.description && (
                  <p className="mt-4 text-sm leading-relaxed text-[#94a3b8]">
                    {artifact.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comando de instalação */}
          <div className="mt-6 glass rounded-2xl p-6">
            <h3 className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {isPtBr ? 'Instalação' : 'Installation'}
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

          {/* README / Descrição longa */}
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

          {/* Versões */}
          {versions && versions.length > 0 && (
            <div className="mt-6 glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {isPtBr ? 'Versões' : 'Versions'} ({versions.length})
              </h3>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {isPtBr ? 'Informações' : 'Details'}
            </h3>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  Downloads
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  {artifact.total_downloads?.toLocaleString() || '0'}
                </dd>
              </div>
              {artifact.latest_version && (
                <div className="flex items-center justify-between">
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    {isPtBr ? 'Última versão' : 'Latest version'}
                  </dt>
                  <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                    v{artifact.latest_version}
                  </dd>
                </div>
              )}
              {artifact.license && (
                <div className="flex items-center justify-between">
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    {isPtBr ? 'Licença' : 'License'}
                  </dt>
                  <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                    {artifact.license}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {isPtBr ? 'Publicado em' : 'Published'}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  {new Date(artifact.created_at).toLocaleDateString(locale)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {isPtBr ? 'Atualizado em' : 'Updated'}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  {new Date(artifact.updated_at).toLocaleDateString(locale)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Keywords */}
          {artifact.keywords && artifact.keywords.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                Keywords
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

          {/* Tool targets */}
          {artifact.tool_targets && artifact.tool_targets.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {isPtBr ? 'Ferramentas suportadas' : 'Supported tools'}
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

          {/* Links */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              Links
            </h3>
            <div className="space-y-2">
              {artifact.repository && (
                <a
                  href={artifact.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
                >
                  → Repository
                </a>
              )}
              {artifact.homepage && (
                <a
                  href={artifact.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
                >
                  → Homepage
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
