# Tarefas de Implementação — Issue #6: Erro ao autenticar pelo CLI (Timeout OAuth)

> **Referências:** [REQUIREMENTS.md](./REQUIREMENTS.md) | [DESIGN.md](./DESIGN.md)
>
> **Estratégia adotada:** Opção A do design — modificar o bind do servidor HTTP temporário no CLI para dual-stack IPv4+IPv6 (`'::'`) com fallback automático para `'127.0.0.1'` em caso de `EAFNOSUPPORT`/`EADDRNOTAVAIL`. O pacote web não será alterado.

---

## 1. Correção do Servidor HTTP Local (CLI)

- [x] 1.1 Modificar `server.listen(0, '127.0.0.1', cb)` para tentar bind em `'::'` (dual-stack IPv4+IPv6) em `packages/cli/src/commands/login.ts` — linha 146
- [x] 1.2 Adicionar handler de erro `'error'` no servidor para capturar `EAFNOSUPPORT` e `EADDRNOTAVAIL` e realizar fallback para `'127.0.0.1'` em `packages/cli/src/commands/login.ts`
- [x] 1.3 Garantir que a lógica de obtenção de porta (`server.address().port`) e abertura do navegador (`openBrowser`) permaneça apenas dentro do evento `'listening'`, funcionando corretamente tanto no caminho dual-stack quanto no fallback IPv4

## 2. Verificação de Integridade do Comportamento Existente

- [x] 2.1 Confirmar que a validação de `state` (proteção CSRF) em `packages/cli/src/commands/login.ts` permanece intacta após a refatoração do bind — resposta HTTP 400 para state inválido ou ausente
- [x] 2.2 Confirmar que o timeout de 120s (`OAUTH_TIMEOUT_MS`) continua funcionando corretamente e que o evento `'close'` limpa o `setTimeout` após o fallback também
- [x] 2.3 Confirmar que `packages/web/src/app/api/auth/callback/route.ts` não requer alteração — a URL `http://localhost:${cliPort}/callback` permanece compatível com o servidor dual-stack

## 3. Validação Manual / Critérios de Aceitação

- [x] 3.1 Verificar que `aitk login` conclui com sucesso em ambiente Linux com `localhost → ::1` (IPv6): servidor deve aceitar a conexão do navegador sem timeout
- [x] 3.2 Verificar que `aitk login` conclui com sucesso em ambiente com `localhost → 127.0.0.1` (IPv4, macOS/Windows): regressão não introduzida
- [x] 3.3 Verificar que callback com `state` inválido ainda retorna HTTP 400 e encerra o servidor
- [x] 3.4 Verificar que o fluxo web sem CLI (sem cookies `aitk-cli-port`/`aitk-cli-state`) não é afetado

---

*Documento gerado automaticamente pelo pipeline SDD — Fase 3 (Tarefas).*
*Issue: #6 | Branch: fix/issue-6 | Data: 2026-03-12*
