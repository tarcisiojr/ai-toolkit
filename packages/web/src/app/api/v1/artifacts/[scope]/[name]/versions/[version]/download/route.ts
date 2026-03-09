import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api/auth';

type Params = {
  params: Promise<{ scope: string; name: string; version: string }>;
};

/** GET /api/v1/artifacts/:scope/:name/versions/:version/download — Download do tarball */
export async function GET(request: NextRequest, { params }: Params) {
  const { scope, name, version } = await params;
  const supabase = await createClient();

  // Buscar artefato e versao
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    return apiError(
      'ARTIFACT_NOT_FOUND',
      `Artefato "${scope}/${name}" nao encontrado`,
      404,
    );
  }

  const { data: versionData } = await supabase
    .from('artifact_versions')
    .select('id, storage_path, file_size, checksum')
    .eq('artifact_id', artifact.id)
    .eq('version', version)
    .eq('is_yanked', false)
    .single();

  if (!versionData) {
    return apiError(
      'VERSION_NOT_FOUND',
      `Versao ${version} nao encontrada`,
      404,
    );
  }

  // Gerar URL assinada para download (5 minutos)
  const { data: signedUrl } = await supabase.storage
    .from('artifact-files')
    .createSignedUrl(versionData.storage_path, 300);

  if (!signedUrl) {
    return apiError('DOWNLOAD_ERROR', 'Erro ao gerar URL de download', 500);
  }

  // Registrar download (assincrono, nao bloqueia a resposta)
  void (async () => {
    try {
      await supabase
        .from('downloads')
        .insert({
          artifact_id: artifact.id,
          version_id: versionData.id,
          user_agent: request.headers.get('user-agent'),
          tool_target: request.headers.get('X-Tool-Target'),
        });

      // Incrementar contador (fire-and-forget)
      await supabase.rpc('increment_downloads', {
        artifact_id_param: artifact.id,
      });
    } catch {
      // Ignorar erros de registro de download
    }
  })();

  // Redirect para o download
  return NextResponse.redirect(signedUrl.signedUrl);
}
