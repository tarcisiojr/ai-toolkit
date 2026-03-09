'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

/* Tipos de artefatos disponiveis */
const ARTIFACT_TYPES = [
  { value: 'skill', color: '#00d4ff', label: 'Skill' },
  { value: 'mcp', color: '#00ff88', label: 'MCP Server' },
  { value: 'config', color: '#ff8800', label: 'Config' },
  { value: 'hook', color: '#ff2d95', label: 'Hook' },
  { value: 'template', color: '#a855f7', label: 'Template' },
] as const;

/* Ferramentas alvo disponiveis */
const TOOL_TARGETS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
  { value: 'copilot', label: 'GitHub Copilot' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'windsurf', label: 'Windsurf' },
] as const;

function PublishContent() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'pt-BR';
  const t = useTranslations('Publish');

  // Estado do formulario
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('skill');
  const [description, setDescription] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [toolTargets, setToolTargets] = useState<string[]>(['claude-code']);
  const [repository, setRepository] = useState('');
  const [license, setLicense] = useState('MIT');

  // Estado de feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adiciona uma keyword ao pressionar Enter ou virgula
  function handleKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = keywordsInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (tag && !keywords.includes(tag) && keywords.length < 10) {
        setKeywords([...keywords, tag]);
        setKeywordsInput('');
      }
    }
  }

  // Remove uma keyword
  function removeKeyword(tag: string) {
    setKeywords(keywords.filter(k => k !== tag));
  }

  // Toggle de ferramenta alvo
  function toggleToolTarget(tool: string) {
    setToolTargets(prev =>
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  }

  // Valida o nome do artefato
  function validateName(value: string): boolean {
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) || /^[a-z0-9]$/.test(value);
  }

  // Envia o formulario
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validacoes do lado do cliente
    if (!name.trim()) {
      setError(t('errorNameRequired'));
      return;
    }
    if (!validateName(name)) {
      setError(t('errorNameInvalid'));
      return;
    }
    if (!description.trim()) {
      setError(t('errorDescRequired'));
      return;
    }
    if (description.trim().length < 10) {
      setError(t('errorDescTooShort'));
      return;
    }
    if (toolTargets.length === 0) {
      setError(t('errorToolRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Busca o username do usuario para usar como scope
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(t('errorNotAuth'));
        router.push(`/${locale}/login`);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (!profile?.username) {
        setError(t('errorNoUsername'));
        return;
      }

      const scope = profile.username;

      // Cria o artefato via API
      const response = await fetch('/api/v1/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          name: name.trim(),
          type,
          description: description.trim(),
          visibility,
          keywords,
          toolTargets,
          repository: repository.trim() || null,
          license: license || 'MIT',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'ARTIFACT_EXISTS') {
          setError(t('errorExists'));
        } else {
          setError(data.error?.message || t('errorGeneric'));
        }
        return;
      }

      // Redireciona para a pagina do artefato
      router.push(`/${locale}/${scope}/${name.trim()}`);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Cor selecionada do tipo
  const selectedTypeColor = ARTIFACT_TYPES.find(t => t.value === type)?.color || '#00d4ff';

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
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
        <h2 className="mt-4 text-3xl font-bold">
          <span className="text-[#00d4ff]">&gt;</span> {t('title')}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
          {t('subtitle')}
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

        {/* Nome do artefato */}
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
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-awesome-skill"
            maxLength={50}
            className="mt-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
          />
          {name && !validateName(name) && (
            <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff8800]">
              {t('nameValidation')}
            </p>
          )}
        </div>

        {/* Tipo de artefato */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('typeLabel')}
          </label>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('typeHint')}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {ARTIFACT_TYPES.map((artifactType) => (
              <button
                key={artifactType.value}
                type="button"
                onClick={() => setType(artifactType.value)}
                className={`rounded-xl border px-4 py-3 font-[family-name:var(--font-jetbrains)] text-xs transition-all duration-200 ${
                  type === artifactType.value
                    ? 'font-semibold'
                    : 'border-white/[0.06] bg-white/[0.02] text-[#64748b] hover:border-white/[0.12] hover:text-[#94a3b8]'
                }`}
                style={
                  type === artifactType.value
                    ? {
                        borderColor: `${artifactType.color}50`,
                        backgroundColor: `${artifactType.color}15`,
                        color: artifactType.color,
                        boxShadow: `0 0 12px ${artifactType.color}20`,
                      }
                    : undefined
                }
              >
                {artifactType.label}
              </button>
            ))}
          </div>
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

        {/* Keywords */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('keywordsLabel')}
          </label>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('keywordsHint')}
          </p>
          <div className="mt-3">
            {/* Tags existentes */}
            {keywords.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {keywords.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs"
                    style={{
                      backgroundColor: `${selectedTypeColor}15`,
                      color: selectedTypeColor,
                      border: `1px solid ${selectedTypeColor}30`,
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeKeyword(tag)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder={t('keywordsPlaceholder')}
              disabled={keywords.length >= 10}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Visibilidade */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('visibilityLabel')}
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${
                visibility === 'public'
                  ? 'border-[#00ff88]/40 bg-[#00ff88]/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={visibility === 'public' ? '#00ff88' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <div className="text-left">
                <div className={`font-[family-name:var(--font-jetbrains)] text-xs font-semibold ${visibility === 'public' ? 'text-[#00ff88]' : 'text-[#94a3b8]'}`}>
                  {t('public')}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
                  {t('publicDesc')}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${
                visibility === 'private'
                  ? 'border-[#ff8800]/40 bg-[#ff8800]/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={visibility === 'private' ? '#ff8800' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div className="text-left">
                <div className={`font-[family-name:var(--font-jetbrains)] text-xs font-semibold ${visibility === 'private' ? 'text-[#ff8800]' : 'text-[#94a3b8]'}`}>
                  {t('private')}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
                  {t('privateDesc')}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Ferramentas alvo */}
        <div className="glass rounded-2xl p-6">
          <label className="block font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('toolsLabel')}
          </label>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t('toolsHint')}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TOOL_TARGETS.map((tool) => {
              const isSelected = toolTargets.includes(tool.value);
              return (
                <button
                  key={tool.value}
                  type="button"
                  onClick={() => toggleToolTarget(tool.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 font-[family-name:var(--font-jetbrains)] text-xs transition-all duration-200 ${
                    isSelected
                      ? 'border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]'
                      : 'border-white/[0.06] bg-white/[0.02] text-[#64748b] hover:border-white/[0.12] hover:text-[#94a3b8]'
                  }`}
                >
                  {/* Checkbox visual */}
                  <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-[#00d4ff] bg-[#00d4ff]'
                      : 'border-white/[0.15]'
                  }`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campos opcionais */}
        <div className="glass rounded-2xl p-6">
          <h4 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('optionalFields')}
          </h4>

          <div className="mt-4 space-y-4">
            {/* Repositorio */}
            <div>
              <label className="block font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                {t('repoLabel')}
              </label>
              <input
                type="url"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
              />
            </div>

            {/* Licenca */}
            <div>
              <label className="block font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                {t('licenseLabel')}
              </label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] transition-colors focus:border-[#00d4ff]/50 focus:outline-none"
              >
                <option value="MIT">MIT</option>
                <option value="Apache-2.0">Apache 2.0</option>
                <option value="GPL-3.0">GPL 3.0</option>
                <option value="BSD-3-Clause">BSD 3-Clause</option>
                <option value="ISC">ISC</option>
                <option value="UNLICENSED">Unlicensed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview do artefato */}
        <div className="glass rounded-2xl p-6">
          <h4 className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            {t('preview')}
          </h4>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${selectedTypeColor}15` }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedTypeColor }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                    @scope/{name || 'artifact-name'}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] font-medium"
                    style={{
                      backgroundColor: `${selectedTypeColor}15`,
                      color: selectedTypeColor,
                    }}
                  >
                    {type}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] ${
                    visibility === 'public'
                      ? 'bg-[#00ff88]/10 text-[#00ff88]'
                      : 'bg-[#ff8800]/10 text-[#ff8800]'
                  }`}>
                    {visibility}
                  </span>
                </div>
                <p className="mt-0.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {description || t('descPlaceholder')}
                </p>
              </div>
            </div>
            {keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {keywords.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/[0.04] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#94a3b8]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {toolTargets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {toolTargets.map(tool => (
                  <span
                    key={tool}
                    className="rounded bg-[#00d4ff]/10 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00d4ff]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Terminal hint */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            <span className="text-[#94a3b8]">{t('cliAlternative')}</span>
          </p>
          <div className="mt-2 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            <span className="text-[#00ff88]">$</span> aitk publish{' '}
            <span className="text-[#64748b]">--name</span>{' '}
            <span className="text-[#a855f7]">{name || 'my-artifact'}</span>{' '}
            <span className="text-[#64748b]">--type</span>{' '}
            <span className="text-[#a855f7]">{type}</span>
          </div>
        </div>

        {/* Botao de submissao */}
        <div className="flex items-center justify-end gap-4">
          <a
            href={`/${locale}/dashboard`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.06]"
          >
            {t('cancel')}
          </a>
          <button
            type="submit"
            disabled={isSubmitting || !name || !description}
            className="btn-solid flex items-center gap-2 rounded-lg px-6 py-3 font-[family-name:var(--font-jetbrains)] text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" />
                </svg>
                {t('publishing')}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {t('publishButton')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Pagina de publicacao de artefatos.
 * Client component com Suspense boundary.
 */
export default function PublishPage() {
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
      <PublishContent />
    </Suspense>
  );
}
