import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WEB_APP_URL = 'https://ai-toolkit-henna.vercel.app';

/**
 * GET /api/auth/cli-callback — Inicia fluxo OAuth para o CLI.
 *
 * Recebe port e state do CLI, salva em cookies seguros e redireciona
 * para o OAuth do Supabase usando a URL do web app como redirect_to
 * (já registrada na allowlist do Supabase).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Validar parâmetro port
  const portRaw = searchParams.get('port') ?? '';
  const port = parseInt(portRaw, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    return NextResponse.json(
      { error: 'Parametro port invalido. Deve ser um inteiro entre 1024 e 65535.' },
      { status: 400 },
    );
  }

  // Validar parâmetro state
  const state = searchParams.get('state') ?? '';
  if (state.length < 32) {
    return NextResponse.json(
      { error: 'Parametro state invalido. Deve ter pelo menos 32 caracteres.' },
      { status: 400 },
    );
  }

  // Obter URL OAuth do Supabase via SDK (suporta PKCE)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${WEB_APP_URL}/api/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error('[cli-callback] Erro ao gerar URL OAuth:', error);
    return NextResponse.json(
      { error: 'Falha ao iniciar fluxo OAuth.' },
      { status: 500 },
    );
  }

  // Salvar port e state em cookies seguros de curta duração
  const response = NextResponse.redirect(data.url);
  response.cookies.set('aitk-cli-port', String(port), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 600,
  });
  response.cookies.set('aitk-cli-state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 600,
  });

  return response;
}
