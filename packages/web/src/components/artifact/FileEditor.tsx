'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Tipos para o editor
interface FileEditorProps {
  filePath: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

/** Detecta extensão de linguagem do CodeMirror por extensão de arquivo */
function getLanguageExtension(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, () => Promise<unknown>> = {
    md: async () => {
      const { markdown } = await import('@codemirror/lang-markdown');
      return markdown();
    },
    json: async () => {
      const { json } = await import('@codemirror/lang-json');
      return json();
    },
    yaml: async () => {
      const { yaml } = await import('@codemirror/lang-yaml');
      return yaml();
    },
    yml: async () => {
      const { yaml } = await import('@codemirror/lang-yaml');
      return yaml();
    },
    js: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript();
    },
    jsx: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ jsx: true });
    },
    ts: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true });
    },
    tsx: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ jsx: true, typescript: true });
    },
  };
  return langMap[ext] || null;
}

/** Componente interno do editor (carregado via dynamic import) */
function FileEditorInner({ filePath, initialContent, onSave, onCancel }: FileEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<unknown>(null);
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('editor');
  const isMarkdown = filePath.endsWith('.md');

  useEffect(() => {
    if (!editorRef.current) return;

    let destroyed = false;

    async function initEditor() {
      const { EditorView, basicSetup } = await import('codemirror');
      const { EditorState } = await import('@codemirror/state');
      const { oneDark } = await import('@codemirror/theme-one-dark');

      if (destroyed || !editorRef.current) return;

      // Carregar extensão de linguagem
      const langLoader = getLanguageExtension(filePath);
      const langExtension = langLoader ? await langLoader() : null;

      const extensions = [
        basicSetup,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            backgroundColor: 'transparent',
            fontSize: '13px',
            fontFamily: 'var(--font-jetbrains), monospace',
          },
          '.cm-gutters': {
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(0,212,255,0.08)',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(0,212,255,0.04)',
          },
          '.cm-cursor': {
            borderLeftColor: '#00d4ff',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(0,212,255,0.15) !important',
          },
        }),
      ];

      if (langExtension) {
        extensions.push(langExtension as unknown as typeof basicSetup);
      }

      const state = EditorState.create({
        doc: initialContent,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: editorRef.current!,
      });

      viewRef.current = view;
    }

    initEditor();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        (viewRef.current as { destroy: () => void }).destroy();
        viewRef.current = null;
      }
    };
  }, [filePath, initialContent]);

  const handleSave = useCallback(() => {
    onSave(content);
  }, [content, onSave]);

  return (
    <div className="glass rounded-2xl p-4">
      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
            {filePath}
          </span>
          {isMarkdown && (
            <div className="flex rounded border border-white/[0.1]">
              {(['editor', 'split', 'preview'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] transition-colors ${mode === 'split' ? 'hidden sm:inline-flex' : ''} ${
                    viewMode === mode
                      ? 'bg-[#00d4ff]/10 text-[#00d4ff]'
                      : 'text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  {mode === 'editor' ? 'Editor' : mode === 'split' ? 'Split' : 'Preview'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8] hover:bg-white/[0.05]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="rounded border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88] hover:bg-[#00ff88]/20"
          >
            Salvar como nova versão
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className={`grid gap-4 ${isMarkdown && viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor */}
        {viewMode !== 'preview' && (
          <div
            ref={editorRef}
            className="max-h-[400px] sm:max-h-[600px] overflow-auto rounded-lg border border-white/[0.06] bg-[#0a0a0f]"
          />
        )}

        {/* Preview (Markdown) */}
        {isMarkdown && viewMode !== 'editor' && (
          <div className="max-h-[400px] sm:max-h-[600px] overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: simpleMarkdownToHtml(content),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Renderização simples de Markdown para preview (sem dependência extra) */
function simpleMarkdownToHtml(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold e italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.slice(3, -3).replace(/^\w+\n/, '');
      return `<pre><code>${code.replace(/</g, '&lt;')}</code></pre>`;
    })
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

/** Export com dynamic import para lazy loading */
export default dynamic(() => Promise.resolve(FileEditorInner), {
  ssr: false,
  loading: () => (
    <div className="glass flex items-center gap-2 rounded-2xl p-8">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]" />
      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
        Carregando editor...
      </span>
    </div>
  ),
});
