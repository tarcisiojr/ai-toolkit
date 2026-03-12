import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api/auth';
import { generateCliToken } from '@/lib/api/generate-cli-token';

/** POST /api/v1/auth/cli-token — Gerar token para CLI */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError('UNAUTHORIZED', 'Autenticacao necessaria', 401);
  }

  try {
    const result = await generateCliToken(user.id);

    // Token retornado apenas uma vez, nao armazenado em plain text
    return apiSuccess({
      token: result.token,
      prefix: result.token.slice(0, 12),
      name: 'CLI Token',
      user: {
        id: user.id,
        username: result.username,
        email: result.email,
      },
    });
  } catch (error) {
    return apiError('DB_ERROR', error instanceof Error ? error.message : 'Erro interno', 500);
  }
}

/** GET /api/v1/auth/cli-token — Listar tokens do usuario */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError('UNAUTHORIZED', 'Autenticacao necessaria', 401);
  }

  const { data: tokens, error } = await supabase
    .from('api_tokens')
    .select(
      'id, name, token_prefix, scopes, last_used_at, expires_at, created_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(tokens);
}

/** DELETE /api/v1/auth/cli-token?id=<token_id> — Revogar token */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError('UNAUTHORIZED', 'Autenticacao necessaria', 401);
  }

  const tokenId = request.nextUrl.searchParams.get('id');

  if (!tokenId) {
    return apiError('VALIDATION_ERROR', 'ID do token e obrigatorio', 400);
  }

  // Garante que o token pertence ao usuario autenticado
  const { error } = await supabase
    .from('api_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('user_id', user.id);

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess({ deleted: true });
}
