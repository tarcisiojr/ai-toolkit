'use client';

import { useState, useCallback, useMemo } from 'react';
import FileUploadZone, { processFiles } from './FileUploadZone';

interface VersionBumpModalProps {
  currentVersion: string;
  artifactScope: string;
  artifactName: string;
  mode: 'inline' | 'upload';
  /** Para modo inline: conteúdo dos arquivos editados */
  changes?: Record<string, string>;
  onClose: () => void;
  onSuccess: (newVersion: string) => void;
}

/** Calcula próxima versão baseada no tipo de bump */
function bumpVersion(current: string, type: 'patch' | 'minor' | 'major'): string {
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return '1.0.0';
  const [, major, minor, patch] = match.map(Number);
  switch (type) {
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'major': return `${major + 1}.0.0`;
  }
}

/** Valida formato semver */
function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version);
}

export default function VersionBumpModal({
  currentVersion,
  artifactScope,
  artifactName,
  mode,
  changes,
  onClose,
  onSuccess,
}: VersionBumpModalProps) {
  const suggestedVersion = mode === 'inline'
    ? bumpVersion(currentVersion, 'patch')
    : bumpVersion(currentVersion, 'minor');

  const [version, setVersion] = useState(suggestedVersion);
  const [changelog, setChangelog] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para modo upload
  const [uploadFiles, setUploadFiles] = useState<ReturnType<typeof processFiles>>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isValid = isValidSemver(version) && changelog.trim().length > 0;
  const hasInvalidFiles = uploadFiles.some((f) => !f.valid);
  const canPublish = isValid && !publishing && (mode === 'inline' || (uploadFiles.length > 0 && !hasInvalidFiles));

  const handleAddFiles = useCallback((files: File[]) => {
    const processed = processFiles(files);
    setUploadFiles((prev) => [...prev, ...processed]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!canPublish) return;
    setPublishing(true);
    setError(null);
    setUploadProgress(10);

    try {
      let res: Response;

      if (mode === 'inline' && changes) {
        // Edição inline — enviar JSON com baseVersion + changes
        res = await fetch(
          `/api/v1/artifacts/${artifactScope}/${artifactName}/versions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version,
              baseVersion: currentVersion,
              changes,
              changelog,
            }),
          },
        );
      } else {
        // Upload completo — enviar FormData com files[]
        const formData = new FormData();
        formData.append('version', version);
        formData.append('changelog', changelog);

        for (const uf of uploadFiles) {
          formData.append('files[]', uf.file);
        }

        setUploadProgress(30);
        res = await fetch(
          `/api/v1/artifacts/${artifactScope}/${artifactName}/versions`,
          { method: 'POST', body: formData },
        );
      }

      setUploadProgress(90);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Erro ao publicar versão');
      }

      setUploadProgress(100);
      onSuccess(version);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  }, [canPublish, mode, changes, version, currentVersion, changelog, uploadFiles, artifactScope, artifactName, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass mx-4 w-full max-w-lg rounded-2xl p-6">
        <h4 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#e2e8f0]">
          {mode === 'inline' ? 'Salvar como Nova Versão' : 'Nova Versão'}
        </h4>

        {/* Campo de versão */}
        <div className="mb-4">
          <label className="mb-1 block font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            Versão
          </label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className={`w-full rounded-lg border bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] focus:outline-none ${
              isValidSemver(version) ? 'border-white/[0.1] focus:border-[#00d4ff]/30' : 'border-[#ff2d95]/30'
            }`}
            placeholder="1.0.0"
          />
          {!isValidSemver(version) && version && (
            <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff2d95]">
              Formato inválido. Use semver (ex: 1.0.0)
            </p>
          )}
        </div>

        {/* Campo de changelog */}
        <div className="mb-4">
          <label className="mb-1 block font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            Changelog (obrigatório)
          </label>
          <textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="Descreva as alterações desta versão..."
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:border-[#00d4ff]/30 focus:outline-none"
            rows={3}
          />
        </div>

        {/* Zona de upload (apenas para modo upload) */}
        {mode === 'upload' && (
          <div className="mb-4">
            <FileUploadZone
              onFilesSelected={handleAddFiles}
              selectedFiles={uploadFiles}
              onRemoveFile={handleRemoveFile}
              uploading={publishing}
              uploadProgress={uploadProgress}
            />
          </div>
        )}

        {/* Erro */}
        {error && (
          <p className="mb-4 rounded-lg border border-[#ff2d95]/20 bg-[#ff2d95]/[0.05] p-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff2d95]">
            {error}
          </p>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={publishing}
            className="rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.05] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className="rounded-lg border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#00ff88] transition-colors hover:bg-[#00ff88]/20 disabled:opacity-50"
          >
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
