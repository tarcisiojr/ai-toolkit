# Requisitos — Issue #30: Ainda permanece com erro o CLI

## Resumo do Problema

Ao executar `npx aitk-cli help`, o npm falha ao tentar instalar `aitk-cli@0.2.8` porque a dependência `@tarcisiojunior/shared@0.2.3` não é encontrada no registry npm:

```
npm error code ETARGET
npm error notarget No matching version found for @tarcisiojunior/shared@0.2.3.
```

**Contexto:** Esta é uma reincidência do problema reportado na issue #28. A issue #28 foi "resolvida" com a adição do script `scripts/sync-shared-version.js` e validação no CI. No entanto, esses mecanismos apenas previnem **futuros** erros de sincronia — eles não corrigiram o estado já publicado no npm.

**Causa raiz atual (dois níveis):**

1. **Imediata:** `@tarcisiojunior/shared@0.2.3` não existe no registry npm público, mas `aitk-cli@0.2.8` foi publicado com uma dependência exata nessa versão. O pacote CLI publicado está irrecuperável sem republicação de uma das partes.

2. **Estrutural:** O job `publish-cli` no workflow `.github/workflows/npm-publish.yml` utiliza `if: always()`, o que permite que ele seja executado mesmo quando o job `publish-shared` é pulado (skipped). Isso ocorre quando a publicação é acionada por uma release tag que contém apenas "cli" (não "shared"), fazendo com que o CLI seja publicado sem garantir que a versão correspondente do `shared` esteja disponível no npm.

**Análise do fluxo de falha:**

```
GitHub Release criada com tag contendo apenas "cli"
  → npm-publish.yml
    → validate: passa (versões consistentes no código)
    → publish-shared: SKIPPED (tag não contém "shared")
    → publish-cli: EXECUTA (always() ignora que publish-shared foi skipped)
      → aitk-cli@0.2.8 publicado com @tarcisiojunior/shared@0.2.3
      → mas @tarcisiojunior/shared@0.2.3 NUNCA foi publicado no npm
      → usuário executa npx aitk-cli → ETARGET
```

---

## Requisitos Funcionais

### RF-01 — Publicação de `@tarcisiojunior/shared@0.2.3` no npm (correção imediata)

O pacote `@tarcisiojunior/shared@0.2.3` deve ser publicado no registry npm para que `aitk-cli@0.2.8` (já publicado e imutável no npm) possa ser instalado por usuários finais sem erros.

**Comportamento esperado:**
- Após a publicação, `npx aitk-cli help` deve executar sem o erro `ETARGET`.
- O pacote deve corresponder ao código atual de `packages/shared` na versão `0.2.3` (conforme declarado em `packages/shared/package.json` e `.release-please-manifest.json`).

### RF-02 — Garantia de ordem de publicação: `shared` antes de `cli`

O workflow de publicação deve garantir que o job `publish-cli` só seja executado quando o `publish-shared` foi concluído com sucesso (ou quando a versão de shared já existia no npm), nunca quando `publish-shared` foi pulado.

**Comportamento esperado:**
- Se o job `publish-shared` for skipped e o `cli` depender de uma versão de `shared` não publicada, o job `publish-cli` deve ser bloqueado ou falhar com mensagem explicativa.
- A condição `if: always()` deve ser substituída por uma condição que verifique se `publish-shared` foi bem-sucedido ou se a versão necessária já está disponível no npm.

### RF-03 — Verificação de disponibilidade do `shared` no npm antes de publicar o `cli`

Antes de publicar o `aitk-cli`, o workflow deve verificar que a versão de `@tarcisiojunior/shared` referenciada em `packages/cli/package.json` existe no registry npm.

**Comportamento esperado:**
- Se a versão do `shared` não existir no npm, o job `publish-cli` deve falhar com uma mensagem clara indicando a versão ausente.
- A verificação deve ocorrer como uma etapa explícita no job `publish-cli`, antes do build e da publicação.

---

## Requisitos Não-Funcionais

### RNF-01 — Compatibilidade com o toolchain existente

A solução deve ser compatível com:
- Release Please (gerenciamento de versões e tags)
- GitHub Actions (workflows existentes)
- npm registry público
- Monorepo com Turbo e npm workspaces

### RNF-02 — Correção sem regressão

A correção da ordem de publicação não deve quebrar o fluxo de publicação individual de pacotes quando solicitado explicitamente (ex: publicar apenas `shared` sem o `cli`).

### RNF-03 — Feedback claro em caso de falha

Quando o pipeline detectar que a versão do `shared` não está disponível no npm antes de publicar o `cli`, a mensagem de erro deve indicar claramente qual versão está faltando e como publicá-la.

---

## Escopo

### Incluído

- Publicação de `@tarcisiojunior/shared@0.2.3` no npm (correção imediata do estado quebrado)
- Correção da condição `if: always()` no job `publish-cli` do `npm-publish.yml`
- Adição de etapa de verificação de disponibilidade do `shared` no npm antes de publicar o `cli`

### Excluído

- Mudança na estratégia de versionamento (continua com Release Please)
- Alteração do script `sync-shared-version.js` (já funciona corretamente para validar sincronia local)
- Alteração da versão do `aitk-cli` já publicada no npm (imutável)
- Suporte a outros gerenciadores de pacotes (yarn, pnpm)
- Alteração da estrutura de pacotes do monorepo

---

## Critérios de Aceitação

| # | Critério | Como verificar |
|---|----------|----------------|
| CA-01 | `npx aitk-cli help` executa sem erros em ambiente limpo | Executar o comando em uma máquina sem cache npm e verificar que não há erro `ETARGET` |
| CA-02 | `@tarcisiojunior/shared@0.2.3` está disponível no npm | Executar `npm view @tarcisiojunior/shared@0.2.3 version` e verificar que retorna `0.2.3` |
| CA-03 | O job `publish-cli` não é executado quando `publish-shared` foi skipped | Disparar o workflow com `package=cli` e verificar que o job falha ou é bloqueado com mensagem explicativa caso a versão do shared não exista no npm |
| CA-04 | O job `publish-cli` é executado normalmente quando `publish-shared` completou com sucesso | Disparar o workflow com `package=all` e verificar que ambos os jobs completam com sucesso |
| CA-05 | O workflow exibe mensagem clara quando a versão do `shared` não existe no npm | Simular publicação do CLI com referência a uma versão inexistente de shared e verificar a mensagem de erro |
| CA-06 | A publicação individual do `shared` (sem o `cli`) continua funcionando | Disparar o workflow com `package=shared` e verificar que apenas o shared é publicado sem erros |

---

## Análise da Diferença com Issue #28

A issue #28 identificou corretamente o problema estrutural e implementou mecanismos de prevenção (script de sincronização + validação no CI). No entanto, a implementação anterior tinha uma lacuna:

| Aspecto | Fix da Issue #28 | Lacuna Identificada na Issue #30 |
|---------|-----------------|----------------------------------|
| Validação local | `scripts/sync-shared-version.js` ✅ | Funciona corretamente |
| Hook pre-commit | `.husky/pre-commit` ✅ | Funciona corretamente |
| Validação no CI | Etapa no job `validate` ✅ | Verifica sincronia local, mas não disponibilidade no npm |
| Ordem de publicação | `needs: [validate, publish-shared]` ⚠️ | `if: always()` anula a dependência quando publish-shared é skipped |
| Estado já publicado | Não corrigido ❌ | `aitk-cli@0.2.8` está publicado com dep quebrada |

---

## Decisões de Design Registradas

**D-01:** A versão `aitk-cli@0.2.8` já publicada no npm é imutável — não é possível republicar a mesma versão com dependência diferente. A solução de menor impacto é publicar `@tarcisiojunior/shared@0.2.3` correspondendo ao código atual do pacote `shared`.

**D-02:** A condição `if: always()` no job `publish-cli` foi provavelmente adicionada para permitir a publicação do CLI independentemente do shared em casos onde o shared não precisava ser republado. No entanto, isso criou uma janela de falha. A correção deve verificar se a versão específica do shared referenciada no CLI já existe no npm antes de prosseguir.

**D-03:** A verificação de disponibilidade do `shared` no npm (`npm view @tarcisiojunior/shared@VERSION version`) é mais confiável do que confiar na lógica de skip/success do GitHub Actions, pois valida o estado real do registry.
