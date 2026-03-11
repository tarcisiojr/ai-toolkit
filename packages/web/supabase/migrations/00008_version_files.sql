-- Migration: tabela version_files para indexar arquivos individuais de cada versão
-- Permite consulta rápida de arquivos sem chamadas ao Storage API

CREATE TABLE version_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_text BOOLEAN NOT NULL DEFAULT true,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_version_file UNIQUE (version_id, file_path)
);

CREATE INDEX idx_version_files_version ON version_files(version_id);
CREATE INDEX idx_version_files_path ON version_files(file_path);
