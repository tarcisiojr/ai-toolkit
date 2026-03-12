import { Command } from 'commander';
import chalk from 'chalk';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { platform } from 'node:os';
import { getConfig } from '../core/config.js';
import { saveAuth, getAuth } from '../core/auth.js';
import { logger } from '../utils/logger.js';
import type { CliAuth } from '@tarcisiojunior/shared';

// URL base do web app (intermediário OAuth)
const WEB_APP_URL = 'https://ai-toolkit-henna.vercel.app';

// Tempo limite para aguardar o callback OAuth (em milissegundos)
const OAUTH_TIMEOUT_MS = 120_000;

/** Resultado recebido do callback CLI */
interface CliCallbackResult {
  token: string;
  username: string;
  email: string;
}

// ── Página HTML de sucesso exibida no browser após autenticação ─────────
function buildSuccessHtml(): string {
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
    .success { color: #22c55e; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    p { color: #a1a1aa; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="success">Autenticado com sucesso!</h1>
    <p>Pode fechar esta aba e voltar ao terminal.</p>
  </div>
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
 * Inicia servidor HTTP local temporário e aguarda callback do OAuth via web app.
 * Retorna o CLI token e dados do usuário recebidos via query params.
 */
function waitForOAuthCallback(): Promise<CliCallbackResult> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Gerar nonce state para proteção CSRF (256 bits de entropia)
    const expectedState = randomBytes(32).toString('hex');

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // GET /callback?token=xxx&state=xxx — Recebe token e state via query params
      if (req.method === 'GET' && req.url?.startsWith('/callback')) {
        const url = new URL(req.url, 'http://localhost');
        const token = url.searchParams.get('token');
        const receivedState = url.searchParams.get('state');

        // Validar state (proteção CSRF)
        if (!receivedState || receivedState !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('State invalido. Possivel ataque CSRF. Tente o login novamente.');
          if (!resolved) {
            server.close();
            reject(new Error('State invalido no callback. Possivel ataque CSRF.'));
          }
          return;
        }

        // Validar presença do token
        if (!token) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Token ausente no callback.');
          if (!resolved) {
            server.close();
            reject(new Error('Token ausente no callback. Falha na geracao do token pelo web app.'));
          }
          return;
        }

        // Responder com página de sucesso
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildSuccessHtml());

        resolved = true;
        server.close();

        // username e email serão obtidos via verifyApiToken — retornar token por enquanto
        resolve({ token, username: '', email: '' });
        return;
      }

      // Qualquer outra rota retorna 404
      res.writeHead(404);
      res.end('Not Found');
    });

    // Callback executado após bind bem-sucedido (dual-stack ou fallback IPv4)
    const onListening = () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Falha ao iniciar servidor local'));
        return;
      }

      const port = address.port;

      // Constrói URL para o web app (intermediário OAuth)
      const authUrl =
        `${WEB_APP_URL}/api/auth/cli-callback?port=${port}&state=${encodeURIComponent(expectedState)}`;

      logger.print(`  ${logger.stepIndicator(1, 3)} ${chalk.gray('Abrindo navegador para autenticacao via GitHub...')}`);
      logger.blank();

      // URL para cópia manual caso o navegador não abra
      const urlBox = logger.box([
        chalk.gray('Voce sera redirecionado para o GitHub para autorizar o acesso.'),
        chalk.gray('Se o navegador nao abrir, copie e cole o link abaixo:'),
        '',
        chalk.cyan.underline(authUrl),
      ]);
      logger.print(urlBox);
      logger.blank();

      openBrowser(authUrl);
    };

    // Handler de erro: fallback para IPv4 se IPv6 não estiver disponível
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EAFNOSUPPORT' || err.code === 'EADDRNOTAVAIL') {
        // IPv6 indisponível (kernel sem suporte ou desabilitado) — fallback para IPv4
        server.listen(0, '127.0.0.1', onListening);
      } else {
        reject(err);
      }
    });

    // Escuta em porta aleatória com dual-stack IPv4+IPv6 (0 = SO escolhe a porta)
    // Em Node.js, '::' com ipv6Only=false (padrão) aceita conexões IPv4 e IPv6
    server.listen(0, '::', onListening);

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
 * Fluxo de login interativo via OAuth do GitHub.
 * Usa o web app como intermediário para evitar o problema de redirect_to
 * com porta aleatória não registrada na allowlist do Supabase.
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
    // Passo 1: Aguarda callback OAuth via web app (abre navegador internamente)
    const callbackResult = await waitForOAuthCallback();

    // Passo 2: Verificar token recebido e obter dados do usuário
    logger.print(`  ${logger.stepIndicator(2, 3)} ${chalk.gray('Autenticando...')}`);

    const userData = await verifyApiToken(callbackResult.token, config.registry);

    const username = userData.username || 'unknown';
    const email = callbackResult.email || '';

    // Salva as credenciais no arquivo de autenticação
    const auth: CliAuth = {
      token: callbackResult.token,
      user: {
        id: userData.userId,
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
