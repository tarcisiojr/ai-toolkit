'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadFile {
  file: File;
  path: string;
  size: number;
  valid: boolean;
  error?: string;
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: UploadFile[];
  onRemoveFile: (index: number) => void;
  uploading: boolean;
  uploadProgress: number;
}

/** Formata tamanho de arquivo */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadZone({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
  uploading,
  uploadProgress,
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files: File[] = [];

    // Suporte a pastas via DataTransferItemList
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    } else {
      files.push(...Array.from(e.dataTransfer.files));
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input para permitir re-selecionar os mesmos arquivos
    e.target.value = '';
  }, [onFilesSelected]);

  const hasInvalidFiles = selectedFiles.some((f) => !f.valid);

  return (
    <div>
      {/* Zona de drag & drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-[#00d4ff] bg-[#00d4ff]/[0.05]'
            : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
          Máximo 5MB por arquivo, 50MB total
        </p>
      </div>

      {/* Lista de arquivos selecionados */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((f, i) => (
            <div
              key={`${f.path}-${i}`}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                f.valid
                  ? 'border-white/[0.06] bg-white/[0.02]'
                  : 'border-[#ff2d95]/20 bg-[#ff2d95]/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="truncate font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                  {f.path}
                </span>
                <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {formatSize(f.size)}
                </span>
                {f.error && (
                  <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff2d95]">
                    {f.error}
                  </span>
                )}
              </div>
              {!uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(i); }}
                  className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff2d95] hover:text-[#ff2d95]/80"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progresso de upload */}
      {uploading && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                background: 'linear-gradient(to right, #00d4ff, #00ff88)',
              }}
            />
          </div>
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            Enviando... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {/* Aviso de arquivos inválidos */}
      {hasInvalidFiles && (
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff2d95]">
          Corrija os erros acima antes de publicar
        </p>
      )}
    </div>
  );
}

/** Helper para processar arquivos selecionados e adicionar metadados */
export function processFiles(files: File[]): UploadFile[] {
  return files.map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
    size: file.size,
    valid: file.size <= MAX_FILE_SIZE,
    error: file.size > MAX_FILE_SIZE ? 'Excede 5MB' : undefined,
  }));
}
