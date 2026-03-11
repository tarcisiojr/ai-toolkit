## ADDED Requirements

### Requirement: API para listar arquivos de uma versão
O sistema SHALL expor um endpoint `GET /api/v1/artifacts/:scope/:name/versions/:version/files` que retorna a lista de arquivos da versão.

#### Scenario: Listar arquivos de versão existente
- **WHEN** é feita uma requisição GET para `/api/v1/artifacts/myscope/myskill/versions/1.0.0/files`
- **THEN** SHALL retornar status 200 com JSON `{ files: [{ path, size, mimeType, isText }] }`
- **AND** os arquivos SHALL estar ordenados alfabeticamente por `path`

#### Scenario: Versão não encontrada
- **WHEN** é feita uma requisição GET para uma versão que não existe
- **THEN** SHALL retornar status 404 com mensagem de erro

#### Scenario: Artefato privado sem autenticação
- **WHEN** é feita uma requisição GET para arquivos de um artefato privado sem autenticação
- **THEN** SHALL retornar status 401

### Requirement: API para ler conteúdo de um arquivo
O sistema SHALL expor um endpoint `GET /api/v1/artifacts/:scope/:name/versions/:version/files/*path` que retorna o conteúdo de um arquivo específico.

#### Scenario: Ler arquivo textual
- **WHEN** é feita uma requisição GET para um arquivo onde `is_text` é true
- **THEN** SHALL retornar status 200 com o conteúdo do arquivo como `text/plain`

#### Scenario: Ler arquivo binário
- **WHEN** é feita uma requisição GET para um arquivo onde `is_text` é false
- **THEN** SHALL retornar status 200 com redirect para signed URL do Storage (5 minutos de validade)

#### Scenario: Arquivo não encontrado
- **WHEN** é feita uma requisição GET para um caminho de arquivo que não existe na versão
- **THEN** SHALL retornar status 404

### Requirement: API para publicar versão com arquivos individuais
O sistema SHALL modificar o endpoint `POST /api/v1/artifacts/:scope/:name/versions` para aceitar, além do `.tgz`, arquivos individuais via FormData.

#### Scenario: Publicar com arquivos individuais (upload completo)
- **WHEN** é feita uma requisição POST com FormData contendo `version`, `files[]` (múltiplos arquivos), `changelog` e `readme`
- **THEN** SHALL criar a nova versão armazenando cada arquivo individualmente
- **AND** SHALL gerar o `.tgz` automaticamente
- **AND** SHALL retornar status 201 com dados da versão

#### Scenario: Publicar baseado em versão anterior (edição inline)
- **WHEN** é feita uma requisição POST com JSON contendo `version`, `baseVersion`, `changes` (mapa de filePath→conteúdo), e `changelog`
- **THEN** SHALL copiar todos os arquivos da `baseVersion` para a nova versão
- **AND** SHALL sobrescrever os arquivos listados em `changes` com o novo conteúdo
- **AND** SHALL gerar o `.tgz` com o resultado final
- **AND** SHALL retornar status 201

#### Scenario: Base version não encontrada
- **WHEN** é feita uma requisição POST com `baseVersion` que não existe
- **THEN** SHALL retornar status 404 com mensagem explicativa

#### Scenario: Versão já existe
- **WHEN** é feita uma requisição POST com número de versão que já existe
- **THEN** SHALL retornar status 409

### Requirement: API para yank/restore versão
O sistema SHALL expor um endpoint `PATCH /api/v1/artifacts/:scope/:name/versions/:version` para marcar versões como yanked ou restaurá-las.

#### Scenario: Yank de uma versão
- **WHEN** o owner faz PATCH com `{ "isYanked": true, "yankedReason": "Bug crítico" }`
- **THEN** SHALL atualizar `is_yanked` e `yanked_reason` na tabela `artifact_versions`
- **AND** SHALL retornar status 200

#### Scenario: Restore de uma versão yanked
- **WHEN** o owner faz PATCH com `{ "isYanked": false }`
- **THEN** SHALL atualizar `is_yanked` para false e limpar `yanked_reason`
- **AND** SHALL retornar status 200

#### Scenario: Não-owner tenta yank
- **WHEN** um usuário que não é owner tenta fazer PATCH
- **THEN** SHALL retornar status 403
