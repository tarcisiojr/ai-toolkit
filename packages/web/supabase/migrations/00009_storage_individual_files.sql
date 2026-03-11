-- Migration: atualizar bucket para aceitar qualquer tipo de arquivo
-- e adicionar policies para subpastas de arquivos individuais

-- Remover restrição de MIME types (controle fica na API)
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE name = 'artifact-files';

-- Policy para leitura de arquivos individuais em subpastas públicas
-- A policy existente artifact_files_select_public já cobre public/*
-- mas precisamos garantir que subpastas (ex: public/scope/name/1.0.0/file.md) funcionem
-- A policy existente usa (storage.foldername(name))[1] = 'public' que já funciona para subpastas

-- Policy para update de arquivos (necessário para sobrescrever durante cópia entre versões)
CREATE POLICY "artifact_files_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'artifact-files'
    AND auth.uid() IS NOT NULL
  );
