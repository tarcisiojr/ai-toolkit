import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
