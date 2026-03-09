import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api/auth';

/** POST /api/v1/auth/cli-token — Gerar token para CLI */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError('UNAUTHORIZED', 'Autenticacao necessaria', 401);
  }

  const body = await request.json().catch(() => ({}));
  const tokenName = body.name || 'CLI Token';

  // Gerar token aleatorio
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = 'aitk_' + Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Hash do token
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(token),
  );
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const tokenPrefix = token.slice(0, 12);

  // Salvar no banco
  const { error } = await supabase
    .from('api_tokens')
    .insert({
      user_id: user.id,
      name: tokenName,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      scopes: ['read', 'write'],
      // Expiracao em 1 ano
      expires_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  // Buscar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  // Token retornado apenas uma vez, nao armazenado em plain text
  return apiSuccess({
    token,
    prefix: tokenPrefix,
    name: tokenName,
    user: {
      id: user.id,
      username: profile?.username,
      email: user.email,
    },
  });
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
