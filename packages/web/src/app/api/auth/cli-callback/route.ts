import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCliToken } from '@/lib/api/generate-cli-token';

const WEB_APP_URL = 'https://ai-toolkit-henna.vercel.app';

/**
 * GET /api/auth/cli-callback — Inicia fluxo OAuth para o CLI.
 *
 * Recebe port e state do CLI, salva em cookies seguros e redireciona
 * para o OAuth do Supabase usando a URL do web app como redirect_to
 * (já registrada na allowlist do Supabase).
 *
 * Se o usuário já possui sessão Supabase ativa no browser, gera o CLI
 * token diretamente e redireciona para localhost sem passar pelo OAuth.
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

  // Instanciar cliente Supabase e verificar sessão existente
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Caminho rápido: usuário já autenticado — gerar token CLI diretamente
    try {
      const tokenResult = await generateCliToken(user.id);
      const callbackUrl = `http://localhost:${port}/callback`
        + `?token=${encodeURIComponent(tokenResult.token)}`
        + `&state=${encodeURIComponent(state)}`;
      return NextResponse.redirect(callbackUrl);
    } catch (err) {
      console.error('[cli-callback] Erro ao gerar CLI token para sessão existente:', err);
      return NextResponse.json(
        { error: 'Falha ao gerar CLI token.' },
        { status: 500 },
      );
    }
  }

  // Caminho OAuth: sem sessão — obter URL OAuth do Supabase via SDK (suporta PKCE)
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
