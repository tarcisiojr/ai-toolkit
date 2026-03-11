## Why

O portal web hoje funciona apenas como vitrine read-only — o usuário cria artefatos pelo CLI e visualiza no portal, mas não consegue editar conteúdo, adicionar versões ou gerenciar arquivos pela interface web. Isso força o fluxo inteiro pela CLI, limitando a adoção e a experiência de quem quer iterar rapidamente em skills, configs, hooks e templates sem sair do navegador.

## What Changes

- **Editor inline de arquivos textuais** no portal (Markdown, JSON, YAML, código) com syntax highlighting e preview
- **File browser** para navegar a estrutura interna de qualquer versão de um artefato
- **Upload de arquivos via drag & drop** para criar novas versões pelo portal
- **Criação de nova versão pelo portal** — tanto por edição de arquivo individual quanto por upload completo
- **Gerenciamento de versões** no portal (yank/restore)
- **Edição de metadados** inline na página do artefato (descrição, keywords, license, tool targets, etc.)
- **Storage de arquivos individuais** — ao publicar (CLI ou portal), os arquivos são extraídos/armazenados individualmente, mantendo o .tgz para download
- **Modo owner** na página do artefato — exibe ações de edição condicionalmente quando o visitante é o dono
- **Novas APIs** para listar arquivos de uma versão, ler conteúdo individual e gerenciar versões (yank/restore)
- Suporte a **múltiplos arquivos por artefato** de todos os tipos (skill, mcp, config, hook, template)

## Capabilities

### New Capabilities

- `artifact-file-storage`: Armazenamento e acesso individual de arquivos de cada versão, com extração automática de tarballs e geração on-the-fly
- `artifact-file-api`: APIs REST para listar, ler e fazer upload de arquivos individuais de uma versão
- `portal-file-editor`: Editor inline com syntax highlighting (CodeMirror) para arquivos textuais, com preview de Markdown
- `portal-file-browser`: Componente de navegação em árvore dos arquivos de uma versão do artefato
- `portal-file-upload`: Upload de arquivos via drag & drop com suporte a múltiplos arquivos e pastas
- `portal-version-management`: Criação de novas versões pelo portal (via edição ou upload) e gerenciamento (yank/restore)
- `portal-owner-mode`: Modo condicional na página do artefato que exibe ações de edição/gerenciamento para o dono
- `portal-metadata-editor`: Formulário inline para edição de metadados do artefato (descrição, keywords, license, etc.)

### Modified Capabilities

<!-- Nenhuma capability existente tem specs formais para modificar -->

## Impact

- **Backend (API)**: 3 novas rotas REST + modificação da rota de upload de versão para aceitar arquivos individuais
- **Backend (Storage)**: Migration do bucket Supabase para aceitar mais MIME types + nova estrutura de pastas para arquivos individuais
- **Backend (CLI publish)**: O backend passa a extrair o .tgz automaticamente após receber upload da CLI
- **Frontend**: Nova página de edição, componentes de editor/file browser/upload, modificação da página de detalhe do artefato
- **Database**: Possível tabela `version_files` como índice dos arquivos de cada versão
- **Dependências**: CodeMirror 6 (editor), libs de tar/gzip server-side
- **CLI**: Sem mudanças — compatibilidade total mantida
