import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';

/** GET /api/v1/teams — Listar equipes do usuario */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('team_members')
    .select(`
      role,
      joined_at,
      teams (*)
    `)
    .eq('user_id', authResult.userId);

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(data);
}

/** POST /api/v1/teams — Criar equipe */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const body = await request.json();
  const { slug, name, description } = body;

  if (!slug || !name) {
    return apiError(
      'VALIDATION_ERROR',
      'Campos obrigatorios: slug, name',
      400,
    );
  }

  const supabase = await createClient();

  // Criar equipe
  const { data: team, error } = await supabase
    .from('teams')
    .insert({ slug, name, description })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return apiError('TEAM_EXISTS', `Equipe "${slug}" ja existe`, 409);
    }
    return apiError('DB_ERROR', error.message, 500);
  }

  // Adicionar criador como owner
  await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: authResult.userId,
      role: 'owner',
    });

  return apiSuccess(team);
}
