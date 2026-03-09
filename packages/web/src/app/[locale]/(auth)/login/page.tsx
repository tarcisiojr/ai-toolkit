'use client';

import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { useState, Suspense } from 'react';

/**
 * Conteúdo interno da página de login.
 * Separado para encapsular lógica do client component.
 */
function LoginContent() {
  const params = useParams();
  const locale = (params.locale as string) || 'pt-BR';
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Verifica erro na URL de forma segura (sem useSearchParams)
  const checkError = () => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('error');
    }
    return null;
  };

  const translations = {
    'pt-BR': {
      title: 'Entrar no AI Toolkit',
      subtitle: 'Faça login com sua conta GitHub para publicar e gerenciar artefatos.',
      githubButton: 'Entrar com GitHub',
      loading: 'Conectando...',
      errorAuth: 'Falha na autenticação. Tente novamente.',
      backHome: 'Voltar ao início',
      terms: 'Ao entrar, você concorda com nossos',
      termsLink: 'Termos de Uso',
      privacyLink: 'Política de Privacidade',
    },
    en: {
      title: 'Sign in to AI Toolkit',
      subtitle: 'Sign in with your GitHub account to publish and manage artifacts.',
      githubButton: 'Sign in with GitHub',
      loading: 'Connecting...',
      errorAuth: 'Authentication failed. Please try again.',
      backHome: 'Back to home',
      terms: 'By signing in, you agree to our',
      termsLink: 'Terms of Service',
      privacyLink: 'Privacy Policy',
    },
  };

  const t = translations[locale as keyof typeof translations] || translations.en;
  const error = checkError();

  async function handleGitHubLogin() {
    setIsLoading(true);
    setHasError(false);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/${locale}/dashboard`,
      },
    });

    if (authError) {
      setIsLoading(false);
      setHasError(true);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Card de login com glassmorphism */}
        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h2 className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold">
              <span className="glow-cyan-text text-[#00d4ff]">AI</span>{' '}
              <span className="text-[#e2e8f0]">Toolkit</span>
            </h2>
            <div className="divider-gradient mx-auto mt-4 max-w-[80px]" />
          </div>

          {/* Titulo */}
          <h3 className="text-center text-xl font-semibold">{t.title}</h3>
          <p className="mt-2 text-center font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
            {t.subtitle}
          </p>

          {/* Erro de autenticação */}
          {(error || hasError) && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center font-[family-name:var(--font-jetbrains)] text-sm text-red-400">
              {t.errorAuth}
            </div>
          )}

          {/* Botão GitHub */}
          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white/[0.08] px-6 py-3.5 font-[family-name:var(--font-jetbrains)] text-sm font-medium text-[#e2e8f0] transition-all duration-300 hover:bg-white/[0.12] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* Ícone GitHub */}
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {isLoading ? t.loading : t.githubButton}
          </button>

          {/* Terminal hint */}
          <div className="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              <span className="text-[#00ff88]">$</span> aitk login{' '}
              <span className="text-[#64748b]"># via terminal</span>
            </p>
          </div>

          {/* Termos */}
          <p className="mt-6 text-center font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
            {t.terms}{' '}
            <a href="#" className="text-[#00d4ff] hover:underline">
              {t.termsLink}
            </a>{' '}
            &amp;{' '}
            <a href="#" className="text-[#00d4ff] hover:underline">
              {t.privacyLink}
            </a>
          </p>
        </div>

        {/* Link voltar */}
        <div className="mt-6 text-center">
          <a
            href={`/${locale}`}
            className="neon-link font-[family-name:var(--font-jetbrains)] text-sm"
          >
            &larr; {t.backHome}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Página de login com Suspense boundary.
 * O Suspense é necessário pois componentes client podem acessar APIs do navegador.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="font-[family-name:var(--font-jetbrains)] text-sm text-[#64748b]">
            Carregando...
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
