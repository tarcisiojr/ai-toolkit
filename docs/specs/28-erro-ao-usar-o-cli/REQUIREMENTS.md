# Requisitos — Issue #28: Erro ao usar o CLI

## Resumo do Problema

Ao executar `npx aitk-cli help`, o npm falha ao instalar `aitk-cli@0.2.8` porque a dependência `@tarcisiojunior/shared@0.2.3` não é encontrada no registry npm.

```
npm error code ETARGET
npm error notarget No matching version found for @tarcisiojunior/shared@0.2.3.
```

**Causa raiz:** O pacote `packages/cli/package.json` referencia `@tarcisiojunior/shared` com uma versão exata pinada (`"0.2.3"`). Quando a versão do `shared` é atualizada no repositório mas a versão correspondente ainda não foi publicada no npm (ou foi publicada em ordem diferente), o CLI fica quebrado para usuários finais.

O problema é estrutural: não há mecanismo automático que mantenha a versão referenciada em `cli/package.json` sincronizada com a versão atual do pacote `shared` dentro do monorepo.

---

## Requisitos Funcionais

### RF-01 — Sincronização automática de versão da dependência interna

O sistema deve garantir que a versão de `@tarcisiojunior/shared` referenciada em `packages/cli/package.json` seja automaticamente atualizada sempre que a versão do pacote `packages/shared/package.json` for alterada.

**Comportamento esperado:**
- Quando `packages/shared` tem sua versão incrementada (ex: `0.2.3` → `0.2.4`), a referência em `packages/cli/package.json` deve ser atualizada para a mesma versão.
- A atualização deve ocorrer antes ou durante o processo de publicação no npm.

### RF-02 — Validação da consistência de versões antes da publicação

O pipeline de CI/CD deve verificar se a versão de `@tarcisiojunior/shared` referenciada em `packages/cli/package.json` corresponde à versão declarada em `packages/shared/package.json` antes de publicar qualquer pacote no npm.

**Comportamento esperado:**
- Se houver divergência, o workflow deve falhar com uma mensagem de erro clara indicando o problema.
- A publicação só deve prosseguir se as versões estiverem consistentes.

### RF-03 — Mecanismo de atualização automática (hook ou script)

Deve existir um mecanismo (hook de pre-commit, script npm, ou etapa de CI) que atualize automaticamente a referência de versão do `@tarcisiojunior/shared` no CLI, sem exigir intervenção manual do desenvolvedor.

**Comportamento esperado:**
- O desenvolvedor não precisa lembrar de atualizar manualmente a versão da dependência no CLI ao alterar a versão do `shared`.
- O mecanismo deve ser executado automaticamente como parte do fluxo normal de desenvolvimento/release.

---

## Requisitos Não-Funcionais

### RNF-01 — Compatibilidade com o toolchain existente

A solução deve ser compatível com:
- Turbo monorepo (já utilizado)
- Release Please (gerenciamento de versões e changelogs)
- Husky + Commitlint (hooks de commit)
- npm workspaces

### RNF-02 — Mínima fricção para o desenvolvedor

A solução não deve adicionar etapas manuais obrigatórias ao fluxo de desenvolvimento. Deve ser transparente ou com feedback claro.

### RNF-03 — Sem alteração do range de versão sem motivo

A solução deve manter a consistência de semver: ao atualizar a dependência, usar o mesmo tipo de range que já estava definido (exato, `^`, `~`, etc.), a menos que haja decisão explícita de mudar.

---

## Escopo

### Incluído

- Mecanismo de sincronização automática da versão de `@tarcisiojunior/shared` no `packages/cli/package.json`
- Validação de consistência de versões no workflow de publicação npm (`npm-publish.yml`)
- Script ou hook para manter o `package-lock.json` atualizado após a sincronização

### Excluído

- Mudança na estratégia de versionamento do monorepo (continua com Release Please)
- Publicação automática sem aprovação manual (fora do escopo desta issue)
- Suporte a outros gerenciadores de pacotes (yarn, pnpm)
- Alteração da estrutura de pacotes do monorepo

---

## Critérios de Aceitação

| # | Critério | Como verificar |
|---|----------|----------------|
| CA-01 | Ao incrementar a versão em `packages/shared/package.json`, a versão referenciada em `packages/cli/package.json` é atualizada automaticamente | Alterar versão do shared, executar o mecanismo (hook/script) e verificar que cli/package.json foi atualizado |
| CA-02 | O workflow `npm-publish.yml` falha com mensagem clara quando as versões estão inconsistentes | Criar PR com versões divergentes e verificar que o CI bloqueia a publicação |
| CA-03 | O workflow `npm-publish.yml` passa quando as versões estão consistentes | Criar PR com versões sincronizadas e verificar que o CI prossegue |
| CA-04 | Um usuário final consegue executar `npx aitk-cli help` sem erros após a publicação de uma nova versão | Publicar versões sincronizadas e executar o comando em ambiente limpo |
| CA-05 | O desenvolvedor não precisa executar nenhum passo manual para manter as versões sincronizadas | Simular fluxo de atualização de versão sem passos manuais adicionais |

---

## Decisões de Design Registradas

**D-01:** Utilizar o workspace protocol do npm (`"@tarcisiojunior/shared": "*"`) em vez de uma versão exata poderia resolver o problema localmente, mas não resolve o problema de publicação no npm (que requer versão exata). A solução deve garantir que a versão exata esteja sempre correta no momento da publicação.

**D-02:** O Release Please já gerencia versões dos pacotes. A solução deve se integrar ao seu fluxo (ex: via `extraFiles` no config ou via script pós-release-please) para não criar conflito.

**D-03:** A abordagem mais simples e robusta é um script de sincronização executado como etapa no workflow de publicação, antes do build, e opcionalmente como hook pre-commit para feedback imediato ao desenvolvedor.
