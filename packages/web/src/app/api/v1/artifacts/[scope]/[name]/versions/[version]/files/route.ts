import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api/auth';

type Params = {
  params: Promise<{ scope: string; name: string; version: string }>;
};

/** GET /api/v1/artifacts/:scope/:name/versions/:version/files — Listar arquivos da versão */
export async function GET(request: NextRequest, { params }: Params) {
  const { scope, name, version } = await params;
  const supabase = await createClient();

  // Buscar artefato
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id, visibility')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    return apiError('ARTIFACT_NOT_FOUND', `Artefato "${scope}/${name}" não encontrado`, 404);
  }

  // Buscar versão
  const { data: versionData } = await supabase
    .from('artifact_versions')
    .select('id')
    .eq('artifact_id', artifact.id)
    .eq('version', version)
    .single();

  if (!versionData) {
    return apiError('VERSION_NOT_FOUND', `Versão ${version} não encontrada`, 404);
  }

  // Buscar arquivos da versão
  const { data: files, error } = await supabase
    .from('version_files')
    .select('file_path, file_size, mime_type, is_text')
    .eq('version_id', versionData.id)
    .order('file_path', { ascending: true });

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess({
    files: (files || []).map((f) => ({
      path: f.file_path,
      size: f.file_size,
      mimeType: f.mime_type,
      isText: f.is_text,
    })),
  });
}
