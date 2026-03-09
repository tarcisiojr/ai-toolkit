import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';

type Params = { params: Promise<{ scope: string; name: string }> };

/** GET /api/v1/artifacts/:scope/:name — Detalhes do artefato */
export async function GET(request: NextRequest, { params }: Params) {
  const { scope, name } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (error || !data) {
    return apiError(
      'ARTIFACT_NOT_FOUND',
      `Artefato "${scope}/${name}" nao encontrado`,
      404,
    );
  }

  return apiSuccess(data);
}

/** PATCH /api/v1/artifacts/:scope/:name — Atualizar artefato */
export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { scope, name } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // Verificar que o artefato existe e o usuario tem permissao
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

  // Campos atualizaveis
  const allowedFields = [
    'description', 'long_description', 'homepage', 'repository',
    'license', 'keywords', 'categories', 'tool_targets',
    'is_deprecated', 'deprecated_message',
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Converter camelCase para snake_case
      const snakeField = field.replace(
        /[A-Z]/g,
        (c) => '_' + c.toLowerCase(),
      );
      updates[snakeField] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('VALIDATION_ERROR', 'Nenhum campo para atualizar', 400);
  }

  const { data, error } = await supabase
    .from('artifacts')
    .update(updates)
    .eq('id', artifact.id)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(data);
}
