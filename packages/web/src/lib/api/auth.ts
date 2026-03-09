import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/** Resultado da autenticacao */
export interface AuthResult {
  userId: string;
  username: string;
}

/** Erro de API padronizado */
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, status } },
    { status },
  );
}

/** Resposta de sucesso da API */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) });
}

/**
 * Autentica uma requisicao via JWT do Supabase ou API Token.
 * Retorna null se nao autenticado.
 */
export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthResult | null> {
  // Tentar autenticacao via Supabase JWT (cookie-based)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    return {
      userId: user.id,
      username: profile?.username || 'unknown',
    };
  }

  // Tentar autenticacao via API Token (header X-API-Token)
  const apiToken = request.headers.get('X-API-Token');
  if (apiToken) {
    return authenticateWithApiToken(apiToken);
  }

  return null;
}

/** Autentica com API Token */
async function authenticateWithApiToken(token: string): Promise<AuthResult | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  // Hash do token para busca
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: tokenData } = await admin
    .from('api_tokens')
    .select('user_id, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (!tokenData) return null;

  // Verificar expiracao
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return null;
  }

  // Atualizar last_used_at
  await admin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);

  // Buscar perfil
  const { data: profile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', tokenData.user_id)
    .single();

  return {
    userId: tokenData.user_id,
    username: profile?.username || 'unknown',
  };
}

/** Exige autenticacao — retorna erro 401 se nao autenticado */
export async function requireAuth(
  request: NextRequest,
): Promise<AuthResult | NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError('UNAUTHORIZED', 'Autenticacao necessaria', 401);
  }
  return auth;
}
