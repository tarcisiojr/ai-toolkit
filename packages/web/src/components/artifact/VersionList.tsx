'use client';

import { useState, useCallback } from 'react';

interface Version {
  id: string;
  version: string;
  changelog: string | null;
  file_size: number;
  is_yanked: boolean;
  yanked_reason: string | null;
  created_at: string;
  published_at: string;
}

interface VersionListProps {
  versions: Version[];
  latestVersion: string | null;
  artifactScope: string;
  artifactName: string;
  isOwner: boolean;
  locale: string;
}

export default function VersionList({
  versions,
  latestVersion,
  artifactScope,
  artifactName,
  isOwner,
  locale,
}: VersionListProps) {
  const [versionList, setVersionList] = useState(versions);
  const [yankingVersion, setYankingVersion] = useState<string | null>(null);
  const [yankReason, setYankReason] = useState('');
  const [showYankModal, setShowYankModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleYank = useCallback(async () => {
    if (!yankingVersion || !yankReason.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/artifacts/${artifactScope}/${artifactName}/versions/${yankingVersion}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isYanked: true, yankedReason: yankReason }),
        },
      );

      if (res.ok) {
        setVersionList((prev) =>
          prev.map((v) =>
            v.version === yankingVersion
              ? { ...v, is_yanked: true, yanked_reason: yankReason }
              : v,
          ),
        );
        setShowYankModal(false);
        setYankReason('');
        setYankingVersion(null);
      }
    } finally {
      setLoading(false);
    }
  }, [yankingVersion, yankReason, artifactScope, artifactName]);

  const handleRestore = useCallback(async (version: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/artifacts/${artifactScope}/${artifactName}/versions/${version}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isYanked: false }),
        },
      );

      if (res.ok) {
        setVersionList((prev) =>
          prev.map((v) =>
            v.version === version
              ? { ...v, is_yanked: false, yanked_reason: null }
              : v,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [artifactScope, artifactName]);

  // Visitantes não veem versões yanked
  const displayVersions = isOwner
    ? versionList
    : versionList.filter((v) => !v.is_yanked);

  if (displayVersions.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
          Versões
        </h3>
        <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
          Nenhuma versão publicada.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
        Versões ({displayVersions.length})
      </h3>

      <div className="space-y-3">
        {displayVersions.map((v) => (
          <div
            key={v.id}
            className={`rounded-lg border px-4 py-3 ${
              v.is_yanked
                ? 'border-[#ff8800]/20 bg-[#ff8800]/[0.03]'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0]">
                  v{v.version}
                </span>
                {v.version === latestVersion && !v.is_yanked && (
                  <span className="rounded bg-[#00ff88]/10 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00ff88]">
                    latest
                  </span>
                )}
                {v.is_yanked && (
                  <span className="rounded bg-[#ff8800]/10 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff8800]">
                    yanked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {v.file_size && <span>{(v.file_size / 1024).toFixed(1)} KB</span>}
                  <span>{new Date(v.created_at).toLocaleDateString(locale)}</span>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    {v.is_yanked ? (
                      <button
                        onClick={() => handleRestore(v.version)}
                        disabled={loading}
                        className="rounded border border-[#00ff88]/20 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00ff88] transition-colors hover:bg-[#00ff88]/10 disabled:opacity-50"
                      >
                        Restaurar
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setYankingVersion(v.version);
                          setShowYankModal(true);
                        }}
                        disabled={loading}
                        className="rounded border border-[#ff8800]/20 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff8800] transition-colors hover:bg-[#ff8800]/10 disabled:opacity-50"
                      >
                        Yank
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {v.changelog && (
              <div className="mt-2 border-t border-white/[0.04] pt-2">
                <p className="font-[family-name:var(--font-jetbrains)] text-xs leading-relaxed text-[#64748b]">
                  {v.changelog}
                </p>
              </div>
            )}

            {v.is_yanked && v.yanked_reason && (
              <div className="mt-2 border-t border-[#ff8800]/10 pt-2">
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#ff8800]">
                  Motivo: {v.yanked_reason}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de yank */}
      {showYankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-2xl p-6">
            <h4 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#e2e8f0]">
              Yank versão v{yankingVersion}
            </h4>
            <p className="mb-4 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
              Informe o motivo para retirar esta versão. Ela ficará oculta para outros usuários.
            </p>
            <textarea
              value={yankReason}
              onChange={(e) => setYankReason(e.target.value)}
              placeholder="Motivo do yank (obrigatório)"
              className="mb-4 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:border-[#00d4ff]/30 focus:outline-none"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowYankModal(false);
                  setYankReason('');
                  setYankingVersion(null);
                }}
                className="rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                onClick={handleYank}
                disabled={!yankReason.trim() || loading}
                className="rounded-lg border border-[#ff8800]/30 bg-[#ff8800]/10 px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#ff8800] transition-colors hover:bg-[#ff8800]/20 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Confirmar Yank'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
