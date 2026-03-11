'use client';

import { useState, useCallback } from 'react';
import VersionBumpModal from './VersionBumpModal';

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

  const handleSuccess = useCallback((newVersion: string) => {
    setShowUpload(false);
    onNewVersion?.();
    // Recarrega a página para exibir a nova versão
    window.location.reload();
  }, [onNewVersion]);

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

      {showUpload && (
        <VersionBumpModal
          currentVersion={latestVersion || '0.0.0'}
          artifactScope={artifactScope}
          artifactName={artifactName}
          mode="upload"
          onClose={() => setShowUpload(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
