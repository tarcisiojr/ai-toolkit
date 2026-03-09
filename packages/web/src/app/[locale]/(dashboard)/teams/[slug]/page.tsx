import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { InviteMemberForm } from './InviteMemberForm';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/* Cores por tipo de artefato */
const typeColors: Record<string, string> = {
  skill: '#00d4ff',
  mcp: '#00ff88',
  template: '#a855f7',
  config: '#ff8800',
  hook: '#ff2d95',
};

/* Cores por role */
const roleColors: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'rgba(255, 136, 0, 0.15)', text: '#ff8800' },
  admin: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  member: { bg: 'rgba(0, 212, 255, 0.15)', text: '#00d4ff' },
};

/* Tipo para o perfil retornado pelo join do Supabase */
interface MemberProfile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/* Tipo para membro da equipe */
interface TeamMember {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  profiles: MemberProfile | MemberProfile[] | null;
}

/* Tipo para artefato da equipe */
interface TeamArtifact {
  id: string;
  scope: string;
  name: string;
  type: string;
  description: string;
  total_downloads: number;
  latest_version: string | null;
}

export default async function TeamDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Teams');

  // Redireciona para login se nao autenticado
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Buscar equipe pelo slug
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .single();

  if (teamError || !team) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {t('teamNotFound')}
          </div>
          <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('teamNotFoundDesc')}
          </div>
          <a
            href={`/${locale}/teams`}
            className="btn-neon mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
          >
            {t('backToTeams')}
          </a>
        </div>
      </div>
    );
  }

  // Buscar membros da equipe
  const { data: rawMembers } = await supabase
    .from('team_members')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (username, display_name, avatar_url)
    `)
    .eq('team_id', team.id)
    .order('joined_at', { ascending: true });

  const members = (rawMembers || []) as unknown as TeamMember[];

  // Buscar artefatos da equipe
  const { data: rawArtifacts } = await supabase
    .from('artifacts')
    .select('id, scope, name, type, description, total_downloads, latest_version')
    .eq('owner_team_id', team.id)
    .eq('is_deprecated', false)
    .order('total_downloads', { ascending: false });

  const artifacts = (rawArtifacts || []) as TeamArtifact[];

  // Verificar se o usuario atual e owner ou admin
  const currentMembership = members.find(m => m.user_id === user.id);
  const isOwnerOrAdmin = currentMembership &&
    ['owner', 'admin'].includes(currentMembership.role);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Cabecalho */}
      <div className="mb-2">
        <a
          href={`/${locale}/teams`}
          className="neon-link mb-4 inline-flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t('backToTeams')}
        </a>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Icone da equipe */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a855f7]/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold">
              <span className="text-[#00d4ff]">&gt;</span> {team.name}
            </h2>
            <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
              @{team.slug}
            </p>
          </div>
        </div>

        {/* Botao de editar (apenas owner/admin) */}
        {isOwnerOrAdmin && (
          <div className="flex gap-3">
            <button
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#e2e8f0]"
            >
              {t('editTeam')}
            </button>
          </div>
        )}
      </div>

      <div className="divider-gradient mb-8" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-8">
          {/* Secao de artefatos */}
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('teamArtifacts')}
              </h3>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                {artifacts.length}
              </span>
            </div>

            {artifacts.length === 0 ? (
              /* Estado vazio de artefatos */
              <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00d4ff]/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </div>
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('noArtifacts')}
                </p>
              </div>
            ) : (
              /* Lista de artefatos */
              <div className="space-y-3">
                {artifacts.map((artifact) => {
                  const color = typeColors[artifact.type] || '#94a3b8';

                  return (
                    <a
                      key={artifact.id}
                      href={`/${locale}/a/${artifact.scope}/${artifact.name}`}
                      className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0] group-hover:text-white">
                              {artifact.scope}/{artifact.name}
                            </span>
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
                            backgroundColor: `${color}15`,
                            color: color,
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
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informacoes da equipe */}
          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
              {t('teamInfo')}
            </h3>
            <dl className="space-y-3">
              {team.description && (
                <div>
                  <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    {t('description')}
                  </dt>
                  <dd className="mt-1 text-sm text-[#e2e8f0]">
                    {team.description}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('createdAt')}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {new Date(team.created_at).toLocaleDateString(locale, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {t('members')}
                </dt>
                <dd className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {members.length}
                </dd>
              </div>
            </dl>
          </div>

          {/* Membros da equipe */}
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
                {t('teamMembers')}
              </h3>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                {members.length}
              </span>
            </div>

            {members.length === 0 ? (
              <p className="text-center font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                {t('noMembers')}
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  // O perfil pode vir como objeto ou array dependendo da query
                  const profile = Array.isArray(member.profiles)
                    ? member.profiles[0]
                    : member.profiles;
                  const colors = roleColors[member.role] || roleColors.member;
                  const roleKey = `role${member.role.charAt(0).toUpperCase() + member.role.slice(1)}` as
                    'roleOwner' | 'roleAdmin' | 'roleMember';

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        {/* Avatar placeholder */}
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] font-[family-name:var(--font-jetbrains)] text-[10px] text-[#94a3b8]">
                          {(profile?.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                            {profile?.display_name || profile?.username || '—'}
                          </span>
                          {profile?.username && (
                            <span className="ml-1.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
                              @{profile.username}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] font-medium"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {t(roleKey)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulario de convite (apenas owner/admin) */}
            {isOwnerOrAdmin && (
              <Suspense fallback={null}>
                <InviteMemberForm teamSlug={slug} locale={locale} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
