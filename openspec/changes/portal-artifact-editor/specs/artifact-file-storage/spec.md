## ADDED Requirements

### Requirement: Armazenamento individual de arquivos por versão
O sistema SHALL armazenar os arquivos de cada versão individualmente no Supabase Storage, além do tarball `.tgz` existente. O caminho SHALL seguir o padrão `public/{scope}/{name}/{version}/{filePath}`.

#### Scenario: Upload via CLI (tarball) extrai arquivos automaticamente
- **WHEN** uma nova versão é publicada via CLI com upload de `.tgz`
- **THEN** o backend SHALL extrair todos os arquivos do tarball e armazená-los individualmente no Storage no caminho `public/{scope}/{name}/{version}/`
- **AND** SHALL criar registros na tabela `version_files` para cada arquivo extraído
- **AND** SHALL manter o `.tgz` original em `public/{scope}/{name}/{version}.tgz`

#### Scenario: Upload via portal (arquivos individuais) gera tarball automaticamente
- **WHEN** uma nova versão é publicada via portal com arquivos individuais
- **THEN** o backend SHALL armazenar cada arquivo individualmente no Storage
- **AND** SHALL gerar um `.tgz` contendo todos os arquivos e o manifest
- **AND** SHALL armazenar o `.tgz` em `public/{scope}/{name}/{version}.tgz`
- **AND** SHALL criar registros na tabela `version_files` para cada arquivo

### Requirement: Tabela version_files como índice de arquivos
O sistema SHALL manter uma tabela `version_files` no banco de dados que indexa todos os arquivos de cada versão do artefato.

#### Scenario: Estrutura da tabela version_files
- **WHEN** a migration é executada
- **THEN** a tabela `version_files` SHALL conter: `id` (UUID PK), `version_id` (FK para artifact_versions), `file_path` (TEXT, caminho relativo), `file_size` (INTEGER), `mime_type` (TEXT), `is_text` (BOOLEAN), `storage_path` (TEXT), `created_at` (TIMESTAMPTZ)
- **AND** SHALL ter constraint UNIQUE em `(version_id, file_path)`

#### Scenario: Consulta de arquivos por versão
- **WHEN** o sistema consulta os arquivos de uma versão
- **THEN** SHALL retornar a lista de `version_files` filtrando por `version_id`, sem necessidade de chamadas ao Storage API

### Requirement: Bucket aceita múltiplos tipos de arquivo
O sistema SHALL configurar o bucket `artifact-files` para aceitar qualquer tipo de arquivo, removendo a restrição atual de apenas `application/gzip`.

#### Scenario: Upload de arquivo texto
- **WHEN** um arquivo `.md`, `.json`, `.yaml` ou `.txt` é enviado ao bucket
- **THEN** o upload SHALL ser aceito sem erro de MIME type

#### Scenario: Upload de arquivo binário
- **WHEN** um arquivo `.png`, `.jpg`, `.svg` ou outro binário é enviado ao bucket
- **THEN** o upload SHALL ser aceito sem erro de MIME type

### Requirement: Limite de tamanho por arquivo e por versão
O sistema SHALL limitar o tamanho de arquivos individuais a 5MB e o total por versão a 50MB.

#### Scenario: Arquivo excede limite individual
- **WHEN** um arquivo com mais de 5MB é enviado para upload
- **THEN** o sistema SHALL rejeitar o upload com erro 413 e mensagem explicativa

#### Scenario: Total da versão excede limite
- **WHEN** o total de arquivos de uma versão excede 50MB
- **THEN** o sistema SHALL rejeitar a publicação com erro 413 e mensagem explicativa
