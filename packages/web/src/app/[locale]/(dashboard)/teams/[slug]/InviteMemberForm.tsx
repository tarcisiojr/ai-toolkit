'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

interface Props {
  teamSlug: string;
  locale: string;
}

/**
 * Formulario para convidar um membro para a equipe.
 * Disponivel apenas para owners e admins.
 */
export function InviteMemberForm({ teamSlug, locale }: Props) {
  const [username, setUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Teams');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!username.trim()) return;

    setIsInviting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/v1/teams/${teamSlug}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          role: 'member',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || t('inviteError'));
        return;
      }

      setSuccess(true);
      setUsername('');

      // Recarrega a pagina para atualizar a lista de membros
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setError(t('inviteError'));
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h4 className="mb-3 font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#94a3b8]">
        {t('inviteMember')}
      </h4>

      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t('usernamePlaceholder')}
          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isInviting || !username.trim()}
          className="btn-neon flex items-center gap-1.5 rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-xs disabled:opacity-50"
        >
          {isInviting ? (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" />
              </svg>
              {t('inviting')}
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('invite')}
            </>
          )}
        </button>
      </form>

      {/* Mensagem de sucesso */}
      {success && (
        <div className="mt-2 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88]">
          {t('inviteSuccess')}
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
