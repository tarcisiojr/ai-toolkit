import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';

/** GET /api/v1/artifacts — Listar artefatos publicos */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '20'), 100);
  const type = searchParams.get('type');
  const tool = searchParams.get('tool');
  const sort = searchParams.get('sort') || 'downloads';

  const supabase = await createClient();
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('artifacts')
    .select('*', { count: 'exact' })
    .eq('visibility', 'public')
    .eq('is_deprecated', false);

  if (type) query = query.eq('type', type);
  if (tool) query = query.contains('tool_targets', [tool]);

  // Ordenacao
  switch (sort) {
    case 'downloads':
      query = query.order('total_downloads', { ascending: false });
      break;
    case 'updated':
      query = query.order('updated_at', { ascending: false });
      break;
    case 'created':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('total_downloads', { ascending: false });
  }

  query = query.range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(data, {
    meta: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage),
    },
  });
}

/** POST /api/v1/artifacts — Criar novo artefato */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const body = await request.json();
  const {
    scope, name, type, description, visibility,
    keywords, categories, toolTargets, repository, license,
  } = body;

  if (!scope || !name || !type || !description) {
    return apiError(
      'VALIDATION_ERROR',
      'Campos obrigatorios: scope, name, type, description',
      400,
    );
  }

  const supabase = await createClient();

  // Verificar se o scope pertence ao usuario ou equipe
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', authResult.userId)
    .single();

  const isUserScope = profile?.username === scope;

  let ownerUserId: string | null = null;
  let ownerTeamId: string | null = null;

  if (isUserScope) {
    ownerUserId = authResult.userId;
  } else {
    // Verificar se e admin/owner da equipe
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', scope)
      .single();

    if (!team) {
      return apiError('SCOPE_NOT_FOUND', `Scope "${scope}" nao encontrado`, 404);
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team.id)
      .eq('user_id', authResult.userId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return apiError('FORBIDDEN', 'Sem permissao para publicar neste scope', 403);
    }

    ownerTeamId = team.id;
  }

  const { data, error } = await supabase
    .from('artifacts')
    .insert({
      scope,
      name,
      type,
      description,
      visibility: visibility || 'public',
      keywords: keywords || [],
      categories: categories || [],
      tool_targets: toolTargets || ['claude-code'],
      repository: repository || null,
      license: license || 'MIT',
      owner_user_id: ownerUserId,
      owner_team_id: ownerTeamId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return apiError(
        'ARTIFACT_EXISTS',
        `Artefato "${scope}/${name}" ja existe`,
        409,
      );
    }
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(data);
}
