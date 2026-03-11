## Context

O portal web do AI Toolkit hoje opera como vitrine read-only. Artefatos são publicados exclusivamente via CLI (`aitk publish`), que empacota os arquivos em `.tgz` e faz upload para o Supabase Storage. A página de detalhe do artefato (`/a/[scope]/[name]`) exibe metadados e versões mas não oferece nenhuma ação de edição. A API PATCH para metadados já existe mas não tem UI correspondente.

**Stack atual**: Next.js 15 (App Router), Tailwind CSS 4, Supabase (Auth + DB + Storage), sem biblioteca de componentes (tudo custom).

**Storage atual**: Bucket `artifact-files` aceita apenas `application/gzip`. Caminho: `public/{scope}/{name}/{version}.tgz`.

**Restrição chave**: Versões são imutáveis — qualquer alteração cria uma nova versão.

## Goals / Non-Goals

**Goals:**
- Permitir edição completa de artefatos textuais pelo portal (Markdown, JSON, YAML, código)
- Suportar criação de novas versões tanto por edição inline quanto por upload de arquivos
- Exibir estrutura interna de arquivos de qualquer versão
- Manter compatibilidade total com CLI (sem breaking changes)
- Funcionar para todos os tipos de artefato (skill, mcp, config, hook, template)

**Non-Goals:**
- Editor colaborativo em tempo real (múltiplos usuários editando simultaneamente)
- Execução/preview de MCP servers ou hooks no portal
- Versionamento de metadados (metadados são mutáveis in-place, apenas conteúdo é versionado)
- Diff visual entre versões (pode ser adicionado depois)
- Edição de arquivos binários (apenas upload/download)

## Decisions

### 1. Storage dual: tarball + arquivos individuais

**Decisão**: Manter `.tgz` para download/CLI e adicionar storage de arquivos individuais por versão.

**Estrutura**:
```
artifact-files/public/{scope}/{name}/
├── 1.0.0.tgz                    ← tarball (CLI download)
├── 1.0.0/                       ← arquivos individuais (portal)
│   ├── aitk-artifact.json
│   ├── SKILL.md
│   └── prompts/setup.md
```

**Alternativas consideradas**:
- *Só tarball, extrair on-the-fly*: Simples mas lento — cada leitura de arquivo exigiria download + descompactação do tgz inteiro. Inviável para editor responsivo.
- *Só arquivos individuais, gerar tgz on-the-fly*: Elimina duplicação mas adiciona latência no download pela CLI e complexidade de gerar tgz em edge function.
- *Dual storage (escolhido)*: Duplica dados mas mantém cada caminho otimizado para seu caso de uso. O overhead de storage é mínimo (artefatos são pequenos).

**Implementação**:
- Ao publicar via CLI (upload de .tgz): backend extrai arquivos individuais automaticamente
- Ao publicar via portal (upload de arquivos): backend gera .tgz automaticamente
- Extração/empacotamento acontecem server-side nas API routes

### 2. Tabela `version_files` como índice

**Decisão**: Criar tabela `version_files` no banco para indexar os arquivos de cada versão, evitando chamadas ao Storage para listar diretórios.

```sql
CREATE TABLE version_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,           -- caminho relativo (ex: "prompts/setup.md")
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_text BOOLEAN NOT NULL DEFAULT true,
  storage_path TEXT NOT NULL,        -- caminho no Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(version_id, file_path)
);
```

**Alternativa**: Listar direto do Supabase Storage via API. Descartado porque a API de listagem do Storage é limitada (sem recursão, paginação fraca) e adiciona latência.

### 3. CodeMirror 6 para editor

**Decisão**: Usar CodeMirror 6 como base do editor inline.

**Alternativas**:
- *Monaco Editor (VS Code)*: Mais features, mas ~2MB de bundle. Overkill para edição pontual de arquivos.
- *CodeMirror 6 (escolhido)*: ~150KB, modular, bom suporte a Markdown/JSON/YAML, extensível, mobile-friendly.
- *Textarea simples*: Insuficiente — sem syntax highlighting, sem line numbers.

**Extensões CodeMirror por tipo**:
- `.md`: `@codemirror/lang-markdown` + preview panel
- `.json`: `@codemirror/lang-json` + validação
- `.yaml/.yml`: `@codemirror/lang-yaml`
- `.js/.ts`: `@codemirror/lang-javascript`
- `.sh`: `@codemirror/lang-shell` (se disponível) ou plain text
- Outros: plain text com line numbers

### 4. Fluxo de edição → nova versão

**Decisão**: Edição de arquivo sempre resulta em nova versão. O fluxo:

1. Owner abre arquivo para edição → carrega conteúdo da versão latest
2. Edita no CodeMirror
3. Clica "Salvar como nova versão"
4. Modal pede: número da versão (sugere patch bump) + changelog
5. Backend:
   a. Copia todos os arquivos da versão base para nova pasta no Storage
   b. Sobrescreve o(s) arquivo(s) editado(s)
   c. Gera novo `.tgz` com todos os arquivos
   d. Cria registro em `artifact_versions` + `version_files`
   e. Atualiza `latest_version` no artefato

**Por que copiar arquivos**: Cada versão precisa ser auto-contida. Se o usuário editou apenas `SKILL.md`, a nova versão ainda precisa ter todos os outros arquivos intactos.

### 5. Upload de nova versão pelo portal

**Decisão**: Dois modos de criação de versão via portal:

**Modo A — Edição inline**: Descrito acima. Edita 1+ arquivos, cria versão com patch bump.

**Modo B — Upload completo**: Drag & drop zone que aceita múltiplos arquivos. O usuário pode:
- Fazer upload de arquivos soltos (portal monta a estrutura)
- Fazer upload de um `.tgz` pronto (mesmo fluxo do CLI)

Em ambos os casos, o `aitk-artifact.json` é requerido (exceto se baseado em versão anterior — aí o manifest é herdado).

### 6. Modo owner na página do artefato

**Decisão**: Reutilizar a página existente `/a/[scope]/[name]` adicionando ações condicionais, em vez de criar página separada `/edit`.

**Implementação**:
- Server component verifica se o usuário logado é owner (compara `user.id` com `owner_user_id` ou team membership)
- Se owner: renderiza botões de ação (editar, nova versão, yank) inline
- Componentes de edição são client components carregados via dynamic import (não aumentam bundle para visitantes)

**Alternativa descartada**: Página `/edit` separada — fragmentaria a experiência, o owner teria que navegar entre duas URLs.

### 7. APIs de arquivos

**Novas rotas**:

```
GET  /api/v1/artifacts/:scope/:name/versions/:version/files
     → Lista arquivos da versão (da tabela version_files)
     → Response: { files: [{ path, size, mimeType, isText }] }

GET  /api/v1/artifacts/:scope/:name/versions/:version/files/:path+
     → Conteúdo de um arquivo específico
     → Se isText: retorna conteúdo como text/plain
     → Se binário: retorna signed URL para download

POST /api/v1/artifacts/:scope/:name/versions
     → MODIFICAR rota existente para aceitar:
       a) FormData com field "file" (.tgz) — fluxo atual CLI
       b) FormData com fields "files[]" (múltiplos arquivos) — fluxo portal
       c) JSON com "baseVersion" + "changes" — fluxo edição inline

PATCH /api/v1/artifacts/:scope/:name/versions/:version
     → Yank/restore: { isYanked: boolean, yankedReason?: string }
```

### 8. Bucket storage migration

**Decisão**: Atualizar MIME types permitidos e adicionar policies para subpastas.

```sql
-- Ampliar MIME types aceitos
UPDATE storage.buckets
SET allowed_mime_types = NULL  -- aceitar qualquer tipo
WHERE name = 'artifact-files';

-- Ou lista explícita se preferir controle:
-- 'application/gzip', 'text/*', 'application/json',
-- 'application/yaml', 'image/*', 'application/octet-stream'
```

Optar por `NULL` (sem restrição) simplifica — o controle de o que pode ser uploaded fica na API, não no bucket.

## Risks / Trade-offs

**[Duplicação de storage]** → Cada versão terá o .tgz + arquivos individuais, duplicando espaço. Mitigação: artefatos são tipicamente pequenos (<1MB). Monitorar uso e considerar cleanup de versões antigas no futuro.

**[Consistência entre .tgz e arquivos]** → Se a extração/geração falhar, pode haver inconsistência. Mitigação: operação atômica — se qualquer passo falhar, a versão inteira não é criada (transaction no DB + cleanup no Storage).

**[Bundle size do CodeMirror]** → ~150KB adicionais no bundle do portal. Mitigação: dynamic import — só carrega quando owner clica em editar. Visitantes não são afetados.

**[Complexidade do fluxo edição→versão]** → Copiar arquivos entre versões no Storage adiciona latência. Mitigação: para artefatos típicos (<10 arquivos, <1MB total), a cópia é rápida. Para artefatos grandes, o upload completo via CLI continua sendo o caminho recomendado.

**[Segurança de upload]** → Aceitar uploads arbitrários pelo portal. Mitigação: validar MIME types na API, limitar tamanho por arquivo (5MB) e total por versão (50MB), sanitizar nomes de arquivo, scan de conteúdo malicioso opcional.
