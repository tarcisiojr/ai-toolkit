import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api/auth';

type Params = {
  params: Promise<{ scope: string; name: string; version: string; path: string[] }>;
};

/** GET /api/v1/artifacts/:scope/:name/versions/:version/files/*path — Conteúdo de um arquivo */
export async function GET(request: NextRequest, { params }: Params) {
  const { scope, name, version, path: pathSegments } = await params;
  const filePath = pathSegments.join('/');
  const supabase = await createClient();

  // Buscar artefato
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id')
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

  // Buscar registro do arquivo
  const { data: fileRecord } = await supabase
    .from('version_files')
    .select('storage_path, is_text, mime_type')
    .eq('version_id', versionData.id)
    .eq('file_path', filePath)
    .single();

  if (!fileRecord) {
    return apiError('FILE_NOT_FOUND', `Arquivo "${filePath}" não encontrado na versão ${version}`, 404);
  }

  if (fileRecord.is_text) {
    // Para arquivos textuais, retornar conteúdo direto
    const { data, error } = await supabase.storage
      .from('artifact-files')
      .download(fileRecord.storage_path);

    if (error || !data) {
      return apiError('STORAGE_ERROR', `Erro ao ler arquivo: ${error?.message}`, 500);
    }

    const text = await data.text();
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } else {
    // Para binários, retornar signed URL
    const { data: signedUrl, error } = await supabase.storage
      .from('artifact-files')
      .createSignedUrl(fileRecord.storage_path, 300); // 5 minutos

    if (error || !signedUrl) {
      return apiError('STORAGE_ERROR', `Erro ao gerar URL: ${error?.message}`, 500);
    }

    return NextResponse.redirect(signedUrl.signedUrl);
  }
}
