import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/debug — Endpoint de diagnóstico para verificar
 * a configuração de autenticação do Supabase.
 *
 * Retorna informações sobre:
 * - Variáveis de ambiente configuradas
 * - Estado da sessão atual
 * - Configuração do provedor GitHub
 * - URLs de redirect configuradas
 *
 * ATENÇÃO: Este endpoint não expõe secrets, apenas status.
 * Deve ser removido ou protegido em produção madura.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Verificar sessão atual
  let sessionStatus = 'sem sessão';
  let userEmail = null;
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      sessionStatus = 'autenticado';
      userEmail = user.email;
    } else if (error) {
      sessionStatus = `erro: ${error.message}`;
    }
  } catch (err) {
    sessionStatus = `exceção: ${err instanceof Error ? err.message : 'desconhecido'}`;
  }

  // Verificar configurações do Supabase Auth
  let authSettings = null;
  try {
    const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      authSettings = {
        github_enabled: settings?.external?.github ?? false,
        email_enabled: settings?.external?.email ?? false,
      };
    }
  } catch {
    authSettings = { error: 'não foi possível verificar' };
  }

  // Cookies de auth presentes
  const cookies = request.cookies.getAll();
  const authCookies = cookies
    .filter(c => c.name.includes('supabase') || c.name.includes('aitk'))
    .map(c => ({ name: c.name, hasValue: !!c.value }));

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NÃO CONFIGURADO',
      has_anon_key: hasAnonKey,
      has_service_role_key: hasServiceKey,
      node_env: process.env.NODE_ENV,
    },
    auth: {
      session_status: sessionStatus,
      user_email: userEmail,
      auth_settings: authSettings,
    },
    cookies: {
      auth_cookies: authCookies,
      total_cookies: cookies.length,
    },
    urls: {
      origin,
      callback_url: `${origin}/api/auth/callback`,
      expected_supabase_redirect_url: `${origin}/**`,
      instructions: [
        'No Supabase Dashboard → Authentication → URL Configuration:',
        `1. Site URL: ${origin}`,
        `2. Redirect URLs: adicionar "${origin}/**"`,
        'No GitHub OAuth App Settings:',
        `3. Authorization callback URL: ${supabaseUrl}/auth/v1/callback`,
      ],
    },
  };

  return NextResponse.json(diagnostics, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
