'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

function CreateTeamContent() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'pt-BR';
  const t = useTranslations('Teams');

  // Estado do formulario
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Estado de feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gera o slug a partir do nome
  function handleNameChange(value: string) {
    setName(value);
    // Auto-gerar slug a partir do nome
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generatedSlug);
  }

  // Valida o formato do slug
  function validateSlug(value: string): boolean {
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value) || /^[a-z0-9]$/.test(value);
  }

  // Envia o formulario
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validacoes do lado do cliente
    if (!slug.trim()) {
      setError(t('errorSlugRequired'));
      return;
    }
    if (!validateSlug(slug)) {
      setError(t('errorSlugInvalid'));
      return;
    }
    if (!name.trim()) {
      setError(t('errorNameRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Verifica se o usuario esta autenticado
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(t('errorNotAuth'));
        router.push(`/${locale}/login`);
        return;
      }

      // Busca o token de API para autenticacao
      const { data: { session } } = await supabase.auth.getSession();

      // Cria a equipe via API
      const response = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'TEAM_EXISTS') {
          setError(t('errorExists'));
        } else {
          setError(data.error?.message || t('errorGeneric'));
        }
        return;
      }

      // Redireciona para a pagina de detalhe da equipe
      router.push(`/${locale}/teams/${slug.trim()}`);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
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
        <h2 className="mt-4 text-3xl font-bold">
          <span className="text-[#00d4ff]">&gt;</span> {t('createTitle')}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
          {t('createSubtitle')}
        </p>
      </div>

      <div className="divider-gradient my-8" />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mensagem de erro */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-red-400">
            <span className="mr-2">!</span> {error}
          </div>
        )}

        {/* Nome da equipe */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('nameLabel')}
          </label>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('nameHint')}
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Awesome Team"
            maxLength={100}
            className="mt-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
          />
        </div>

        {/* Slug da equipe */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('slugLabel')}
          </label>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('slugHint')}
          </p>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-awesome-team"
            maxLength={39}
            className="mt-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
          />
          {slug && !validateSlug(slug) && (
            <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff8800]">
              {t('slugValidation')}
            </p>
          )}
        </div>

        {/* Descricao */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('descLabel')}
          </label>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('descHint')}
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descPlaceholder')}
            rows={3}
            maxLength={500}
            className="mt-3 w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
          />
          <div className="mt-1 text-right font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
            {description.length}/500
          </div>
        </div>

        {/* Preview */}
        <div className="glass rounded-2xl p-6">
          <h4 className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            Preview
          </h4>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
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
                  <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                    {name || 'Team Name'}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64748b]">
                    @{slug || 'team-slug'}
                  </span>
                </div>
                <p className="mt-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {description || t('descPlaceholder')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botoes de acao */}
        <div className="flex items-center justify-end gap-4">
          <a
            href={`/${locale}/teams`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.06]"
          >
            {t('cancel')}
          </a>
          <button
            type="submit"
            disabled={isSubmitting || !slug || !name}
            className="btn-solid flex items-center gap-2 rounded-lg px-6 py-3 font-[family-name:var(--font-jetbrains)] text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" />
                </svg>
                {t('creating')}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('createButton')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Pagina de criacao de equipe.
 * Client component com Suspense boundary.
 */
export default function CreateTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
            Carregando...
          </div>
        </div>
      }
    >
      <CreateTeamContent />
    </Suspense>
  );
}
