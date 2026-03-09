'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  tokenId: string;
  locale: string;
}

/**
 * Botao para revogar/deletar um token de API.
 * Mostra confirmacao antes de deletar.
 */
export function DeleteTokenButton({ tokenId, locale }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const t = useTranslations('Dashboard');

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/v1/auth/cli-token?id=${tokenId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Recarrega a pagina para atualizar a lista
        window.location.reload();
      }
    } catch {
      // Silencia erro — o usuario vera que nada mudou
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          {isDeleting ? '...' : t('confirmRevoke')}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64748b] transition-colors hover:bg-white/[0.06]"
        >
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded p-0.5 text-[#64748b] transition-colors hover:text-red-400"
      title={t('revokeToken')}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}
