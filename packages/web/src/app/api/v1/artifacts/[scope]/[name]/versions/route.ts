import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';

type Params = { params: Promise<{ scope: string; name: string }> };

/** GET /api/v1/artifacts/:scope/:name/versions — Listar versoes */
export async function GET(request: NextRequest, { params }: Params) {
  const { scope, name } = await params;
  const supabase = await createClient();

  // Buscar artefato
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

  const { data: versions, error } = await supabase
    .from('artifact_versions')
    .select('*')
    .eq('artifact_id', artifact.id)
    .eq('is_yanked', false)
    .order('version_major', { ascending: false })
    .order('version_minor', { ascending: false })
    .order('version_patch', { ascending: false });

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(versions);
}

/** POST /api/v1/artifacts/:scope/:name/versions — Publicar nova versao */
export async function POST(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { scope, name } = await params;
  const supabase = await createClient();

  // Buscar artefato e verificar permissao
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id, owner_user_id, owner_team_id')
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

  // Parsear form data (multipart)
  const formData = await request.formData();
  const version = formData.get('version') as string;
  const changelog = formData.get('changelog') as string | null;
  const readme = formData.get('readme') as string | null;
  const file = formData.get('file') as File | null;
  const metadata = formData.get('metadata') as string | null;
  const dependencies = formData.get('dependencies') as string | null;

  if (!version || !file) {
    return apiError(
      'VALIDATION_ERROR',
      'Campos obrigatorios: version, file',
      400,
    );
  }

  // Validar semver
  const semverMatch = version.match(
    /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.]+)?$/,
  );
  if (!semverMatch) {
    return apiError(
      'VALIDATION_ERROR',
      'Versao deve seguir semver (ex: 1.0.0)',
      400,
    );
  }

  const [, major, minor, patch, prerelease] = semverMatch;

  // Upload do arquivo para Supabase Storage
  const visibility = 'public';
  const storagePath = `${visibility}/${scope}/${name}/${version}.tgz`;

  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('artifact-files')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/gzip',
      upsert: false,
    });

  if (uploadError) {
    return apiError('UPLOAD_ERROR', uploadError.message, 500);
  }

  // Calcular checksum SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Inserir versao
  const { data: versionData, error: versionError } = await supabase
    .from('artifact_versions')
    .insert({
      artifact_id: artifact.id,
      version,
      version_major: parseInt(major),
      version_minor: parseInt(minor),
      version_patch: parseInt(patch),
      prerelease: prerelease?.slice(1) || null,
      changelog,
      readme,
      storage_path: storagePath,
      file_size: file.size,
      checksum: `sha256-${checksum}`,
      metadata: metadata ? JSON.parse(metadata) : {},
      dependencies: dependencies ? JSON.parse(dependencies) : [],
      published_by: authResult.userId,
    })
    .select()
    .single();

  if (versionError) {
    if (versionError.code === '23505') {
      return apiError('VERSION_EXISTS', `Versao ${version} ja existe`, 409);
    }
    return apiError('DB_ERROR', versionError.message, 500);
  }

  // Atualizar latest_version no artefato
  await supabase
    .from('artifacts')
    .update({ latest_version: version })
    .eq('id', artifact.id);

  return apiSuccess(versionData);
}
