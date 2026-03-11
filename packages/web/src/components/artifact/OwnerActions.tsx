'use client';

import { useState } from 'react';

interface OwnerActionsProps {
  artifactScope: string;
  artifactName: string;
  latestVersion: string | null;
  locale: string;
  onNewVersion?: () => void;
}

/**
 * Barra de ações do owner — exibe botões condicionais para edição e gerenciamento
 * Renderizado apenas quando isOwner=true na página do artefato
 */
export default function OwnerActions({
  artifactScope,
  artifactName,
  latestVersion,
  locale,
  onNewVersion,
}: OwnerActionsProps) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowUpload(true)}
        className="rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#00d4ff] transition-colors hover:bg-[#00d4ff]/20"
      >
        + Nova Versão
      </button>

      {latestVersion && (
        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
          Última: v{latestVersion}
        </span>
      )}
    </div>
  );
}
