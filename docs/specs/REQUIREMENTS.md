# Requisitos — Issue #17: Erro no login do CLI via OAuth

## Resumo do Problema

O comando `aitk login` inicia um fluxo OAuth via browser para autenticação no AI Toolkit Registry. O browser abre corretamente, mas o CLI nunca recebe o callback de retorno, resultando em timeout de 120 segundos.

### Fluxo atual (com bug)

```
CLI → abre browser → /api/auth/cli-callback?port=PORT&state=STATE
                                  ↓
                    (usuário já logado no portal)
                                  ↓
              web app gera CLI token e redireciona para:
              http://localhost:PORT/callback?token=...&state=...
                                  ↓
                    ❌ browser não consegue alcançar o servidor local
                                  ↓
                    CLI aguarda 120s → timeout
```

### Causa Raiz

O endpoint `/api/auth/cli-callback` redireciona o browser para `http://localhost:PORT/callback` (usando sempre `localhost` como hostname). O servidor HTTP local do CLI, porém, escuta em `::` (dual-stack IPv6+IPv4), com fallback automático para `127.0.0.1` se IPv6 não estiver disponível.

Há incompatibilidade de endereço em dois cenários:

- **Caso A**: Servidor CLI escuta em `::` com `IPV6_V6ONLY=1` (kernel Linux com IPv6 exclusivo) → browser resolve `localhost` como `127.0.0.1` (IPv4) → conexão recusada
- **Caso B**: Servidor CLI fez fallback para `127.0.0.1` (IPv4) → browser resolve `localhost` como `::1` (IPv6) → conexão recusada
- **Caso C**: Políticas de segurança de alguns browsers bloqueiam redirect de HTTPS (`vercel.app`) para HTTP `localhost` em certas configurações

O mesmo problema ocorre no fluxo OAuth completo (usuário sem sessão ativa), pois `/api/auth/callback` também usa `http://localhost:${cliPort}/callback` no redirect final.

---

## Requisitos Funcionais

### RF-01 — Callback deve alcançar o servidor CLI
O browser deve conseguir fazer requisição ao servidor HTTP temporário iniciado pelo CLI após completar o fluxo de autenticação no portal, independente de como `localhost` é resolvido no sistema do usuário.

### RF-02 — CLI deve informar o host real de escuta ao web app
O CLI deve incluir o endereço IP real em que o servidor local está escutando (ex.: `127.0.0.1` ou `::1`) na URL de autenticação enviada ao web app, em vez de deixar o web app assumir `localhost`.

### RF-03 — Web app deve usar o host informado pelo CLI na URL de callback
Os endpoints `/api/auth/cli-callback` e `/api/auth/callback` devem construir a URL de callback usando o host informado pelo CLI (parâmetro `host`), não sempre `localhost`.

### RF-04 — Web app deve validar o host informado pelo CLI
O host recebido do CLI deve ser validado contra uma allowlist restrita (`127.0.0.1` e `::1`) para prevenir SSRF (Server-Side Request Forgery).

### RF-05 — Compatibilidade com fast path (usuário já autenticado)
Quando o usuário já possui sessão ativa no portal web, o CLI token deve ser gerado e entregue ao CLI sem exigir nova autenticação no GitHub/Supabase.

### RF-06 — Compatibilidade com fluxo OAuth completo (usuário sem sessão)
Quando o usuário não possui sessão ativa, o fluxo OAuth (GitHub → Supabase → callback) deve concluir com o CLI recebendo o token.

### RF-07 — Cookie de host CLI deve ser preservado durante OAuth
O host informado pelo CLI deve ser salvo em cookie seguro junto com `aitk-cli-port` e `aitk-cli-state`, para estar disponível no callback OAuth.

### RF-08 — Mensagem de erro clara em caso de timeout
Se o callback não for recebido dentro do prazo (120s), o CLI deve exibir mensagem de erro com sugestão de usar `aitk login --token <token>` como alternativa.

### RF-09 — Fluxo `--token` não deve ser afetado
O fluxo de autenticação via API token (`aitk login --token <token>`) não deve ser modificado.

---

## Requisitos Não-Funcionais

### RNF-01 — Proteção CSRF preservada
A correção não deve remover ou enfraquecer o mecanismo de validação via `state` (nonce CSRF).

### RNF-02 — Proteção SSRF no web app
O web app deve validar o host recebido do CLI contra allowlist estrita (`127.0.0.1`, `::1`) antes de redirecionar, evitando SSRF.

### RNF-03 — Sem exposição de token
O CLI token não deve ser exposto em logs do servidor ou em qualquer saída persistente além do terminal do usuário.

### RNF-04 — Compatibilidade cross-platform
A solução deve funcionar em macOS, Linux e Windows.

### RNF-05 — Sem novas dependências de runtime
A correção não deve introduzir novas dependências de runtime no pacote CLI ou web.

### RNF-06 — Tempo de resposta
O fluxo de login interativo deve completar em menos de 30 segundos em condições normais de rede.

---

## Escopo

### Incluído

- Ajuste no CLI (`login.ts`): detectar o endereço real de escuta após `server.listen()` e incluir o parâmetro `host` na URL de autenticação enviada ao web app
- Ajuste no web app (`cli-callback/route.ts`): ler e validar o parâmetro `host`, salvar em cookie `aitk-cli-host`, usar o host na construção da URL de callback (fast path)
- Ajuste no web app (`callback/route.ts`): ler o cookie `aitk-cli-host` e usá-lo na URL de callback do fluxo OAuth completo; limpar o cookie após uso
- Validação SSRF no web app (allowlist: `127.0.0.1`, `::1`)

### Excluído

- Alteração no mecanismo de geração ou armazenamento de tokens (`generateCliToken`, tabela `api_tokens`)
- Mudança no fluxo `--token` (CI/CD via API token)
- Suporte a outros providers OAuth além do GitHub
- Alteração na UI do portal web
- Mudança no valor do timeout de 120s
- Alteração em outros comandos CLI

---

## Critérios de Aceitação

### CA-01 — Fast path com sessão ativa (IPv4)
**Dado** que o usuário está autenticado no portal web e o servidor CLI escutou em `127.0.0.1`
**Quando** executa `aitk login`
**Então** o browser abre, o login completa em menos de 10s, e o CLI exibe mensagem de sucesso com nome do usuário.

### CA-02 — Fast path com sessão ativa (IPv6)
**Dado** que o usuário está autenticado no portal web e o servidor CLI escutou em `::1`
**Quando** executa `aitk login`
**Então** o browser abre, o login completa em menos de 10s, e o CLI exibe mensagem de sucesso com nome do usuário.

### CA-03 — Fluxo OAuth sem sessão ativa
**Dado** que o usuário não possui sessão ativa no portal
**Quando** executa `aitk login`
**Então** o browser abre o GitHub para autenticação, após autorizar o CLI exibe sucesso em menos de 30s.

### CA-04 — Rejeição de host inválido (proteção SSRF)
**Dado** que a requisição ao web app inclui um `host` diferente de `127.0.0.1` ou `::1`
**Quando** o web app processa a requisição em `/api/auth/cli-callback`
**Então** retorna HTTP 400 sem redirecionar.

### CA-05 — Cookie de host preservado no fluxo OAuth
**Dado** que o fluxo OAuth completo é executado (sem sessão ativa)
**Quando** o callback do GitHub chega em `/api/auth/callback`
**Então** o cookie `aitk-cli-host` está presente e é usado para construir a URL correta de retorno ao CLI.

### CA-06 — Nenhuma regressão no fluxo `--token`
**Quando** executa `aitk login --token aitk_xxx`
**Então** o token é verificado e o login é concluído normalmente (comportamento inalterado).

### CA-07 — Timeout com mensagem orientativa
**Dado** que o callback não é recebido em 120s
**Quando** o timeout expira
**Então** o CLI exibe mensagem de erro que inclui sugestão de usar `aitk login --token <token>` como alternativa.

---

## Contexto Técnico Relevante

| Componente | Arquivo | Responsabilidade |
|---|---|---|
| CLI — comando login | `packages/cli/src/commands/login.ts` | Inicia servidor local, abre browser, aguarda callback |
| CLI — servidor HTTP local | `waitForOAuthCallback()` em `login.ts` (L92–L204) | Escuta em `::` com fallback para `127.0.0.1` |
| Web — fast path | `packages/web/src/app/api/auth/cli-callback/route.ts` | Detecta sessão ativa e redireciona para CLI |
| Web — OAuth callback | `packages/web/src/app/api/auth/callback/route.ts` | Conclui OAuth e redireciona para CLI |
| Web — geração de token | `packages/web/src/lib/api/generate-cli-token.ts` | Gera e persiste CLI token no banco |

**Parâmetros atuais enviados pelo CLI ao web app:**
- `port`: porta aleatória escolhida pelo SO (parâmetro existente)
- `state`: 256 bits de entropia, nonce CSRF (parâmetro existente)

**Novo parâmetro proposto:**
- `host`: endereço IP real em que o servidor está escutando (`127.0.0.1` ou `::1`)

**Cookies CLI no web app (atuais):**
- `aitk-cli-port`: porta do servidor CLI (maxAge: 600s, httpOnly, secure, sameSite: lax)
- `aitk-cli-state`: nonce CSRF (mesmas flags)

**Novo cookie proposto:**
- `aitk-cli-host`: host real do servidor CLI (mesmas flags de segurança)
