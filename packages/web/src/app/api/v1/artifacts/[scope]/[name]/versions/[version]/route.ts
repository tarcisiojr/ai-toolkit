import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';
import { checkOwnership } from '@/lib/artifacts/ownership';

type Params = {
  params: Promise<{ scope: string; name: string; version: string }>;
};

/** PATCH /api/v1/artifacts/:scope/:name/versions/:version — Yank/restore */
export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { scope, name, version } = await params;
  const supabase = await createClient();

  // Buscar artefato
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id, owner_user_id, owner_team_id, latest_version')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    return apiError('ARTIFACT_NOT_FOUND', `Artefato "${scope}/${name}" não encontrado`, 404);
  }

  // Verificar ownership
  const isOwner = await checkOwnership(supabase, authResult.userId, artifact);
  if (!isOwner) {
    return apiError('FORBIDDEN', 'Apenas o proprietário pode gerenciar versões', 403);
  }

  // Buscar versão
  const { data: versionData } = await supabase
    .from('artifact_versions')
    .select('id, is_yanked')
    .eq('artifact_id', artifact.id)
    .eq('version', version)
    .single();

  if (!versionData) {
    return apiError('VERSION_NOT_FOUND', `Versão ${version} não encontrada`, 404);
  }

  const body = await request.json();
  const { isYanked, yankedReason } = body as {
    isYanked: boolean;
    yankedReason?: string;
  };

  // Atualizar status de yank
  const { data: updated, error } = await supabase
    .from('artifact_versions')
    .update({
      is_yanked: isYanked,
      yanked_reason: isYanked ? (yankedReason || null) : null,
    })
    .eq('id', versionData.id)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  // Se yanked a versão latest, atualizar latest_version para a próxima não-yanked
  if (isYanked && version === artifact.latest_version) {
    const { data: nextVersion } = await supabase
      .from('artifact_versions')
      .select('version')
      .eq('artifact_id', artifact.id)
      .eq('is_yanked', false)
      .order('version_major', { ascending: false })
      .order('version_minor', { ascending: false })
      .order('version_patch', { ascending: false })
      .limit(1)
      .single();

    await supabase
      .from('artifacts')
      .update({ latest_version: nextVersion?.version || null })
      .eq('id', artifact.id);
  }

  // Se restaurando e não há latest_version, definir esta
  if (!isYanked) {
    const { data: currentArtifact } = await supabase
      .from('artifacts')
      .select('latest_version')
      .eq('id', artifact.id)
      .single();

    if (!currentArtifact?.latest_version) {
      await supabase
        .from('artifacts')
        .update({ latest_version: version })
        .eq('id', artifact.id);
    }
  }

  return apiSuccess(updated);
}
