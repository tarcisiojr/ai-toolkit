import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';

/* Cores por tipo de artefato para os cards na listagem */
const typeColors: Record<string, string> = {
  skill: '#00d4ff',
  mcp: '#00ff88',
  template: '#a855f7',
  config: '#ff8800',
  hook: '#ff2d95',
};

type Props = {
  params: Promise<{ locale: string; username: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const t = await getTranslations('UserProfile');

  // Buscar perfil do usuario pelo username
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  // Buscar artefatos publicos do usuario
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .eq('owner_user_id', profile.id)
    .eq('visibility', 'public')
    .order('total_downloads', { ascending: false });

  // Calcular total de downloads de todos os artefatos publicos
  const totalDownloads = artifacts?.reduce((sum, a) => sum + (a.total_downloads || 0), 0) || 0;
  const totalArtifacts = artifacts?.length || 0;

  // URL do avatar do GitHub (se disponivel)
  const avatarUrl = profile.github_username
    ? `https://github.com/${profile.github_username}.png?size=120`
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Cabecalho do perfil do usuario */}
      <div className="glass rounded-2xl p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* Avatar do usuario */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`Avatar de ${profile.username}`}
                width={80}
                height={80}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              /* Icone padrao quando nao ha avatar */
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            {/* Nome de usuario */}
            <h2 className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold">
              <span className="text-[#00d4ff]">@</span>
              <span className="text-[#e2e8f0]">{profile.username}</span>
            </h2>

            {/* Bio do usuario */}
            {profile.bio && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#94a3b8]">
                {profile.bio}
              </p>
            )}

            {/* Link para GitHub */}
            {profile.github_username && (
              <a
                href={`https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="neon-link mt-3 inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-sm"
              >
                {/* Icone do GitHub */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {t('viewOnGithub')}
              </a>
            )}
          </div>
        </div>

        {/* Divisor gradiente */}
        <div className="divider-gradient my-6" />

        {/* Cards de estatisticas do usuario */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total de artefatos publicos */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('publicArtifacts')}
            </div>
            <div className="stat-value mt-1 text-2xl">{totalArtifacts}</div>
          </div>

          {/* Total de downloads */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('totalDownloads')}
            </div>
            <div className="stat-value mt-1 text-2xl">{totalDownloads.toLocaleString()}</div>
          </div>

          {/* Data de cadastro */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('memberSince')}
            </div>
            <div className="mt-1 font-[family-name:var(--font-jetbrains)] text-lg font-bold text-[#e2e8f0]">
              {new Date(profile.created_at).toLocaleDateString(locale, {
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de artefatos publicos do usuario */}
      <div className="mt-8">
        <h3 className="mb-6 font-[family-name:var(--font-jetbrains)] text-lg font-semibold">
          <span className="text-[#00d4ff]">&gt;</span> {t('publicArtifacts')}
          <span className="ml-2 rounded-full bg-white/[0.06] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {totalArtifacts}
          </span>
        </h3>

        {!artifacts || artifacts.length === 0 ? (
          /* Estado vazio quando o usuario nao tem artefatos */
          <div className="glass rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
            <div className="mx-auto mb-4 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]/20">
              <pre className="text-sm leading-relaxed">
{`  _____
 |     |
 | 0 0 |
 |  _  |
 |_____|`}
              </pre>
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
              <span className="text-[#00d4ff]">&gt;</span> {t('noArtifacts')}
            </div>
          </div>
        ) : (
          /* Grid de cards de artefatos */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact) => {
              const color = typeColors[artifact.type] || '#94a3b8';
              return (
                <a
                  key={artifact.id}
                  href={`/${locale}/a/${artifact.scope}/${artifact.name}`}
                  className="glass group rounded-2xl p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  {/* Badge do tipo no canto superior */}
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="rounded-full px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] font-medium"
                      style={{
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {artifact.type}
                    </span>
                    {artifact.latest_version && (
                      <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
                        v{artifact.latest_version}
                      </span>
                    )}
                  </div>

                  {/* Nome do artefato */}
                  <h4 className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0] group-hover:text-white">
                    {artifact.name}
                  </h4>

                  {/* Descricao truncada */}
                  {artifact.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#64748b]">
                      {artifact.description}
                    </p>
                  )}

                  {/* Rodape do card com downloads */}
                  <div className="mt-4 flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    <span className="flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {(artifact.total_downloads || 0).toLocaleString()}
                    </span>
                    <span>
                      {new Date(artifact.updated_at).toLocaleDateString(locale)}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
