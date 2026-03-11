## 1. Database e Storage

- [x] 1.1 Criar migration com tabela `version_files` (id, version_id, file_path, file_size, mime_type, is_text, storage_path, created_at) com constraint UNIQUE(version_id, file_path)
- [x] 1.2 Criar migration para atualizar bucket `artifact-files` removendo restrição de MIME types (aceitar qualquer tipo)
- [x] 1.3 Adicionar policies de storage para subpastas de arquivos individuais (leitura pública em `public/*`, escrita autenticada)

## 2. Utilitários Server-Side

- [x] 2.1 Criar módulo utilitário para extrair arquivos de um `.tgz` e retornar lista de arquivos com metadados (path, size, mimeType, isText)
- [x] 2.2 Criar módulo utilitário para gerar `.tgz` a partir de uma lista de arquivos (buffer/path + metadados)
- [x] 2.3 Criar função para detectar MIME type e flag `isText` baseado na extensão do arquivo
- [x] 2.4 Criar função para copiar arquivos de uma versão para outra no Supabase Storage, aplicando alterações (changes overlay)

## 3. APIs de Arquivos

- [x] 3.1 Criar rota `GET /api/v1/artifacts/[scope]/[name]/versions/[version]/files` — listar arquivos da versão via tabela `version_files`
- [x] 3.2 Criar rota `GET /api/v1/artifacts/[scope]/[name]/versions/[version]/files/[...path]` — retornar conteúdo textual ou signed URL para binários
- [x] 3.3 Modificar rota `POST /api/v1/artifacts/[scope]/[name]/versions` — aceitar FormData com `files[]` (upload portal) além de `.tgz` (CLI)
- [x] 3.4 Modificar rota `POST /api/v1/artifacts/[scope]/[name]/versions` — aceitar JSON com `baseVersion` + `changes` (edição inline)
- [x] 3.5 Após upload de `.tgz` (CLI), extrair arquivos individuais e popular tabela `version_files`
- [x] 3.6 Após upload de arquivos individuais (portal), gerar `.tgz` e popular tabela `version_files`
- [x] 3.7 Validar limites de tamanho: 5MB por arquivo, 50MB por versão
- [x] 3.8 Criar rota `PATCH /api/v1/artifacts/[scope]/[name]/versions/[version]` — yank/restore com verificação de ownership

## 4. Owner Mode

- [x] 4.1 Criar server-side helper `checkOwnership(userId, artifact)` que verifica se o usuário é owner direto ou admin/owner de time
- [x] 4.2 Modificar a página `/a/[scope]/[name]` para detectar ownership e passar flag `isOwner` aos componentes
- [x] 4.3 Criar componente `OwnerActions` que renderiza botões de ação condicionalmente (editar, nova versão, yank)

## 5. File Browser

- [x] 5.1 Criar componente `FileBrowser` — árvore de diretórios/arquivos com colapso/expansão de pastas
- [x] 5.2 Adicionar ícones por tipo de arquivo (md, json, js, imagem, genérico)
- [x] 5.3 Exibir tamanho formatado de cada arquivo (bytes/KB/MB)
- [x] 5.4 Criar seletor de versão integrado ao file browser
- [x] 5.5 Ao clicar em arquivo textual, exibir conteúdo com syntax highlighting no painel de visualização
- [x] 5.6 Ao clicar em imagem, renderizar preview no painel de visualização
- [x] 5.7 Adicionar botão de download individual por arquivo

## 6. File Editor (CodeMirror)

- [x] 6.1 Instalar dependências CodeMirror 6 (`codemirror`, `@codemirror/lang-markdown`, `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/lang-javascript`)
- [x] 6.2 Criar componente `FileEditor` com dynamic import do CodeMirror (lazy loading)
- [x] 6.3 Implementar detecção automática de linguagem por extensão do arquivo
- [x] 6.4 Criar tema escuro para CodeMirror compatível com o design system neon do portal
- [x] 6.5 Adicionar painel de preview de Markdown (split view) com renderização em tempo real
- [x] 6.6 Implementar toggle entre modos: editor only / split view / preview only
- [x] 6.7 Exibir botão "✏️ Editar" em cada arquivo textual (apenas para owners)

## 7. File Upload

- [x] 7.1 Criar componente `FileUploadZone` com drag & drop (aceita arquivos e pastas)
- [x] 7.2 Implementar click-to-select com input file nativo (multiple)
- [x] 7.3 Exibir lista de arquivos selecionados com nome, tamanho, tipo e botão de remover
- [x] 7.4 Validação client-side de tamanho (5MB por arquivo) com feedback visual
- [x] 7.5 Implementar barra de progresso durante upload (por arquivo e total)
- [x] 7.6 Tratar erros de upload com retry sem perder arquivos já selecionados

## 8. Version Management

- [x] 8.1 Criar componente `VersionBumpModal` — campo de versão (pré-preenchido com bump sugerido), campo de changelog (obrigatório), validação semver
- [x] 8.2 Implementar fluxo "edição inline → nova versão" — owner edita arquivo, clica salvar, modal pede versão + changelog, publica via API com baseVersion
- [x] 8.3 Implementar fluxo "upload completo → nova versão" — owner clica "Nova Versão", faz upload, preenche versão + changelog, publica via API
- [x] 8.4 Implementar yank/restore de versões na lista de versões (botão + modal de confirmação com motivo)
- [x] 8.5 Atualizar lista de versões para exibir versões yanked (com indicador visual) apenas para owners

## 9. Metadata Editor

- [x] 9.1 Criar componente `InlineEdit` genérico — modo visualização → modo edição com Save/Cancel
- [x] 9.2 Implementar edição inline de descrição (textarea)
- [x] 9.3 Implementar edição inline de keywords (tag input)
- [x] 9.4 Implementar edição inline de license (select dropdown)
- [x] 9.5 Implementar edição inline de tool targets (checkboxes, mínimo 1)
- [x] 9.6 Implementar edição inline de repository URL (input com validação de URL)
- [x] 9.7 Implementar deprecação/remoção de deprecação (modal com mensagem obrigatória)
- [x] 9.8 Adicionar feedback visual de loading, sucesso e erro em todas as edições

## 10. Integração e Polish

- [x] 10.1 Integrar todos os componentes na página `/a/[scope]/[name]` — file browser, editor, upload, metadata editor, version management
- [x] 10.2 Garantir que componentes de edição usam dynamic import e não impactam bundle de visitantes
- [x] 10.3 Testar fluxo completo: criar artefato → publicar versão via CLI → editar no portal → nova versão → yank → restore
- [x] 10.4 Testar com todos os tipos de artefato: skill, mcp, config, hook, template
- [x] 10.5 Garantir responsividade mobile dos componentes de edição
- [x] 10.6 Adicionar traduções i18n (pt-BR e en) para todos os novos textos e labels
