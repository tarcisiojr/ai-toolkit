'use client';

import { useState, useCallback } from 'react';

interface FileEntry {
  path: string;
  size: number;
  mimeType: string;
  isText: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileEntry;
}

interface FileBrowserProps {
  files: FileEntry[];
  artifactScope: string;
  artifactName: string;
  version: string;
  isOwner: boolean;
  locale: string;
  /** Lista de versões disponíveis para o seletor */
  availableVersions?: string[];
  onVersionChange?: (version: string) => void;
}

/** Ícones por tipo de arquivo */
function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    md: '\uD83D\uDCDD',
    json: '{ }',
    js: 'JS',
    ts: 'TS',
    jsx: 'JSX',
    tsx: 'TSX',
    yaml: 'YML',
    yml: 'YML',
    png: '\uD83D\uDDBC\uFE0F',
    jpg: '\uD83D\uDDBC\uFE0F',
    jpeg: '\uD83D\uDDBC\uFE0F',
    gif: '\uD83D\uDDBC\uFE0F',
    svg: '\uD83D\uDDBC\uFE0F',
    sh: '$_',
    py: 'PY',
    css: 'CSS',
    html: 'HTML',
  };
  return iconMap[ext] || '\uD83D\uDCC4';
}

/** Formata tamanho de arquivo */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Constrói árvore de diretórios a partir de lista flat de arquivos */
function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      let existing = current.find((n) => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  // Ordenar: pastas primeiro, depois alfabético
  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortTree(n.children));
  }
  sortTree(root);

  return root;
}

/** Componente de nó da árvore */
function TreeNodeComponent({
  node,
  depth,
  selectedFile,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (file: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-white/[0.04]"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {expanded ? '\u25BE' : '\u25B8'}
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {node.name}/
          </span>
        </button>
        {expanded && node.children.map((child) => (
          <TreeNodeComponent
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  const isSelected = selectedFile === node.path;
  return (
    <button
      onClick={() => node.file && onSelect(node.file)}
      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
        isSelected ? 'bg-[#00d4ff]/10' : 'hover:bg-white/[0.04]'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs">
          {getFileIcon(node.name)}
        </span>
        <span
          className={`truncate font-[family-name:var(--font-jetbrains)] text-sm ${
            isSelected ? 'text-[#00d4ff]' : 'text-[#e2e8f0]'
          }`}
        >
          {node.name}
        </span>
      </div>
      <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#64748b]">
        {node.file && formatSize(node.file.size)}
      </span>
    </button>
  );
}

export default function FileBrowser({
  files,
  artifactScope,
  artifactName,
  version,
  isOwner,
  locale,
  availableVersions,
  onVersionChange,
}: FileBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tree = buildTree(files);

  const handleSelectFile = useCallback(async (file: FileEntry) => {
    setSelectedFile(file);
    setFileContent(null);

    if (file.isText) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/v1/artifacts/${artifactScope}/${artifactName}/versions/${version}/files/${file.path}`,
        );
        if (res.ok) {
          setFileContent(await res.text());
        }
      } catch {
        // Silenciar erros de fetch
      } finally {
        setLoading(false);
      }
    }
  }, [artifactScope, artifactName, version]);

  const handleDownload = useCallback((file: FileEntry) => {
    const url = `/api/v1/artifacts/${artifactScope}/${artifactName}/versions/${version}/files/${file.path}`;
    window.open(url, '_blank');
  }, [artifactScope, artifactName, version]);

  // Verificar se o arquivo selecionado é imagem
  const isImage = selectedFile && /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i.test(selectedFile.path);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
          Arquivos
        </h3>
        {availableVersions && availableVersions.length > 1 && onVersionChange ? (
          <select
            value={version}
            onChange={(e) => onVersionChange(e.target.value)}
            className="rounded border border-white/[0.1] bg-[#0a0a0f] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#e2e8f0] focus:border-[#00d4ff]/30 focus:outline-none"
          >
            {availableVersions.map((v) => (
              <option key={v} value={v}>v{v}</option>
            ))}
          </select>
        ) : (
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            v{version}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Árvore de arquivos */}
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          {tree.map((node) => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile?.path || null}
              onSelect={handleSelectFile}
            />
          ))}
        </div>

        {/* Painel de visualização */}
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          {!selectedFile ? (
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
              Selecione um arquivo para visualizar
            </p>
          ) : loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]" />
              <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
                Carregando...
              </span>
            </div>
          ) : isImage ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
                  {selectedFile.path}
                </span>
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="font-[family-name:var(--font-jetbrains)] text-xs text-[#00d4ff] hover:underline"
                >
                  Download
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/v1/artifacts/${artifactScope}/${artifactName}/versions/${version}/files/${selectedFile.path}`}
                alt={selectedFile.path}
                className="max-w-full rounded"
              />
            </div>
          ) : fileContent !== null ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]">
                  {selectedFile.path}
                </span>
                <div className="flex items-center gap-3">
                  {isOwner && selectedFile.isText && (
                    <button
                      className="font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88] hover:underline"
                      onClick={() => {
                        // Disparar evento para abrir editor (será implementado no FileEditor)
                        window.dispatchEvent(
                          new CustomEvent('open-editor', {
                            detail: { file: selectedFile, content: fileContent },
                          }),
                        );
                      }}
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(selectedFile)}
                    className="font-[family-name:var(--font-jetbrains)] text-xs text-[#00d4ff] hover:underline"
                  >
                    Download
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap break-all font-[family-name:var(--font-jetbrains)] text-xs leading-relaxed text-[#e2e8f0]">
                {fileContent}
              </pre>
            </div>
          ) : (
            <div>
              <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
                Este arquivo não pode ser visualizado.
              </p>
              <button
                onClick={() => handleDownload(selectedFile)}
                className="mt-2 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#00d4ff]"
              >
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
