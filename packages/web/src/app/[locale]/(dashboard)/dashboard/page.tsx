import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CreateTokenButton } from './components/CreateTokenButton';
import { DeleteTokenButton } from './components/DeleteTokenButton';

type Props = {
  params: Promise<{ locale: string }>;
};

/* Configuracao de cor por tipo de artefato */
const typeColors: Record<string, string> = {
  skill: '#00d4ff',
  mcp: '#00ff88',
  template: '#a855f7',
  config: '#ff8800',
  hook: '#ff2d95',
};

/* Icone SVG por tipo de artefato */
function TypeIcon({ type }: { type: string }) {
  const color = typeColors[type] || '#94a3b8';

  switch (type) {
    case 'skill':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'mcp':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
    case 'template':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      );
    case 'config':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'hook':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

/* Formata a data relativa (ex: "há 2 dias") */
function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isPtBr = locale === 'pt-BR';

  if (diffDays === 0) return isPtBr ? 'hoje' : 'today';
  if (diffDays === 1) return isPtBr ? 'ontem' : 'yesterday';
  if (diffDays < 7) return isPtBr ? `${diffDays} dias atrás` : `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return isPtBr ? `${weeks} sem. atrás` : `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return isPtBr ? `${months} mês(es) atrás` : `${months}mo ago`;
  }
  return date.toLocaleDateString(locale);
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Dashboard');

  // Redireciona para login se nao autenticado
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Buscar perfil do usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Buscar artefatos do usuario
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('updated_at', { ascending: false });

  // Buscar tokens de API
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('id, name, token_prefix, last_used_at, expires_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Calcular estatisticas
  const totalDownloads = artifacts?.reduce((sum, a) => sum + (a.total_downloads || 0), 0) || 0;
  const totalArtifacts = artifacts?.length || 0;
  const totalTokens = tokens?.length || 0;
  const publicArtifacts = artifacts?.filter(a => a.visibility === 'public').length || 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Cabecalho do dashboard */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            <span className="text-[#00d4ff]">&gt;</span> {t('title')}
          </h2>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {t('welcomeBack')},{' '}
            <span className="text-[#00d4ff]">
              {profile?.username || user.email}
            </span>
          </p>
        </div>

        {/* Acoes rapidas */}
        <div className="flex gap-3">
          <a
            href={`/${locale}/dashboard/publish`}
            className="btn-solid flex items-center gap-2 rounded-lg px-5 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {/* Icone de adicionar */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('publishNew')}
          </a>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#e2e8f0]"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
      </div>

      <div className="divider-gradient mb-8" />

      {/* Cards de estatisticas */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total de artefatos */}
        <div className="glass group rounded-2xl p-6 transition-all duration-300 hover:border-[#00d4ff]/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00d4ff]/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            {publicArtifacts > 0 && (
              <span className="rounded-full bg-[#00d4ff]/10 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00d4ff]">
                {publicArtifacts} {t('public')}
              </span>
            )}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('totalArtifacts')}
          </div>
          <div className="stat-value mt-1 text-3xl">{totalArtifacts}</div>
        </div>

        {/* Total de downloads */}
        <div className="glass group rounded-2xl p-6 transition-all duration-300 hover:border-[#00ff88]/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00ff88]/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('totalDownloads')}
          </div>
          <div className="stat-value mt-1 text-3xl">{totalDownloads.toLocaleString()}</div>
        </div>

        {/* Tokens de API */}
        <div className="glass group rounded-2xl p-6 transition-all duration-300 hover:border-[#a855f7]/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#a855f7]/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('apiTokens')}
          </div>
          <div className="stat-value mt-1 text-3xl">{totalTokens}</div>
        </div>

        {/* Membro desde */}
        <div className="glass group rounded-2xl p-6 transition-all duration-300 hover:border-[#ff8800]/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8800]/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff8800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('memberSince')}
          </div>
          <div className="mt-1 font-[family-name:var(--font-jetbrains)] text-lg font-bold text-[#e2e8f0]">
            {new Date(user.created_at).toLocaleDateString(locale, {
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna principal — Meus Artefatos */}
        <div className="lg:col-span-2 space-y-8">
          {/* Secao de artefatos */}
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                  {t('myArtifacts')}
                </h3>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {totalArtifacts}
                </span>
              </div>
              <a
                href={`/${locale}/dashboard/publish`}
                className="btn-neon flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('newArtifact')}
              </a>
            </div>

            {!artifacts || artifacts.length === 0 ? (
              /* Estado vazio */
              <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
                {/* Icone ASCII estilizado */}
                <div className="mx-auto mb-4 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]/20">
                  <pre className="text-sm leading-relaxed">
{`  _____
 |     |
 | + + |
 |  _  |
 |_____|`}
                  </pre>
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
                  <span className="text-[#00d4ff]">&gt;</span>{' '}
                  {t('noArtifacts')}
                </div>
                <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  <span className="text-[#00ff88]">$</span> aitk publish
                </div>
                <a
                  href={`/${locale}/dashboard/publish`}
                  className="btn-neon mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('publishFirst')}
                </a>
              </div>
            ) : (
              /* Lista de artefatos */
              <div className="space-y-3">
                {artifacts.map((artifact) => (
                  <a
                    key={artifact.id}
                    href={`/${locale}/${artifact.scope}/${artifact.name}`}
                    className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icone do tipo */}
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${typeColors[artifact.type] || '#94a3b8'}15`,
                        }}
                      >
                        <TypeIcon type={artifact.type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0] group-hover:text-white">
                            {artifact.scope}/{artifact.name}
                          </span>
                          {artifact.visibility === 'private' && (
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64748b]">
                              {t('private')}
                            </span>
                          )}
                        </div>
                        {artifact.description && (
                          <p className="mt-0.5 text-xs text-[#64748b]">
                            {artifact.description.slice(0, 80)}
                            {artifact.description.length > 80 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                      {/* Versao */}
                      {artifact.latest_version && (
                        <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
                          v{artifact.latest_version}
                        </span>
                      )}
                      {/* Badge do tipo */}
                      <span
                        className="rounded-full px-2.5 py-0.5 font-medium"
                        style={{
                          backgroundColor: `${typeColors[artifact.type] || '#94a3b8'}15`,
                          color: typeColors[artifact.type] || '#94a3b8',
                        }}
                      >
                        {artifact.type}
                      </span>
                      {/* Downloads */}
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {(artifact.total_downloads || 0).toLocaleString()}
                      </span>
                      {/* Data de atualizacao */}
                      {artifact.updated_at && (
                        <span className="hidden sm:inline">
                          {formatRelativeDate(artifact.updated_at, locale)}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Tokens, Perfil e Acesso rapido */}
        <div className="space-y-6">
          {/* Perfil */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {t('profile')}
            </h3>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  Username
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {profile?.username || '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  Email
                </dt>
                <dd className="max-w-[180px] truncate font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {user.email || '—'}
                </dd>
              </div>
              {profile?.github_username && (
                <div className="flex items-center justify-between">
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    GitHub
                  </dt>
                  <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                    <a
                      href={`https://github.com/${profile.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00d4ff] hover:underline"
                    >
                      @{profile.github_username}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Tokens de API */}
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('apiTokens')}
              </h3>
              <Suspense fallback={null}>
                <CreateTokenButton locale={locale} />
              </Suspense>
            </div>

            {!tokens || tokens.length === 0 ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#a855f7]/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('noTokens')}
                </p>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  <span className="text-[#00ff88]">$</span> aitk login
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => {
                  // Verifica se o token esta expirado
                  const isExpired = token.expires_at && new Date(token.expires_at) < new Date();

                  return (
                    <div
                      key={token.id}
                      className={`rounded-lg border px-3 py-2.5 ${
                        isExpired
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-white/[0.06] bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                          {token.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                            {token.token_prefix}***
                          </span>
                          <Suspense fallback={null}>
                            <DeleteTokenButton tokenId={token.id} locale={locale} />
                          </Suspense>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
                        <span>
                          {t('created')}{' '}
                          {new Date(token.created_at).toLocaleDateString(locale)}
                        </span>
                        {token.last_used_at && (
                          <>
                            <span>·</span>
                            <span>
                              {t('lastUsed')}{' '}
                              {formatRelativeDate(token.last_used_at, locale)}
                            </span>
                          </>
                        )}
                        {isExpired && (
                          <>
                            <span>·</span>
                            <span className="text-red-400">{t('expired')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acesso rapido CLI */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {t('quickAccess')}
            </h3>
            <div className="space-y-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="text-[#00ff88]">$</span> aitk publish
                <span className="ml-2 text-[#64748b]/60"># {t('cmdPublish')}</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="text-[#00ff88]">$</span> aitk search{' '}
                <span className="text-[#94a3b8]">&lt;query&gt;</span>
                <span className="ml-2 text-[#64748b]/60"># {t('cmdSearch')}</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="text-[#00ff88]">$</span> aitk install{' '}
                <span className="text-[#94a3b8]">scope/name</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="text-[#00ff88]">$</span> aitk login
                <span className="ml-2 text-[#64748b]/60"># {t('cmdLogin')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
