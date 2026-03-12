# Tarefas — Fix: Erro de Login via CLI (Issue #1)

## 1. Refatoração Base (Web App)

- [x] 1.1 Ler e entender o código atual de `packages/web/src/app/api/v1/auth/cli-token/route.ts` para identificar a lógica de geração de token a ser extraída
- [x] 1.2 Criar `packages/web/src/lib/api/generate-cli-token.ts` com a função `generateCliToken(userId: string): Promise<{ token: string; username: string; email: string }>` extraída do route handler atual
- [x] 1.3 Refatorar `packages/web/src/app/api/v1/auth/cli-token/route.ts` para importar e usar a função extraída em vez de conter a lógica inline, mantendo comportamento idêntico

## 2. Web App — Novo Endpoint `/api/auth/cli-callback`

- [x] 2.1 Criar o arquivo `packages/web/src/app/api/auth/cli-callback/route.ts` com handler `GET` que:
  - Lê parâmetros `port` e `state` da query string
  - Valida `port` (inteiro 1024–65535) e `state` (string, mín. 32 chars), retornando 400 em caso de falha
  - Define cookies `aitk-cli-port` e `aitk-cli-state` com flags `HttpOnly; SameSite=Lax; Secure; Path=/; max-age=600`
  - Redireciona para o fluxo OAuth do Supabase com `redirect_to` apontando para `https://ai-toolkit-henna.vercel.app/api/auth/callback`

## 3. Web App — Atualização do Callback OAuth

- [x] 3.1 Ler e entender o código atual de `packages/web/src/app/api/auth/callback/route.ts`
- [x] 3.2 Modificar `packages/web/src/app/api/auth/callback/route.ts` para, após `exchangeCodeForSession()` com sucesso:
  - Verificar presença dos cookies `aitk-cli-port` e `aitk-cli-state`
  - Se presentes: chamar `generateCliToken()` com o `userId` da sessão, redirecionar para `http://localhost:{port}/callback?token={cliToken}&state={state}` e limpar os cookies CLI
  - Se ausentes: manter comportamento atual (redirecionar para dashboard via `aitk-auth-next`)

## 4. CLI — Reescrita do Fluxo OAuth em `login.ts`

- [x] 4.1 Ler e entender o código atual de `packages/cli/src/commands/login.ts` na íntegra
- [x] 4.2 Modificar a função `waitForOAuthCallback()` em `packages/cli/src/commands/login.ts` para:
  - Gerar nonce `state` usando `crypto.randomBytes(32).toString('hex')`
  - Construir a URL do web app: `https://ai-toolkit-henna.vercel.app/api/auth/cli-callback?port={PORT}&state={STATE}`
  - Remover a construção da URL OAuth direta para o Supabase
- [x] 4.3 Modificar o handler do servidor local em `packages/cli/src/commands/login.ts` para:
  - Aceitar `GET /callback?token=xxx&state=xxx` (query params) em vez de fragment `#access_token`
  - Validar que `state` recebido é igual ao nonce gerado (rejeitar com erro se divergir — proteção CSRF)
  - Retornar página HTML de sucesso e encerrar o servidor após callback válido
- [x] 4.4 Modificar a função `loginWithOAuth()` em `packages/cli/src/commands/login.ts` para:
  - Remover chamada a `fetchSupabaseUser()` (dados do usuário virão do CLI token)
  - Salvar `auth.token = cliToken` (`aitk_xxx`) em vez do `access_token` do Supabase
  - Usar `username` e `email` retornados junto com o token
- [x] 4.5 Remover código morto de `packages/cli/src/commands/login.ts`:
  - Interface/tipo `OAuthTokens` → substituir por `CliCallbackResult { token: string; username: string; email: string }`
  - Interface/tipo `SupabaseUser` → remover
  - Função `fetchSupabaseUser()` → remover
  - Constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` → remover (se não usadas em outro lugar do arquivo)

## 5. Tratamento de Erros e UX no CLI

- [x] 5.1 Garantir que `packages/cli/src/commands/login.ts` exibe erro claro nos casos:
  - Timeout de 120s sem receber callback
  - `state` inválido ou ausente no callback
  - `token` ausente no callback (falha na geração pelo web app)
  - Falha ao abrir o navegador (exibir a URL para cópia manual)
