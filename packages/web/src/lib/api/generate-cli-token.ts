import { createClient } from '@/lib/supabase/server';

export interface CliTokenResult {
  token: string;
  username: string;
  email: string;
}

/**
 * Gera um CLI token de longa duração (1 ano) para o usuário especificado.
 * Salva o hash SHA-256 na tabela api_tokens e retorna o token em plain text.
 */
export async function generateCliToken(userId: string): Promise<CliTokenResult> {
  const supabase = await createClient();

  // Gerar token aleatório
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
      user_id: userId,
      name: 'CLI Token',
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      scopes: ['read', 'write'],
      expires_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

  if (error) {
    throw new Error(`Falha ao salvar token: ${error.message}`);
  }

  // Buscar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  const { data: { user } } = await supabase.auth.getUser();

  return {
    token,
    username: profile?.username ?? '',
    email: user?.email ?? '',
  };
}
