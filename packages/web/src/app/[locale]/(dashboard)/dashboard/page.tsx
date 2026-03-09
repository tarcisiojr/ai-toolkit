import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redireciona para login se não autenticado
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Buscar perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Buscar artefatos do usuário
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

  const isPtBr = locale === 'pt-BR';

  /* Configuração de cor por tipo */
  const typeColors: Record<string, string> = {
    skill: '#00d4ff',
    mcp: '#00ff88',
    template: '#a855f7',
    config: '#ff8800',
    hook: '#ff2d95',
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header do dashboard */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            <span className="text-[#00d4ff]">&gt;</span> Dashboard
          </h2>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {isPtBr ? 'Bem-vindo de volta' : 'Welcome back'},{' '}
            <span className="text-[#00d4ff]">
              {profile?.username || user.email}
            </span>
          </p>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-3">
          <a
            href={`/${locale}/publish`}
            className="btn-solid rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {isPtBr ? 'Publicar Artefato' : 'Publish Artifact'}
          </a>
          <form action={`/api/auth/signout`} method="POST">
            <button
              type="submit"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#e2e8f0]"
            >
              {isPtBr ? 'Sair' : 'Sign out'}
            </button>
          </form>
        </div>
      </div>

      <div className="divider-gradient mb-8" />

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {isPtBr ? 'Artefatos publicados' : 'Published artifacts'}
          </div>
          <div className="stat-value mt-2 text-3xl">{artifacts?.length || 0}</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {isPtBr ? 'Downloads totais' : 'Total downloads'}
          </div>
          <div className="stat-value mt-2 text-3xl">
            {artifacts?.reduce((sum, a) => sum + (a.total_downloads || 0), 0).toLocaleString() || '0'}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {isPtBr ? 'Tokens de API' : 'API tokens'}
          </div>
          <div className="stat-value mt-2 text-3xl">{tokens?.length || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna principal — Artefatos */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {isPtBr ? 'Meus Artefatos' : 'My Artifacts'}
              </h3>
              <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                {artifacts?.length || 0} {isPtBr ? 'itens' : 'items'}
              </span>
            </div>

            {!artifacts || artifacts.length === 0 ? (
              /* Estado vazio */
              <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
                <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
                  <span className="text-[#00d4ff]">&gt;</span>{' '}
                  {isPtBr
                    ? 'Nenhum artefato publicado ainda.'
                    : 'No artifacts published yet.'}
                </div>
                <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  <span className="text-[#00ff88]">$</span> aitk publish
                </div>
                <a
                  href={`/${locale}/publish`}
                  className="btn-neon mt-4 inline-block rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm"
                >
                  {isPtBr ? 'Publicar primeiro artefato' : 'Publish first artifact'}
                </a>
              </div>
            ) : (
              /* Lista de artefatos */
              <div className="space-y-3">
                {artifacts.map((artifact) => (
                  <a
                    key={artifact.id}
                    href={`/${locale}/${artifact.scope}/${artifact.name}`}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Indicador de tipo */}
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: typeColors[artifact.type] || '#94a3b8',
                        }}
                      />
                      <div>
                        <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                          {artifact.scope}/{artifact.name}
                        </span>
                        {artifact.description && (
                          <p className="mt-0.5 text-xs text-[#64748b]">
                            {artifact.description.slice(0, 80)}
                            {artifact.description.length > 80 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                      {artifact.latest_version && (
                        <span>v{artifact.latest_version}</span>
                      )}
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: `${typeColors[artifact.type] || '#94a3b8'}15`,
                          color: typeColors[artifact.type] || '#94a3b8',
                        }}
                      >
                        {artifact.type}
                      </span>
                      <span>{artifact.total_downloads || 0} ↓</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Tokens e Perfil */}
        <div className="space-y-6">
          {/* Perfil */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {isPtBr ? 'Perfil' : 'Profile'}
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
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {user.email || '—'}
                </dd>
              </div>
              {profile?.github_username && (
                <div className="flex items-center justify-between">
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    GitHub
                  </dt>
                  <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                    @{profile.github_username}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {isPtBr ? 'Membro desde' : 'Member since'}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {new Date(user.created_at).toLocaleDateString(locale)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tokens de API */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {isPtBr ? 'Tokens de API' : 'API Tokens'}
            </h3>

            {!tokens || tokens.length === 0 ? (
              <div className="text-center">
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {isPtBr
                    ? 'Nenhum token criado. Use o CLI para gerar:'
                    : 'No tokens created. Use the CLI:'}
                </p>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  <span className="text-[#00ff88]">$</span> aitk login
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                        {token.name}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                        {token.token_prefix}***
                      </span>
                    </div>
                    <div className="mt-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
                      {isPtBr ? 'Criado em ' : 'Created '}
                      {new Date(token.created_at).toLocaleDateString(locale)}
                      {token.last_used_at && (
                        <>
                          {' · '}
                          {isPtBr ? 'Usado em ' : 'Used '}
                          {new Date(token.last_used_at).toLocaleDateString(locale)}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acesso rápido CLI */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {isPtBr ? 'Acesso rápido' : 'Quick access'}
            </h3>
            <div className="space-y-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                <span className="text-[#00ff88]">$</span> aitk publish
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                <span className="text-[#00ff88]">$</span> aitk search{' '}
                <span className="text-[#94a3b8]">&lt;query&gt;</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                <span className="text-[#00ff88]">$</span> aitk install{' '}
                <span className="text-[#94a3b8]">scope/name</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
