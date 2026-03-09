-- Configuração do Supabase Storage para artefatos

-- Bucket para artefatos públicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifact-files',
  'artifact-files',
  false,
  52428800, -- 50MB max
  ARRAY['application/gzip', 'application/x-tar', 'application/octet-stream']
);

-- Política: download de artefatos públicos é aberto
CREATE POLICY "artifact_files_select_public"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'artifact-files'
    AND (storage.foldername(name))[1] = 'public'
  );

-- Política: download de artefatos privados requer autenticação
CREATE POLICY "artifact_files_select_private"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'artifact-files'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.uid() IS NOT NULL
  );

-- Política: upload requer autenticação
CREATE POLICY "artifact_files_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artifact-files'
    AND auth.uid() IS NOT NULL
  );

-- Política: delete pelo dono
CREATE POLICY "artifact_files_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artifact-files'
    AND auth.uid() IS NOT NULL
  );
