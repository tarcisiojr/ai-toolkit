import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

/* Mapeamento de cores por role */
const roleColors: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'rgba(255, 136, 0, 0.15)', text: '#ff8800' },
  admin: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  member: { bg: 'rgba(0, 212, 255, 0.15)', text: '#00d4ff' },
};

export default async function TeamsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Teams');

  // Redireciona para login se nao autenticado
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Buscar equipes do usuario com contagem de membros
  const { data: memberships } = await supabase
    .from('team_members')
    .select(`
      role,
      joined_at,
      teams (
        id,
        slug,
        name,
        description,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  // Buscar contagem de membros para cada equipe
  const teamsWithCounts = await Promise.all(
    (memberships || []).map(async (membership) => {
      const team = membership.teams as unknown as {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        created_at: string;
      };

      if (!team) return null;

      const { count } = await supabase
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id);

      return {
        ...team,
        role: membership.role,
        memberCount: count || 0,
      };
    }),
  );

  const teams = teamsWithCounts.filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Cabecalho */}
      <div className="mb-2">
        <a
          href={`/${locale}/dashboard`}
          className="neon-link mb-4 inline-flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t('backToDashboard')}
        </a>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            <span className="text-[#00d4ff]">&gt;</span> {t('title')}
          </h2>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {t('subtitle')}
          </p>
        </div>

        {/* Botao de criar equipe */}
        <a
          href={`/${locale}/teams/create`}
          className="btn-solid flex items-center gap-2 rounded-lg px-5 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('createTeam')}
        </a>
      </div>

      <div className="divider-gradient mb-8" />

      {/* Lista de equipes */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('title')}
          </h3>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {teams.length}
          </span>
        </div>

        {teams.length === 0 ? (
          /* Estado vazio */
          <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a855f7]/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
              <span className="text-[#00d4ff]">&gt;</span>{' '}
              {t('noTeams')}
            </div>
            <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('noTeamsHint')}
            </div>
            <a
              href={`/${locale}/teams/create`}
              className="btn-neon mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('createFirst')}
            </a>
          </div>
        ) : (
          /* Lista de equipes */
          <div className="space-y-3">
            {teams.map((team) => {
              if (!team) return null;
              const colors = roleColors[team.role] || roleColors.member;

              return (
                <a
                  key={team.id}
                  href={`/${locale}/teams/${team.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    {/* Icone de equipe */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#a855f7]/10">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0] group-hover:text-white">
                          {team.name}
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64748b]">
                          @{team.slug}
                        </span>
                      </div>
                      {team.description && (
                        <p className="mt-0.5 text-xs text-[#64748b]">
                          {team.description.slice(0, 80)}
                          {team.description.length > 80 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                    {/* Badge de role */}
                    <span
                      className="rounded-full px-2.5 py-0.5 font-medium"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {t(`role${team.role.charAt(0).toUpperCase() + team.role.slice(1)}` as 'roleOwner' | 'roleAdmin' | 'roleMember')}
                    </span>
                    {/* Contagem de membros */}
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {team.memberCount}
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
