# Design Técnico — Issue #17: Erro no login do CLI via OAuth

## 1. Contexto e Estado Atual

### 1.1 Problema

O comando `aitk login` inicia um servidor HTTP temporário local e abre o browser para autenticação OAuth via web app. O web app, ao construir a URL de callback para o CLI, usa sempre `http://localhost:PORT/callback`. Essa suposição falha em sistemas onde `localhost` resolve para um endereço IP diferente do que o servidor CLI está escutando:

- **Caso A**: Servidor CLI escuta em `::` (IPv6 dual-stack) → browser resolve `localhost` como `127.0.0.1` (IPv4) → conexão recusada
- **Caso B**: Servidor CLI fez fallback para `127.0.0.1` (IPv4) → browser resolve `localhost` como `::1` (IPv6) → conexão recusada
- **Caso C**: Browsers modernos bloqueiam redirects de HTTPS para HTTP local em certas configurações

### 1.2 Estado Atual do Código

**`packages/cli/src/commands/login.ts`**
- `waitForOAuthCallback()` (L92–L204): inicia servidor em `::` com fallback para `127.0.0.1`
- `onListening` callback (L146–L173): captura apenas `address.port`, ignora `address.address`
- URL de autenticação (L156–L157): envia apenas `port` e `state` ao web app — **sem `host`**

```typescript
// Linha 153–157 — estado atual (sem host)
const port = address.port;
const authUrl =
  `${WEB_APP_URL}/api/auth/cli-callback?port=${port}&state=${encodeURIComponent(expectedState)}`;
```

**`packages/web/src/app/api/auth/cli-callback/route.ts`**
- Fast path (L47–L49): usa `localhost` hardcoded na URL de callback
- Não lê nem valida nenhum parâmetro `host`
- Não salva cookie `aitk-cli-host`

```typescript
// Linha 47 — estado atual (localhost hardcoded)
const callbackUrl = `http://localhost:${port}/callback`
  + `?token=...&state=...`;
```

**`packages/web/src/app/api/auth/callback/route.ts`**
- Fluxo CLI (L91–L92): usa `localhost` hardcoded na URL de callback
- Não lê cookie `aitk-cli-host`
- Limpa apenas `aitk-cli-port` e `aitk-cli-state` após uso

```typescript
// Linha 91 — estado atual (localhost hardcoded)
const callbackUrl = `http://localhost:${cliPort}/callback?token=...&state=...`;
```

---

## 2. Abordagem Técnica

### 2.1 Solução Escolhida — Parâmetro `host` propagado via URL + cookie

O CLI detecta o endereço IP real de escuta após o bind do servidor e o envia ao web app como parâmetro `host`. O web app valida o host contra uma allowlist (`127.0.0.1`, `::1`), salva em cookie seguro `aitk-cli-host`, e o usa para construir a URL de callback correta.

**Justificativa:**
- Resolve a causa raiz: a URL de callback usará o IP exato que o servidor está escutando
- Seguro: allowlist estrita previne SSRF; o mecanismo `state` para CSRF permanece intacto
- Mínimo impacto: apenas 3 arquivos modificados, sem novas dependências
- Compatível com todos os SOs (Node.js `server.address()` retorna o IP real em todos os casos)

### 2.2 Alternativas Descartadas

| Alternativa | Razão da rejeição |
|---|---|
| Tentar `127.0.0.1` e `::1` sequencialmente no web app | Acrescenta latência, lógica complexa e não elimina ambiguidade |
| CLI escutar em `127.0.0.1` sempre (remover dual-stack) | Quebra IPv6-only environments; não resolve Caso C |
| Usar `localhost` com fallback automático de resolução DNS | Depende do comportamento do browser/OS, não controlável pelo app |
| Deep link via custom URI scheme (`aitk://callback/...`) | Requer registro de protocolo no OS; não compatível com todos os ambientes |

---

## 3. Componentes e Arquivos Modificados

| Arquivo | Tipo de Mudança | Responsabilidade |
|---|---|---|
| `packages/cli/src/commands/login.ts` | Modificação | Capturar IP real de escuta; incluir `host` na authUrl |
| `packages/web/src/app/api/auth/cli-callback/route.ts` | Modificação | Ler/validar `host`; salvar cookie `aitk-cli-host`; usá-lo no fast path |
| `packages/web/src/app/api/auth/callback/route.ts` | Modificação | Ler cookie `aitk-cli-host`; usá-lo no fluxo OAuth; limpar cookie após uso |

---

## 4. Design Detalhado por Componente

### 4.1 CLI — `packages/cli/src/commands/login.ts`

**Mudança:** Na função `onListening`, após capturar `address.port`, também capturar `address.address` (o IP real de escuta) e incluí-lo como parâmetro `host` na `authUrl`.

```typescript
// Dentro de onListening():
const port = address.port;
const host = address.address; // ex: '::1' ou '127.0.0.1'

const authUrl =
  `${WEB_APP_URL}/api/auth/cli-callback`
  + `?port=${port}`
  + `&state=${encodeURIComponent(expectedState)}`
  + `&host=${encodeURIComponent(host)}`;  // NOVO
```

**Observação sobre `address.address`:**
- Se `server.listen(0, '::')` bem-sucedido: `address.address === '::'` — mas o IP efetivo de conexão depende do OS. Neste caso, devemos normalizar para `::1` (loopback IPv6)
- Se fallback para `server.listen(0, '127.0.0.1')`: `address.address === '127.0.0.1'`

**Lógica de normalização do host:**

```typescript
// Normalizar '::' para '::1' (loopback IPv6), manter outros valores
const rawAddress = address.address;
const host = rawAddress === '::' ? '::1' : rawAddress;
```

Essa normalização é necessária porque `::` significa "bind em todas as interfaces", mas o loopback IPv6 é `::1`. O browser precisa do endereço de destino concreto, não do wildcard.

**Mensagem de timeout (CA-07):** Incluir sugestão de `aitk login --token` na mensagem de erro do timeout:

```typescript
reject(new Error(
  `Tempo limite de ${OAUTH_TIMEOUT_MS / 1000}s excedido. ` +
  `Tente novamente ou use: aitk login --token <token>`
));
```

---

### 4.2 Web App — `packages/web/src/app/api/auth/cli-callback/route.ts`

**Mudanças:**

1. **Validar parâmetro `host`** (allowlist SSRF: `127.0.0.1`, `::1`):

```typescript
const ALLOWED_CLI_HOSTS = new Set(['127.0.0.1', '::1']);

const hostRaw = searchParams.get('host') ?? '127.0.0.1'; // default retrocompatível
if (!ALLOWED_CLI_HOSTS.has(hostRaw)) {
  return NextResponse.json(
    { error: 'Parametro host invalido. Deve ser 127.0.0.1 ou ::1.' },
    { status: 400 },
  );
}
```

O default `127.0.0.1` garante retrocompatibilidade se um CLI antigo (sem parâmetro `host`) chamar o endpoint.

2. **Fast path — usar `host` na URL de callback:**

```typescript
// Formatar host IPv6 com colchetes (RFC 2732)
const hostFormatted = hostRaw.includes(':') ? `[${hostRaw}]` : hostRaw;
const callbackUrl = `http://${hostFormatted}:${port}/callback`
  + `?token=${encodeURIComponent(tokenResult.token)}`
  + `&state=${encodeURIComponent(state)}`;
```

3. **Fluxo OAuth — salvar cookie `aitk-cli-host`:**

```typescript
response.cookies.set('aitk-cli-host', hostRaw, {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: 600,
});
```

---

### 4.3 Web App — `packages/web/src/app/api/auth/callback/route.ts`

**Mudanças:**

1. **Ler cookie `aitk-cli-host`** junto com `aitk-cli-port` e `aitk-cli-state`:

```typescript
const cliPort = request.cookies.get('aitk-cli-port')?.value;
const cliState = request.cookies.get('aitk-cli-state')?.value;
const cliHost = request.cookies.get('aitk-cli-host')?.value ?? '127.0.0.1'; // default retrocompatível
```

2. **Usar `cliHost` na URL de callback:**

```typescript
const hostFormatted = cliHost.includes(':') ? `[${cliHost}]` : cliHost;
const callbackUrl = `http://${hostFormatted}:${cliPort}/callback`
  + `?token=${encodeURIComponent(tokenResult.token)}`
  + `&state=${encodeURIComponent(cliState)}`;
```

3. **Limpar cookie `aitk-cli-host` após uso:**

```typescript
response.cookies.delete('aitk-cli-host');
response.cookies.delete('aitk-cli-port');
response.cookies.delete('aitk-cli-state');
response.cookies.delete('aitk-auth-next');
```

---

## 5. Modelos de Dados

### 5.1 Novos Parâmetros de URL

| Parâmetro | Origem | Destino | Valores Permitidos | Obrigatório |
|---|---|---|---|---|
| `host` | CLI → web app (`cli-callback`) | Query param da authUrl | `127.0.0.1`, `::1` | Não (default: `127.0.0.1`) |

### 5.2 Novo Cookie

| Nome | Valor | maxAge | Flags |
|---|---|---|---|
| `aitk-cli-host` | `127.0.0.1` ou `::1` | 600s | `httpOnly`, `secure`, `sameSite: lax` |

As mesmas flags de segurança dos cookies existentes `aitk-cli-port` e `aitk-cli-state`.

### 5.3 Formatação de IPv6 em URLs (RFC 2732)

Endereços IPv6 em URLs devem ser envolvidos em colchetes:
- `127.0.0.1` → `http://127.0.0.1:PORT/callback`
- `::1` → `http://[::1]:PORT/callback`

A lógica de formatação (`includes(':') ? '[host]' : host`) é aplicada nos dois endpoints do web app.

---

## 6. Decisões Técnicas

### DT-01 — Allowlist no web app, não no CLI

**Decisão:** A validação do host é feita no web app (servidor), não apenas no CLI.

**Justificativa:** O web app é o responsável pelo redirect — ele deve validar independentemente qualquer input que influencie o destino de um redirect, mesmo que o CLI já envie apenas valores válidos. Defense in depth.

### DT-02 — Default `127.0.0.1` para retrocompatibilidade

**Decisão:** Se o parâmetro `host` não for enviado (CLI antigo), os endpoints usam `127.0.0.1` como default.

**Justificativa:** Evita quebra total para CLIs que não foram atualizados. O comportamento é idêntico ao atual (antes do fix) para esses casos.

### DT-03 — Normalizar `::` para `::1` no CLI

**Decisão:** O CLI normaliza `address.address === '::'` para `::1` antes de enviar ao web app.

**Justificativa:** `::` é o wildcard de bind (todas as interfaces), não é um endereço de destino válido para o browser. O loopback IPv6 correto é `::1`. A allowlist do web app aceita apenas `::1`, não `::`.

### DT-04 — Formatação RFC 2732 aplicada no web app

**Decisão:** A formatação `[::1]` é aplicada no web app ao construir a URL, não no CLI.

**Justificativa:** O cookie e o parâmetro armazenam o IP puro (`::1`), sem colchetes. A formatação é responsabilidade de quem constrói a URL final — separar dados de apresentação.

### DT-05 — Não alterar `generateCliToken` nem a tabela `api_tokens`

**Decisão:** O mecanismo de geração e persistência de tokens permanece intocado.

**Justificativa:** O bug é de roteamento de rede, não de geração de tokens. Tocar esses componentes ampliaria o risco sem benefício.

---

## 7. Riscos e Trade-offs

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Browser bloqueia redirect de HTTPS para `http://[::1]:PORT` (Caso C) | Baixa | Alto | O fix resolve Casos A e B (root cause). Caso C é comportamento de browser e requer workaround documentado (ex.: `aitk login --token`) |
| CLI antigo (sem `host`) chama web app novo | Média | Baixo | Default `127.0.0.1` garante comportamento retrocompatível |
| `address.address` retorna valor inesperado | Muito baixa | Médio | Allowlist no web app rejeitará com HTTP 400; CLI exibirá erro claro |
| Cookie `aitk-cli-host` não sendo enviado no fluxo OAuth (SameSite=lax cross-site redirect) | Baixa | Alto | `sameSite: lax` permite envio de cookies em navegações top-level GET, que é exatamente o caso aqui; padrão já usado pelos cookies existentes |

---

## 8. Fluxo Corrigido

### Fast Path (usuário com sessão ativa)

```
CLI
 ├─ server.listen(0, '::') → onListening
 ├─ address = { port: PORT, address: '::' }
 ├─ host = '::1'  ← normalização
 └─ authUrl = /api/auth/cli-callback?port=PORT&state=STATE&host=%3A%3A1

Browser → web app /api/auth/cli-callback
 ├─ valida port ✓, state ✓, host='::1' ✓
 ├─ usuário tem sessão ativa
 ├─ gera CLI token
 └─ redireciona para http://[::1]:PORT/callback?token=T&state=S

Browser → http://[::1]:PORT/callback  ← alcança o servidor CLI ✓
 └─ CLI recebe token, exibe sucesso
```

### Fluxo OAuth Completo (usuário sem sessão)

```
CLI → authUrl com host='::1'

Browser → web app /api/auth/cli-callback
 ├─ valida host ✓
 ├─ sem sessão → redireciona para GitHub OAuth
 └─ salva cookies: aitk-cli-port, aitk-cli-state, aitk-cli-host='::1'

GitHub → web app /api/auth/callback
 ├─ lê cookies: port, state, host='::1'
 ├─ gera CLI token
 ├─ redireciona para http://[::1]:PORT/callback?token=T&state=S  ← host correto ✓
 └─ limpa cookies aitk-cli-*

Browser → http://[::1]:PORT/callback ← alcança servidor CLI ✓
 └─ CLI recebe token, exibe sucesso
```

---

## 9. Critérios de Verificação Pós-Implementação

- [ ] `aitk login` com servidor em IPv4 (`127.0.0.1`): login completa em < 10s
- [ ] `aitk login` com servidor em IPv6 (`::1`): login completa em < 10s
- [ ] Host inválido (ex: `192.168.1.1`) retorna HTTP 400 em `/api/auth/cli-callback`
- [ ] Fluxo OAuth completo (sem sessão) entrega token corretamente ao CLI
- [ ] Cookie `aitk-cli-host` é criado e limpo após uso no fluxo OAuth
- [ ] `aitk login --token aitk_xxx` funciona sem alteração de comportamento
- [ ] Mensagem de timeout inclui sugestão de `aitk login --token <token>`
