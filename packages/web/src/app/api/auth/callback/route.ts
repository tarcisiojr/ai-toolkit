import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Extrai a locale do parâmetro next ou usa pt-BR como padrão.
 * Exemplo: '/en/dashboard' → 'en', '/pt-BR/dashboard' → 'pt-BR'
 */
function extractLocale(next: string): string {
  const match = next.match(/^\/(pt-BR|en)(\/|$)/);
  return match?.[1] || 'pt-BR';
}

/**
 * GET /api/auth/callback — Troca o code do OAuth por uma sessão.
 * Supabase redireciona para cá após o login no GitHub.
 *
 * Suporta dois fluxos:
 * 1. PKCE: recebe ?code=xxx (troca por sessão)
 * 2. Erro: recebe ?error=xxx&error_description=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/pt-BR/dashboard';
  const locale = extractLocale(next);

  // Tratar erro retornado pelo Supabase/GitHub
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (errorParam) {
    console.error(`[auth/callback] Erro OAuth: ${errorParam} — ${errorDescription}`);
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=${errorParam}`, origin),
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    console.error(`[auth/callback] Erro ao trocar code por sessão: ${error.message}`);
  }

  // Em caso de erro ou ausência de code, redireciona para login
  return NextResponse.redirect(
    new URL(`/${locale}/login?error=auth_failed`, origin),
  );
}
