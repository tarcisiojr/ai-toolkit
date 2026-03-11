import { Command } from 'commander';
import chalk from 'chalk';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { exec } from 'node:child_process';
import { platform } from 'node:os';
import { getConfig } from '../core/config.js';
import { saveAuth, getAuth } from '../core/auth.js';
import { logger } from '../utils/logger.js';
import type { CliAuth } from '@tarcisiojr/shared';

// ── Constantes do Supabase ──────────────────────────────────────────────
const SUPABASE_URL = 'https://nxdcgmpvvyfgqerenxrx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZGNnbXB2dnlmZ3FlcmVueHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjA4MDksImV4cCI6MjA4ODU5NjgwOX0.iT49b4UOLKmXPraadgNp3ejmrz7pjA3Gvc1sHO-lqqE';

// Tempo limite para aguardar o callback OAuth (em milissegundos)
const OAUTH_TIMEOUT_MS = 120_000;

/** Tokens recebidos do callback OAuth */
interface OAuthTokens {
  access_token: string;
  refresh_token: string;
}

/** Dados do usuário retornados pelo Supabase */
interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    user_name?: string;
    preferred_username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// ── Página HTML que extrai o fragment do callback OAuth ────────────────
function buildCallbackHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>AITK — Autenticacao</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #fafafa;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #333;
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success { color: #22c55e; }
    .error { color: #ef4444; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    p { color: #a1a1aa; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="container" id="content">
    <div class="spinner"></div>
    <h1>Autenticando...</h1>
    <p>Aguarde enquanto processamos sua autenticacao.</p>
  </div>
  <script>
    (function() {
      // Extrai os tokens do fragment (#) da URL
      var hash = window.location.hash.substring(1);
      var params = new URLSearchParams(hash);
      var accessToken = params.get('access_token');
      var refreshToken = params.get('refresh_token');

      if (!accessToken) {
        document.getElementById('content').innerHTML =
          '<h1 class="error">Erro na autenticacao</h1>' +
          '<p>Nenhum token encontrado. Tente novamente.</p>';
        return;
      }

      // Envia os tokens de volta ao servidor local via POST
      fetch('/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })
      })
      .then(function(res) {
        if (res.ok) {
          document.getElementById('content').innerHTML =
            '<h1 class="success">Autenticado com sucesso!</h1>' +
            '<p>Pode fechar esta aba e voltar ao terminal.</p>';
        } else {
          throw new Error('Falha ao enviar tokens');
        }
      })
      .catch(function() {
        document.getElementById('content').innerHTML =
          '<h1 class="error">Erro ao processar</h1>' +
          '<p>Tente executar o login novamente no terminal.</p>';
      });
    })();
  </script>
</body>
</html>`;
}

/** Abre uma URL no navegador padrão do sistema operacional */
function openBrowser(url: string): void {
  const os = platform();
  let command: string;

  switch (os) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      // Linux e outros sistemas Unix
      command = `xdg-open "${url}"`;
      break;
  }

  exec(command, (error) => {
    if (error) {
      // Se falhar ao abrir o navegador, mostra a URL para copiar manualmente
      logger.warn('Nao foi possivel abrir o navegador automaticamente.');
      logger.print(`  ${chalk.gray('Abra manualmente:')} ${chalk.cyan.underline(url)}`);
    }
  });
}

/**
 * Inicia servidor HTTP local temporário e aguarda callback do OAuth.
 * Retorna os tokens recebidos do Supabase via redirect.
 */
function waitForOAuthCallback(): Promise<OAuthTokens> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // GET /callback — Serve a página HTML que extrai o fragment
      if (req.method === 'GET' && req.url?.startsWith('/callback')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildCallbackHtml());
        return;
      }

      // POST /callback — Recebe os tokens enviados pela página HTML
      if (req.method === 'POST' && req.url === '/callback') {
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const tokens = JSON.parse(body) as OAuthTokens;

            if (!tokens.access_token) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Token ausente' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));

            resolved = true;
            // Fecha o servidor após enviar a resposta
            server.close();
            resolve(tokens);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'JSON invalido' }));
          }
        });
        return;
      }

      // Qualquer outra rota retorna 404
      res.writeHead(404);
      res.end('Not Found');
    });

    // Escuta em porta aleatória (0 = SO escolhe uma porta disponível)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Falha ao iniciar servidor local'));
        return;
      }

      const port = address.port;
      const redirectUrl = `http://localhost:${port}/callback`;

      // Monta a URL de autorização OAuth do Supabase
      const authUrl =
        `${SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectUrl)}`;

      logger.print(`  ${logger.stepIndicator(1, 3)} ${chalk.gray('Abrindo navegador para autenticacao...')}`);
      logger.blank();

      // URL para cópia manual caso o navegador não abra
      const urlBox = logger.box([
        chalk.gray('Se o navegador nao abrir, copie e cole o link:'),
        '',
        chalk.cyan.underline(authUrl),
      ]);
      logger.print(urlBox);
      logger.blank();

      openBrowser(authUrl);
    });

    // Timeout para evitar que o servidor fique esperando indefinidamente
    const timeout = setTimeout(() => {
      if (!resolved) {
        server.close();
        reject(new Error(
          `Tempo limite de ${OAUTH_TIMEOUT_MS / 1000}s excedido. Tente novamente.`,
        ));
      }
    }, OAUTH_TIMEOUT_MS);

    // Limpa o timeout quando o servidor fechar
    server.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Busca informações do usuário autenticado no Supabase usando o access_token.
 * Chama GET /auth/v1/user com o token Bearer.
 */
async function fetchSupabaseUser(accessToken: string): Promise<SupabaseUser> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Erro desconhecido');
    throw new Error(`Falha ao buscar perfil do usuario (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<SupabaseUser>;
}

/**
 * Verifica um API token (aitk_xxx) chamando o endpoint de verificação do registry.
 * Retorna os dados do usuário se o token for válido.
 */
async function verifyApiToken(token: string, registryUrl: string): Promise<{ userId: string; username: string }> {
  const response = await fetch(`${registryUrl}/api/v1/auth/verify`, {
    headers: {
      'X-API-Token': token,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token invalido ou expirado.');
    }
    throw new Error(`Erro ao verificar token (HTTP ${response.status})`);
  }

  const body = await response.json() as { data: { userId: string; username: string } };
  return body.data;
}

/**
 * Fluxo de login via API token (para CI/CD).
 * Verifica o token e salva as credenciais localmente.
 */
async function loginWithToken(token: string): Promise<void> {
  const config = getConfig();

  logger.blank();
  logger.print(`  ${chalk.white.bold('Autenticacao via API Token — AI Toolkit')}`);
  logger.blank();

  logger.print(`  ${logger.stepIndicator(1, 2)} ${chalk.gray('Verificando token...')}`);

  try {
    const userData = await verifyApiToken(token, config.registry);

    logger.print(`  ${logger.stepIndicator(2, 2)} ${chalk.gray('Token verificado!')}`);
    logger.blank();

    // Salva as credenciais no arquivo de autenticação
    const auth: CliAuth = {
      token,
      user: {
        id: userData.userId,
        username: userData.username,
        email: '',
      },
      createdAt: new Date().toISOString(),
      registry: config.registry,
    };

    saveAuth(auth);

    const successBox = logger.box([
      chalk.green.bold('Login realizado com sucesso!'),
      '',
      `${chalk.gray('Usuario:')} ${chalk.white.bold(userData.username)}`,
      `${chalk.gray('Metodo:')}  ${chalk.yellow('API Token')}`,
      `${chalk.gray('Registry:')} ${chalk.cyan(config.registry)}`,
      '',
      chalk.gray('Voce ja pode publicar e instalar artefatos privados.'),
    ]);
    logger.print(successBox);
    logger.blank();
  } catch (error) {
    logger.blank();
    logger.error(error instanceof Error ? error.message : 'Falha ao verificar token');
    process.exit(1);
  }
}

/**
 * Fluxo de login interativo via OAuth do GitHub (Supabase).
 * Abre o navegador, aguarda callback e salva as credenciais.
 */
async function loginWithOAuth(): Promise<void> {
  const config = getConfig();

  // Verifica se já está autenticado
  const existingAuth = getAuth();
  if (existingAuth) {
    logger.warn(`Voce ja esta autenticado como ${chalk.bold(existingAuth.user.username)}.`);
    logger.info('Use "aitk logout" para sair antes de fazer login novamente.');
    logger.blank();
    return;
  }

  logger.blank();
  logger.print(`  ${chalk.white.bold('Autenticacao — AI Toolkit Registry')}`);
  logger.blank();

  try {
    // Passo 1: Aguarda callback OAuth (abre navegador internamente)
    const tokens = await waitForOAuthCallback();

    // Passo 2: Busca dados do usuário com o access_token
    logger.print(`  ${logger.stepIndicator(2, 3)} ${chalk.gray('Autenticando...')}`);

    const user = await fetchSupabaseUser(tokens.access_token);

    // Extrai username do GitHub dos metadados do usuário
    const username =
      user.user_metadata?.user_name ||
      user.user_metadata?.preferred_username ||
      'unknown';

    const email = user.email || '';

    // Salva as credenciais no arquivo de autenticação
    const auth: CliAuth = {
      token: tokens.access_token,
      user: {
        id: user.id,
        username,
        email,
      },
      createdAt: new Date().toISOString(),
      registry: config.registry,
    };

    saveAuth(auth);

    // Passo 3: Finalização com sucesso
    logger.print(`  ${logger.stepIndicator(3, 3)} ${chalk.gray('Finalizado!')}`);
    logger.blank();

    const successBox = logger.box([
      chalk.green.bold('Login realizado com sucesso!'),
      '',
      `${chalk.gray('Usuario:')} ${chalk.white.bold(username)}`,
      `${chalk.gray('Email:')}   ${chalk.white(email)}`,
      `${chalk.gray('Registry:')} ${chalk.cyan(config.registry)}`,
      '',
      chalk.gray('Voce ja pode publicar e instalar artefatos privados.'),
    ]);
    logger.print(successBox);
    logger.blank();
  } catch (error) {
    logger.blank();
    logger.error(error instanceof Error ? error.message : 'Falha na autenticacao');
    process.exit(1);
  }
}

// ── Comando principal ───────────────────────────────────────────────────

export const loginCommand = new Command('login')
  .description('Autenticar com o AI Toolkit registry')
  .option('--token <token>', 'API token para autenticacao direta (CI/CD)')
  .action(async (options: { token?: string }) => {
    if (options.token) {
      // Fluxo direto com API token (para CI/CD e automacao)
      await loginWithToken(options.token);
    } else {
      // Fluxo interativo via OAuth do GitHub
      await loginWithOAuth();
    }
  });
