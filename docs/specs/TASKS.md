# Tarefas de Implementação — Issue #14: Login do CLI trava quando usuário já está autenticado na web

> **Referências:** [REQUIREMENTS.md](./REQUIREMENTS.md) | [DESIGN.md](./DESIGN.md)
>
> **Estratégia adotada:** Modificar exclusivamente `packages/web/src/app/api/auth/cli-callback/route.ts` para detectar sessão Supabase existente e, se presente, gerar o CLI token diretamente e redirecionar para `localhost:{port}/callback` sem passar pelo fluxo OAuth completo. O CLI e o endpoint `/api/auth/callback` não serão alterados.

---

## 1. Implementação da Detecção de Sessão em `cli-callback/route.ts`

- [x] 1.1 Adicionar import de `generateCliToken` de `@/lib/api/generate-cli-token` em `packages/web/src/app/api/auth/cli-callback/route.ts`
- [x] 1.2 Mover (ou duplicar antecipadamente) a instanciação de `supabase = createClient()` para logo após a validação de `port` e `state`, antes do bloco OAuth atual — `packages/web/src/app/api/auth/cli-callback/route.ts` linha 36
- [x] 1.3 Adicionar chamada a `supabase.auth.getUser()` imediatamente após a instanciação do cliente Supabase, para verificar se há sessão ativa no browser do solicitante — `packages/web/src/app/api/auth/cli-callback/route.ts`
- [x] 1.4 Implementar o caminho rápido (`if (user)`): chamar `generateCliToken(user.id)`, montar `callbackUrl = http://localhost:{port}/callback?token=...&state=...` e retornar `NextResponse.redirect(callbackUrl)` — `packages/web/src/app/api/auth/cli-callback/route.ts`
- [x] 1.5 Adicionar tratamento de erro no caminho rápido: envolver `generateCliToken` em `try/catch` e retornar `NextResponse.json({ error: 'Falha ao gerar CLI token.' }, { status: 500 })` em caso de exceção — `packages/web/src/app/api/auth/cli-callback/route.ts`
- [x] 1.6 Garantir que o bloco OAuth existente (linhas 37–70) permanece intacto e é executado apenas quando `user` é `null` ou `getUser()` retorna erro (caminho sem sessão) — `packages/web/src/app/api/auth/cli-callback/route.ts`

## 2. Verificação de Requisitos de Segurança e Integridade

- [x] 2.1 Confirmar que o parâmetro `state` está incluído via `encodeURIComponent` no `callbackUrl` do caminho rápido, garantindo proteção CSRF (RF-03 / RNF-02) — `packages/web/src/app/api/auth/cli-callback/route.ts`
- [x] 2.2 Confirmar que os cookies `aitk-cli-port` e `aitk-cli-state` **não são criados** no caminho rápido — o `response.cookies.set(...)` existente só deve ocorrer no ramo OAuth (DT-02) — `packages/web/src/app/api/auth/cli-callback/route.ts`
- [x] 2.3 Confirmar que `supabase.auth.getUser()` é utilizado (e não `getSession()`) para validar a sessão com round-trip ao servidor Supabase, conforme DT-03 — `packages/web/src/app/api/auth/cli-callback/route.ts`

## 3. Validação Manual / Critérios de Aceitação

- [ ] 3.1 Verificar CA-01: `aitk login` completa em menos de 5 segundos quando o browser possui sessão Supabase ativa (cookie válido) — sem interação do usuário no navegador
- [ ] 3.2 Verificar CA-02: CLI recebe `token` e `state` válidos via query params no callback rápido; `token` é verificável via `GET /api/v1/auth/verify` e `state` é idêntico ao enviado pelo CLI
- [ ] 3.3 Verificar CA-03: fluxo OAuth via GitHub ocorre normalmente quando o usuário **não** está autenticado na web — terminal conclui o login após autenticação no navegador
- [ ] 3.4 Verificar CA-04: proteção CSRF é mantida em ambos os caminhos — CLI rejeita callback com `state` inválido ou ausente com erro explícito
- [ ] 3.5 Verificar CA-05: login web normal (usuário acessando a página sem CLI, sem parâmetros `port`/`state`) não é afetado — `/api/auth/callback` continua funcionando sem cookies CLI presentes
- [ ] 3.6 Verificar CA-06 (parcial): quando `generateCliToken` falha, o browser exibe mensagem de erro JSON `{ error: 'Falha ao gerar CLI token.' }` com HTTP 500 — comportamento esperado documentado no DESIGN.md seção 4.2

---

*Documento gerado automaticamente pelo pipeline SDD — Fase 3 (Tarefas).*
*Issue: #14 | Branch: fix/issue-14 | Data: 2026-03-12*
