import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** GET /api/v1/teams/:slug — Detalhes da equipe */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !team) {
    return apiError('TEAM_NOT_FOUND', `Equipe "${slug}" nao encontrada`, 404);
  }

  // Buscar membros da equipe
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (username, display_name, avatar_url)
    `)
    .eq('team_id', team.id);

  // Buscar artefatos da equipe
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('id, scope, name, type, description, total_downloads, latest_version')
    .eq('owner_team_id', team.id)
    .eq('is_deprecated', false)
    .order('total_downloads', { ascending: false });

  return apiSuccess({
    ...team,
    members: members || [],
    artifacts: artifacts || [],
  });
}

/** PATCH /api/v1/teams/:slug — Atualizar equipe */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { slug } = await params;
  const supabase = await createClient();

  // Buscar equipe
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .single();

  if (teamError || !team) {
    return apiError('TEAM_NOT_FOUND', `Equipe "${slug}" nao encontrada`, 404);
  }

  // Verificar se é owner ou admin
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', authResult.userId)
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return apiError('FORBIDDEN', 'Apenas owners e admins podem editar a equipe', 403);
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  // Campos atualizáveis
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.website !== undefined) updateData.website = body.website;
  if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;

  if (Object.keys(updateData).length === 0) {
    return apiError('VALIDATION_ERROR', 'Nenhum campo para atualizar', 400);
  }

  const { data, error } = await supabase
    .from('teams')
    .update(updateData)
    .eq('id', team.id)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(data);
}

/** DELETE /api/v1/teams/:slug — Deletar equipe */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { slug } = await params;
  const supabase = await createClient();

  // Buscar equipe
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .single();

  if (teamError || !team) {
    return apiError('TEAM_NOT_FOUND', `Equipe "${slug}" nao encontrada`, 404);
  }

  // Apenas owners podem deletar
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', authResult.userId)
    .single();

  if (!membership || membership.role !== 'owner') {
    return apiError('FORBIDDEN', 'Apenas o owner pode deletar a equipe', 403);
  }

  // Verificar se existem artefatos vinculados
  const { count } = await supabase
    .from('artifacts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_team_id', team.id);

  if (count && count > 0) {
    return apiError(
      'HAS_ARTIFACTS',
      `Equipe possui ${count} artefato(s). Remova-os antes de deletar a equipe.`,
      409,
    );
  }

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', team.id);

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess({ deleted: true });
}
