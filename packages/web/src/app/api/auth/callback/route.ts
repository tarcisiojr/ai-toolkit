import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback — Troca o code do OAuth por uma sessão
 * Supabase redireciona para cá após o login no GitHub
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/pt-BR/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Em caso de erro, redireciona para login com mensagem
  return NextResponse.redirect(
    new URL('/pt-BR/login?error=auth_failed', origin),
  );
}
