'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  locale: string;
}

/**
 * Botao para criar um novo token de API.
 * Exibe um modal com o token gerado apos a criacao.
 */
export function CreateTokenButton({ locale }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Dashboard');

  async function handleCreate() {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/cli-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName || 'Web Token' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || t('tokenCreateError'));
        return;
      }

      // O token e retornado apenas uma vez
      setNewToken(data.data.token);
    } catch {
      setError(t('tokenCreateError'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose() {
    setShowModal(false);
    setNewToken(null);
    setTokenName('');
    setError(null);
    // Recarrega a pagina para atualizar a lista de tokens
    window.location.reload();
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#94a3b8] transition-colors hover:border-[#a855f7]/30 hover:text-[#a855f7]"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('newToken')}
      </button>

      {/* Modal de criacao de token */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-2xl p-6">
            <h4 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#e2e8f0]">
              {t('createToken')}
            </h4>
            <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('createTokenDesc')}
            </p>

            {!newToken ? (
              /* Formulario de criacao */
              <div className="mt-4">
                <label className="block font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
                  {t('tokenName')}
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="Ex: My CLI Token"
                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:border-[#a855f7]/50 focus:outline-none"
                />

                {error && (
                  <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-red-400">
                    {error}
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => { setShowModal(false); setTokenName(''); setError(null); }}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8] transition-colors hover:bg-white/[0.06]"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="btn-solid rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-xs disabled:opacity-50"
                  >
                    {isCreating ? t('creating') : t('create')}
                  </button>
                </div>
              </div>
            ) : (
              /* Token gerado com sucesso */
              <div className="mt-4">
                <div className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 p-3">
                  <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88]">
                    {t('tokenCreatedSuccess')}
                  </p>
                </div>

                <div className="mt-3">
                  <label className="block font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
                    Token
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newToken}
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#e2e8f0]"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8] transition-colors hover:text-[#00d4ff]"
                    >
                      {copied ? t('copied') : t('copy')}
                    </button>
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff8800]">
                    {t('tokenWarning')}
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleClose}
                    className="btn-solid rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-xs"
                  >
                    {t('done')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
