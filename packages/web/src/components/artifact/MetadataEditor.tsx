'use client';

import { useState, useCallback } from 'react';

interface ArtifactMetadata {
  id: string;
  scope: string;
  name: string;
  description: string;
  keywords: string[];
  toolTargets: string[];
  license: string;
  repository: string;
  homepage: string;
  isDeprecated: boolean;
  deprecatedMessage: string;
}

interface MetadataEditorProps {
  artifact: ArtifactMetadata;
  isOwner: boolean;
  locale: string;
}

/** Componente InlineEdit genérico */
function InlineEdit({
  label,
  value,
  onSave,
  isOwner,
  type = 'text',
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  isOwner: boolean;
  type?: 'text' | 'textarea' | 'select' | 'url';
  options?: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await onSave(editValue);
      setStatus('success');
      setEditing(false);
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [editValue, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setEditing(false);
    setStatus('idle');
  }, [value]);

  const borderClass =
    status === 'success'
      ? 'border-[#00ff88]/30'
      : status === 'error'
        ? 'border-[#ff2d95]/30'
        : 'border-white/[0.06]';

  return (
    <div className={`rounded-lg border ${borderClass} bg-white/[0.02] px-3 py-2 transition-colors`}>
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
          {label}
        </span>
        {isOwner && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00d4ff] hover:underline"
          >
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          {type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded border border-white/[0.1] bg-white/[0.03] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] focus:border-[#00d4ff]/30 focus:outline-none"
              rows={3}
              placeholder={placeholder}
            />
          ) : type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded border border-white/[0.1] bg-[#0a0a0f] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] focus:border-[#00d4ff]/30 focus:outline-none"
            >
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type === 'url' ? 'url' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded border border-white/[0.1] bg-white/[0.03] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] focus:border-[#00d4ff]/30 focus:outline-none"
              placeholder={placeholder}
            />
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="rounded px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8] hover:bg-white/[0.05]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88] hover:bg-[#00ff88]/20 disabled:opacity-50"
            >
              {saving ? '...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
          {value || <span className="text-[#64748b]">-</span>}
        </p>
      )}
    </div>
  );
}

/** Editor de tags (keywords) */
function TagEditor({
  label,
  tags,
  onSave,
  isOwner,
}: {
  label: string;
  tags: string[];
  onSave: (newTags: string[]) => Promise<void>;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState(tags);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = useCallback(() => {
    const tag = inputValue.trim().toLowerCase();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
    setInputValue('');
  }, [inputValue, editTags]);

  const removeTag = useCallback((tag: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(editTags);
      setEditing(false);
    } catch {
      // Manter em modo de edição em caso de erro
    } finally {
      setSaving(false);
    }
  }, [editTags, onSave]);

  if (!editing) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {label}
          </span>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00d4ff] hover:underline"
            >
              Editar
            </button>
          )}
        </div>
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]"
              >
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">-</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#00d4ff]/20 bg-white/[0.02] px-3 py-2">
      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
        {label}
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {editTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 text-[#ff2d95] hover:text-[#ff2d95]/80"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder="Adicionar keyword..."
          className="flex-1 rounded border border-white/[0.1] bg-white/[0.03] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#e2e8f0] focus:border-[#00d4ff]/30 focus:outline-none"
        />
        <button
          onClick={addTag}
          className="rounded border border-white/[0.1] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8] hover:bg-white/[0.05]"
        >
          +
        </button>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => { setEditing(false); setEditTags(tags); }}
          className="rounded px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88] disabled:opacity-50"
        >
          {saving ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

/** Editor de checkboxes (tool targets) */
function CheckboxEditor({
  label,
  values,
  allOptions,
  onSave,
  isOwner,
}: {
  label: string;
  values: string[];
  allOptions: { value: string; label: string }[];
  onSave: (newValues: string[]) => Promise<void>;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState(values);
  const [saving, setSaving] = useState(false);

  const toggle = useCallback((value: string) => {
    setEditValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (editValues.length === 0) return;
    setSaving(true);
    try {
      await onSave(editValues);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [editValues, onSave]);

  if (!editing) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {label}
          </span>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#00d4ff] hover:underline"
            >
              Editar
            </button>
          )}
        </div>
        <div className="mt-2 space-y-1">
          {values.map((tool) => (
            <div key={tool} className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
              {tool}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#00d4ff]/20 bg-white/[0.02] px-3 py-2">
      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
        {label}
      </span>
      <div className="mt-2 space-y-2">
        {allOptions.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editValues.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="rounded border-white/[0.2] bg-white/[0.05] accent-[#00ff88]"
            />
            <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
      {editValues.length === 0 && (
        <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff2d95]">
          Selecione pelo menos 1 ferramenta
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => { setEditing(false); setEditValues(values); }}
          className="rounded px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#94a3b8]"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || editValues.length === 0}
          className="rounded border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88] disabled:opacity-50"
        >
          {saving ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

const TOOL_OPTIONS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
  { value: 'copilot-cli', label: 'Copilot CLI' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'windsurf', label: 'Windsurf' },
];

const LICENSE_OPTIONS = [
  { value: 'MIT', label: 'MIT' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'GPL-3.0', label: 'GPL 3.0' },
  { value: 'BSD-3-Clause', label: 'BSD 3-Clause' },
  { value: 'ISC', label: 'ISC' },
  { value: 'UNLICENSED', label: 'Unlicensed' },
];

export default function MetadataEditor({ artifact, isOwner, locale }: MetadataEditorProps) {
  const [meta, setMeta] = useState(artifact);
  const [showDeprecateModal, setShowDeprecateModal] = useState(false);
  const [deprecateMessage, setDeprecateMessage] = useState('');
  const [deprecateLoading, setDeprecateLoading] = useState(false);

  const patchArtifact = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/v1/artifacts/${artifact.scope}/${artifact.name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao salvar');
  }, [artifact.scope, artifact.name]);

  const handleDeprecate = useCallback(async () => {
    if (!deprecateMessage.trim()) return;
    setDeprecateLoading(true);
    try {
      await patchArtifact({ is_deprecated: true, deprecated_message: deprecateMessage });
      setMeta((prev) => ({ ...prev, isDeprecated: true, deprecatedMessage: deprecateMessage }));
      setShowDeprecateModal(false);
    } finally {
      setDeprecateLoading(false);
    }
  }, [deprecateMessage, patchArtifact]);

  const handleUndeprecate = useCallback(async () => {
    await patchArtifact({ is_deprecated: false, deprecated_message: null });
    setMeta((prev) => ({ ...prev, isDeprecated: false, deprecatedMessage: '' }));
  }, [patchArtifact]);

  return (
    <>
      {/* Keywords */}
      <TagEditor
        label="Keywords"
        tags={meta.keywords}
        onSave={async (newTags) => {
          await patchArtifact({ keywords: newTags });
          setMeta((prev) => ({ ...prev, keywords: newTags }));
        }}
        isOwner={isOwner}
      />

      {/* Tool Targets */}
      {meta.toolTargets.length > 0 && (
        <CheckboxEditor
          label="Ferramentas"
          values={meta.toolTargets}
          allOptions={TOOL_OPTIONS}
          onSave={async (newTargets) => {
            await patchArtifact({ tool_targets: newTargets });
            setMeta((prev) => ({ ...prev, toolTargets: newTargets }));
          }}
          isOwner={isOwner}
        />
      )}

      {/* License */}
      <InlineEdit
        label="Licença"
        value={meta.license}
        type="select"
        options={LICENSE_OPTIONS}
        onSave={async (newLicense) => {
          await patchArtifact({ license: newLicense });
          setMeta((prev) => ({ ...prev, license: newLicense }));
        }}
        isOwner={isOwner}
      />

      {/* Links */}
      <div className="glass rounded-2xl p-6">
        <h3 className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
          Links
        </h3>
        <div className="space-y-2">
          <a
            href={`/${locale}/u/${artifact.scope}`}
            className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
          >
            &rarr; @{artifact.scope}
          </a>

          {isOwner ? (
            <InlineEdit
              label="Repositório"
              value={meta.repository}
              type="url"
              placeholder="https://github.com/..."
              onSave={async (newUrl) => {
                await patchArtifact({ repository: newUrl });
                setMeta((prev) => ({ ...prev, repository: newUrl }));
              }}
              isOwner={isOwner}
            />
          ) : meta.repository ? (
            <a
              href={meta.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
            >
              &rarr; Repositório
            </a>
          ) : null}

          {meta.homepage && !isOwner && (
            <a
              href={meta.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="neon-link block font-[family-name:var(--font-jetbrains)] text-sm"
            >
              &rarr; Homepage
            </a>
          )}
        </div>
      </div>

      {/* Deprecação (apenas para owners) */}
      {isOwner && (
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#94a3b8]">
            Configurações
          </h3>
          {meta.isDeprecated ? (
            <div>
              <p className="mb-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff8800]">
                Artefato deprecado: {meta.deprecatedMessage}
              </p>
              <button
                onClick={handleUndeprecate}
                className="rounded border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88] hover:bg-[#00ff88]/20"
              >
                Remover Deprecação
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeprecateModal(true)}
              className="rounded border border-[#ff8800]/30 bg-[#ff8800]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-xs text-[#ff8800] hover:bg-[#ff8800]/20"
            >
              Deprecar Artefato
            </button>
          )}
        </div>
      )}

      {/* Modal de deprecação */}
      {showDeprecateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-2xl p-6">
            <h4 className="mb-4 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-[#e2e8f0]">
              Deprecar Artefato
            </h4>
            <textarea
              value={deprecateMessage}
              onChange={(e) => setDeprecateMessage(e.target.value)}
              placeholder="Mensagem de deprecação (obrigatória)"
              className="mb-4 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:border-[#00d4ff]/30 focus:outline-none"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeprecateModal(false); setDeprecateMessage(''); }}
                className="rounded-lg px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeprecate}
                disabled={!deprecateMessage.trim() || deprecateLoading}
                className="rounded-lg border border-[#ff8800]/30 bg-[#ff8800]/10 px-4 py-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#ff8800] disabled:opacity-50"
              >
                {deprecateLoading ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
