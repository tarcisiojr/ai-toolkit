import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCliToken } from '@/lib/api/generate-cli-token';

/**
 * Extrai a locale do path ou usa pt-BR como padrão.
 * Exemplo: '/en/dashboard' → 'en', '/pt-BR/dashboard' → 'pt-BR'
 */
function extractLocale(path: string): string {
  const match = path.match(/^\/(pt-BR|en)(\/|$)/);
  return match?.[1] || 'pt-BR';
}

/**
 * Lê o destino pós-login do cookie 'aitk-auth-next'.
 * Fallback para parâmetro ?next na URL (compatibilidade).
 */
function getNextPath(request: NextRequest): string {
  // Prioridade 1: cookie definido pelo login page
  const cookieNext = request.cookies.get('aitk-auth-next')?.value;
  if (cookieNext) {
    return decodeURIComponent(cookieNext);
  }

  // Prioridade 2: query param (compatibilidade com fluxo anterior)
  const paramNext = request.nextUrl.searchParams.get('next');
  if (paramNext) {
    return paramNext;
  }

  // Fallback: dashboard em pt-BR
  return '/pt-BR/dashboard';
}

/**
 * GET /api/auth/callback — Troca o code do OAuth por uma sessão.
 * Supabase redireciona para cá após o login no GitHub.
 *
 * Suporta dois fluxos:
 * 1. PKCE: recebe ?code=xxx (troca por sessão)
 * 2. Erro: recebe ?error=xxx&error_description=xxx
 *
 * O destino pós-login é lido do cookie 'aitk-auth-next'
 * (evita query params no redirect_to do Supabase que podem causar
 * incompatibilidade com a whitelist de redirect URLs).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = getNextPath(request);
  const locale = extractLocale(next);

  // Log para diagnóstico em produção
  console.log(`[auth/callback] Recebido: code=${code ? 'presente' : 'ausente'}, next=${next}, url=${request.nextUrl.pathname}${request.nextUrl.search}`);

  // Tratar erro retornado pelo Supabase/GitHub
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');

  if (errorParam) {
    console.error(`[auth/callback] Erro OAuth: ${errorParam} (${errorCode}) — ${errorDescription}`);
    const response = NextResponse.redirect(
      new URL(`/${locale}/login?error=${errorParam}`, origin),
    );
    // Limpar cookie de next path
    response.cookies.delete('aitk-auth-next');
    return response;
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Verificar presença de cookies CLI para fluxo de login via terminal
        const cliPort = request.cookies.get('aitk-cli-port')?.value;
        const cliState = request.cookies.get('aitk-cli-state')?.value;

        if (cliPort && cliState) {
          console.log(`[auth/callback] Fluxo CLI detectado: port=${cliPort}`);
          try {
            const { data: { user: sessionUser } } = await supabase.auth.getUser();
            if (!sessionUser) {
              throw new Error('Sessao invalida apos troca do code');
            }

            const tokenResult = await generateCliToken(sessionUser.id);

            const callbackUrl = `http://localhost:${cliPort}/callback?token=${encodeURIComponent(tokenResult.token)}&state=${encodeURIComponent(cliState)}`;
            console.log(`[auth/callback] Redirecionando CLI para: http://localhost:${cliPort}/callback`);

            const response = NextResponse.redirect(callbackUrl);
            // Limpar cookies CLI após uso
            response.cookies.delete('aitk-cli-port');
            response.cookies.delete('aitk-cli-state');
            response.cookies.delete('aitk-auth-next');
            return response;
          } catch (cliErr) {
            console.error('[auth/callback] Erro no fluxo CLI:', cliErr);
            // Em caso de erro no fluxo CLI, redirecionar para login com erro
            const response = NextResponse.redirect(
              new URL('/pt-BR/login?error=cli_token_failed', origin),
            );
            response.cookies.delete('aitk-cli-port');
            response.cookies.delete('aitk-cli-state');
            response.cookies.delete('aitk-auth-next');
            return response;
          }
        }

        console.log(`[auth/callback] Sessão criada com sucesso, redirecionando para: ${next}`);
        const response = NextResponse.redirect(new URL(next, origin));
        // Limpar cookie de next path após uso
        response.cookies.delete('aitk-auth-next');
        return response;
      }

      console.error(`[auth/callback] Erro ao trocar code por sessão: ${error.message} (status: ${error.status})`);
    } catch (err) {
      console.error(`[auth/callback] Exceção ao processar code:`, err);
    }
  }

  // Em caso de erro ou ausência de code, redireciona para login
  console.warn(`[auth/callback] Redirecionando para login com erro. Params: ${searchParams.toString()}`);
  const response = NextResponse.redirect(
    new URL(`/${locale}/login?error=auth_failed`, origin),
  );
  response.cookies.delete('aitk-auth-next');
  return response;
}
