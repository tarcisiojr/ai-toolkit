import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** GET /api/v1/teams/:slug/members — Listar membros */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const { data: members, error } = await supabase
    .from('team_members')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (username, display_name, avatar_url)
    `)
    .eq('team_id', team.id)
    .order('joined_at', { ascending: true });

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(members);
}

/** POST /api/v1/teams/:slug/members — Adicionar membro */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { slug } = await params;
  const body = await request.json();
  const { username, role = 'member' } = body;

  if (!username) {
    return apiError('VALIDATION_ERROR', 'Campo obrigatorio: username', 400);
  }

  if (!['admin', 'member'].includes(role)) {
    return apiError('VALIDATION_ERROR', 'Role deve ser "admin" ou "member"', 400);
  }

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

  // Verificar permissão (owner ou admin)
  const { data: callerMembership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', authResult.userId)
    .single();

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return apiError('FORBIDDEN', 'Apenas owners e admins podem adicionar membros', 403);
  }

  // Admin não pode promover outro a admin
  if (role === 'admin' && callerMembership.role !== 'owner') {
    return apiError('FORBIDDEN', 'Apenas owners podem definir role admin', 403);
  }

  // Buscar usuário pelo username
  const { data: targetUser, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (userError || !targetUser) {
    return apiError('USER_NOT_FOUND', `Usuario "${username}" nao encontrado`, 404);
  }

  // Adicionar membro
  const { data: member, error: insertError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: targetUser.id,
      role,
    })
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (username, display_name, avatar_url)
    `)
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return apiError('ALREADY_MEMBER', `"${username}" ja e membro desta equipe`, 409);
    }
    return apiError('DB_ERROR', insertError.message, 500);
  }

  return apiSuccess(member);
}

/** PATCH /api/v1/teams/:slug/members — Alterar role de membro */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { slug } = await params;
  const body = await request.json();
  const { username, role } = body;

  if (!username || !role) {
    return apiError('VALIDATION_ERROR', 'Campos obrigatorios: username, role', 400);
  }

  if (!['admin', 'member'].includes(role)) {
    return apiError('VALIDATION_ERROR', 'Role deve ser "admin" ou "member"', 400);
  }

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

  // Verificar permissão (apenas owner pode alterar roles)
  const { data: callerMembership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', authResult.userId)
    .single();

  if (!callerMembership || callerMembership.role !== 'owner') {
    return apiError('FORBIDDEN', 'Apenas o owner pode alterar roles', 403);
  }

  // Buscar usuário alvo
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (!targetUser) {
    return apiError('USER_NOT_FOUND', `Usuario "${username}" nao encontrado`, 404);
  }

  // Não pode alterar o próprio role de owner
  if (targetUser.id === authResult.userId) {
    return apiError('FORBIDDEN', 'Nao e possivel alterar o proprio role de owner', 400);
  }

  // Atualizar role
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', team.id)
    .eq('user_id', targetUser.id)
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (username, display_name, avatar_url)
    `)
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(data);
}

/** DELETE /api/v1/teams/:slug/members — Remover membro */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { slug } = await params;
  const body = await request.json();
  const { username } = body;

  if (!username) {
    return apiError('VALIDATION_ERROR', 'Campo obrigatorio: username', 400);
  }

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

  // Buscar usuário alvo
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (!targetUser) {
    return apiError('USER_NOT_FOUND', `Usuario "${username}" nao encontrado`, 404);
  }

  // Verificar se o caller é o próprio membro que quer sair ou um admin/owner
  const isSelf = targetUser.id === authResult.userId;

  if (!isSelf) {
    // Precisa ser owner ou admin para remover outros
    const { data: callerMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team.id)
      .eq('user_id', authResult.userId)
      .single();

    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return apiError('FORBIDDEN', 'Sem permissao para remover membros', 403);
    }
  }

  // Verificar se o alvo é owner (não pode remover owner)
  const { data: targetMembership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', targetUser.id)
    .single();

  if (!targetMembership) {
    return apiError('NOT_MEMBER', `"${username}" nao e membro desta equipe`, 404);
  }

  if (targetMembership.role === 'owner') {
    return apiError('FORBIDDEN', 'Nao e possivel remover o owner da equipe', 400);
  }

  // Remover membro
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', team.id)
    .eq('user_id', targetUser.id);

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess({ removed: true });
}
