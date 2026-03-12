# Tarefas de Implementação — Issue #17: Erro no login do CLI via OAuth

> **Referências:** [REQUIREMENTS.md](./REQUIREMENTS.md) | [DESIGN.md](./DESIGN.md)
>
> **Estratégia adotada:** Propagar o IP real de escuta do servidor CLI (`address.address`) ao web app via parâmetro `host`. O web app valida o host contra allowlist SSRF (`127.0.0.1`, `::1`), salva em cookie `aitk-cli-host`, e usa o host correto (com formatação RFC 2732 para IPv6) na URL de callback — eliminando a dependência de `localhost` hardcoded.

---

## 1. CLI — Detectar e propagar host real de escuta

- [x] 1.1 Em `packages/cli/src/commands/login.ts`, na função `onListening` (L146), capturar `address.address` e normalizar `'::'` para `'::1'` (loopback IPv6 concreto, necessário porque `::` é wildcard de bind, não endereço de destino)
- [x] 1.2 Em `packages/cli/src/commands/login.ts`, incluir o parâmetro `&host=${encodeURIComponent(host)}` na `authUrl` construída em `onListening` (L156–L157)
- [x] 1.3 Em `packages/cli/src/commands/login.ts`, atualizar a mensagem de erro do timeout (L193–L195) para incluir sugestão `aitk login --token <token>` como alternativa (CA-07)

## 2. Web App — Endpoint fast path (`cli-callback/route.ts`)

- [x] 2.1 Em `packages/web/src/app/api/auth/cli-callback/route.ts`, ler o parâmetro `host` da query string, validá-lo contra allowlist `new Set(['127.0.0.1', '::1'])` com default retrocompatível `'127.0.0.1'`, e retornar HTTP 400 se o valor enviado não for válido (proteção SSRF — RF-04, RNF-02)
- [x] 2.2 Em `packages/web/src/app/api/auth/cli-callback/route.ts`, substituir `localhost` hardcoded (L47) pelo `host` validado com formatação RFC 2732 para IPv6 (`host.includes(':') ? '[' + host + ']' : host`) na URL de callback do fast path (RF-03)
- [x] 2.3 Em `packages/web/src/app/api/auth/cli-callback/route.ts`, salvar o cookie `aitk-cli-host` com as mesmas flags de segurança dos cookies existentes (`httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 600`) no caminho OAuth — junto com `aitk-cli-port` e `aitk-cli-state` (RF-07)

## 3. Web App — Endpoint OAuth callback (`callback/route.ts`)

- [x] 3.1 Em `packages/web/src/app/api/auth/callback/route.ts`, ler o cookie `aitk-cli-host` (L78–L79) junto com `aitk-cli-port` e `aitk-cli-state`; usar default `'127.0.0.1'` se ausente (retrocompatibilidade com CLI sem atualização — DT-02)
- [x] 3.2 Em `packages/web/src/app/api/auth/callback/route.ts`, substituir `localhost` hardcoded (L91) pela variável `cliHost` com formatação RFC 2732 para IPv6 na URL de callback do fluxo OAuth completo (RF-06, DT-04)
- [x] 3.3 Em `packages/web/src/app/api/auth/callback/route.ts`, incluir `response.cookies.delete('aitk-cli-host')` em todos os caminhos de saída do bloco CLI: sucesso (L96–L98) e erro (L106–L108)

---

*Documento gerado automaticamente pelo pipeline SDD — Fase 3 (Tarefas).*
*Issue: #17 | Branch: fix/issue-17 | Data: 2026-03-12*
