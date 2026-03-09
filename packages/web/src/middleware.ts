import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/** Rotas que exigem autenticação (sem o prefixo de locale) */
const PROTECTED_ROUTES = ['/dashboard', '/teams'];

/** Middleware de internacionalização */
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Middleware principal que combina i18n + Supabase Auth.
 * 1. Atualiza a sessão do Supabase (refresh token se necessário)
 * 2. Verifica se a rota exige autenticação
 * 3. Redireciona para login se não autenticado em rota protegida
 * 4. Aplica o middleware de i18n
 */
export async function middleware(request: NextRequest) {
  // Primeiro, aplica o middleware de i18n para obter a response base
  const intlResponse = intlMiddleware(request);

  // Criar response a partir do intl (para manter headers de locale)
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Copiar headers do intl para a response
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  // Configurar cliente Supabase no middleware para refresh de sessão
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Setar cookies na request (para Server Components downstream)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Setar cookies na response (para o navegador)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Atualizar sessão (refresh token se necessário)
  const { data: { user } } = await supabase.auth.getUser();

  // Verificar se é rota protegida
  const { pathname } = request.nextUrl;

  // Extrair locale e path sem locale para checagem
  const localeMatch = pathname.match(/^\/(pt-BR|en)(\/.*)?$/);
  const pathWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;

  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathWithoutLocale.startsWith(route),
  );

  // Redirecionar para login se não autenticado em rota protegida
  if (isProtectedRoute && !user) {
    const locale = localeMatch?.[1] || routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirecionar de login para dashboard se já autenticado
  if (pathWithoutLocale === '/login' && user) {
    const locale = localeMatch?.[1] || routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Retornar response do intl se era um redirect (302/307/308)
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
