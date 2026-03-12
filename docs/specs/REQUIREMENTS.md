# Requisitos — Issue #20: Revisão de CI

## Resumo do Problema

O pipeline de CI/CD do repositório `ai-toolkit` (monorepo Turborepo com três pacotes: `shared`, `cli` e `web`) não está realizando deploys automáticos ao realizar push na branch `main`. O objetivo é que, após validar a qualidade do código, os deploys ocorram automaticamente na **Vercel** (aplicação Next.js `packages/web`) e no **npm** (pacotes `@tarcisiojunior/shared` e `aitk-cli`), utilizando versionamento semântico baseado em **Conventional Commits**.

### Estado Atual dos Workflows

| Arquivo | Trigger | Problema |
|---|---|---|
| `ci.yml` | push/PR → main | Roda testes/lint/build. Não dispara deploys. |
| `release-please.yml` | push → main | Cria PRs de release com bump de versão. Não conectado a deploys. |
| `npm-publish.yml` | `release: published` + `workflow_dispatch` | Só publica após release. Não automático no push ao main. |
| `publish.yml` | `release: published`, `push: tags v*`, `workflow_dispatch` | Publica no registry aitk. Desconectado do CI. |
| Vercel | GitHub App (externo) | Deploy ocorre imediatamente ao push, SEM aguardar CI passar. |

### Problemas Identificados

1. **Sem orquestração entre CI e deploys**: Nenhum workflow espera o CI (`ci.yml`) ser aprovado antes de disparar deploys.
2. **Vercel deploys sem gate de qualidade**: O GitHub App da Vercel faz deploy no push sem aguardar CI.
3. **Publicação npm não é automática no push ao main**: Requer fusão do PR do release-please + criação de GitHub Release.
4. **Workflows desconexos**: `ci.yml`, `release-please.yml`, `npm-publish.yml` e `publish.yml` operam de forma independente, sem dependência explícita entre eles.
5. **`vercel.json` com build command incorreto**: O campo `buildCommand` escreve `{"version":1,"success":false}` no `export-detail.json`, podendo causar falhas no deploy da Vercel.

---

## Requisitos Funcionais

### RF-01 — CI como Gate Obrigatório

O pipeline de CI (`lint`, `type-check`, `testes`, `build`) **deve** ser executado e aprovado antes de qualquer deploy ou publicação ao realizar push na branch `main`.

**Critério**: Deploys na Vercel e publicações no npm só ocorrem se o job de CI concluir com sucesso.

---

### RF-02 — Deploy Automático na Vercel após CI

Após a aprovação do CI em push na `main`, o deploy da aplicação `packages/web` **deve** ser disparado automaticamente na Vercel.

**Critério**: Um workflow GitHub Actions deve usar `workflow_run` (ou mecanismo equivalente) para aguardar o CI passar e então acionar o deploy na Vercel via Vercel CLI ou Vercel Deploy Hook.

**Detalhes técnicos**:
- Projeto: `@tarcisiojunior/web` (Next.js 15)
- O deploy deve utilizar o `vercel.json` existente como configuração base
- O campo `buildCommand` no `vercel.json` deve ser corrigido (remover escrita de `"success":false`)

---

### RF-03 — Publicação Automática no npm após CI + Versionamento Semântico

Após CI aprovado e quando houver nova versão gerada pelo release-please, os pacotes `@tarcisiojunior/shared` e `aitk-cli` **devem** ser publicados automaticamente no npm.

**Sequência esperada**:
1. Push na `main` → CI passa
2. release-please detecta commits convencionais → cria PR de release com bump de versão
3. Merge do PR de release → release-please cria GitHub Release com tag
4. `npm-publish.yml` dispara automaticamente via `release: published` → publica no npm

**Critério**: O elo entre CI e publicação deve ser explícito e o fluxo completo deve funcionar sem intervenção manual além de aprovar o PR de release.

---

### RF-04 — Versionamento Semântico via Conventional Commits

O versionamento dos três pacotes (`shared`, `cli`, `web`) **deve** ser gerenciado automaticamente pelo release-please com base em Conventional Commits.

**Critério**:
- `feat:` → bump minor
- `fix:` → bump patch
- `feat!:` / `BREAKING CHANGE:` → bump major
- Configuração existente em `release-please-config.json` e `.release-please-manifest.json` deve ser validada e mantida funcional

---

### RF-05 — Validação de Commits em Pull Requests

Commits em Pull Requests direcionados à `main` **devem** ser validados pelo commitlint para garantir aderência ao padrão Conventional Commits.

**Critério**: Job `commitlint` no `ci.yml` deve estar funcional e cobrir todos os commits do PR (do base sha ao head sha).

---

### RF-06 — Proteção da Branch `main` (Configuração GitHub)

A branch `main` **deve** ter proteção configurada no GitHub para exigir aprovação do CI antes de permitir merge.

**Critério**: Branch protection rules requerendo o status check do CI como obrigatório (requer configuração no painel do GitHub pelo administrador do repositório).

---

## Requisitos Não-Funcionais

### RNF-01 — Idempotência de Publicações

Os workflows de publicação **devem** ser idempotentes: se uma versão já existir no npm, o workflow deve pular a publicação sem falhar. Já parcialmente implementado em `npm-publish.yml` com verificação `npm view`.

### RNF-02 — Segurança de Credenciais

Tokens de autenticação (`NPM_TOKEN`, `AITK_API_TOKEN`, tokens da Vercel) **devem** ser armazenados exclusivamente como GitHub Secrets e nunca expostos em logs.

### RNF-03 — Feedback Rápido

O CI deve fornecer feedback ao desenvolvedor em tempo razoável. O uso do Turborepo com cache de artefatos deve ser garantido nos workflows para evitar rebuilds desnecessários.

### RNF-04 — Concorrência Controlada

Publicações simultâneas do mesmo pacote devem ser evitadas. Os grupos de concorrência (`concurrency`) já definidos nos workflows devem ser preservados.

### RNF-05 — Observabilidade

Cada workflow deve gerar um sumário legível no GitHub Actions (`$GITHUB_STEP_SUMMARY`) indicando o resultado das operações. Já implementado em `npm-publish.yml` e `publish.yml`.

---

## Escopo

### Incluído

- Revisão e correção dos workflows GitHub Actions existentes (`ci.yml`, `release-please.yml`, `npm-publish.yml`, `publish.yml`)
- Criação de workflow para deploy automático na Vercel após CI passar (ou integração via Deploy Hook)
- Validação da cadeia completa de eventos: push → CI → release-please → GitHub Release → npm publish + Vercel deploy
- Correção do `vercel.json` (campo `buildCommand` com valor `"success":false`)
- Garantia de que o release-please está corretamente configurado para os três pacotes do monorepo

### Excluído

- Mudanças no código-fonte dos pacotes (`packages/shared`, `packages/cli`, `packages/web`)
- Configuração de branch protection rules no GitHub (requer acesso de administrador ao repositório)
- Criação de novos ambientes ou infraestrutura além do que já existe
- Modificação da lógica de negócio do CLI ou da aplicação web
- Alteração da ferramenta de versionamento (release-please permanece como padrão)

---

## Critérios de Aceitação

| # | Critério | Como Verificar |
|---|---|---|
| CA-01 | Push na `main` dispara CI automaticamente | Verificar execução de `ci.yml` no GitHub Actions após push |
| CA-02 | Deploy na Vercel não ocorre se CI falhar | Fazer push com código inválido e confirmar que Vercel não realiza deploy |
| CA-03 | Deploy na Vercel ocorre automaticamente após CI passar na `main` | Fazer push válido e confirmar deploy bem-sucedido na Vercel |
| CA-04 | Commit `feat:` no PR → release-please bump minor após merge | Criar PR com `feat:`, mergear, confirmar PR de release com bump minor |
| CA-05 | Commit `fix:` no PR → release-please bump patch após merge | Criar PR com `fix:`, mergear, confirmar PR de release com bump patch |
| CA-06 | Merge do PR de release → GitHub Release criada automaticamente com tag | Confirmar criação de tag e release no GitHub após merge do PR do release-please |
| CA-07 | GitHub Release criada → `npm-publish.yml` publica `@tarcisiojunior/shared` e `aitk-cli` | Verificar execução de `npm-publish.yml` após release e confirmar versões no npm |
| CA-08 | Commits com formato inválido em PRs são rejeitados pelo commitlint | Criar PR com commit `bad message` e confirmar falha no job `commitlint` |
| CA-09 | Publicação de versão já existente no npm é ignorada sem falha | Executar `npm-publish.yml` com versão já publicada e confirmar skip sem erro |
| CA-10 | `vercel.json` não contém escrita de `"success":false` no build command | Revisar `vercel.json` após fix e confirmar que o build do Next.js não é comprometido |

---

## Decisões de Arquitetura Documentadas

1. **Trigger para Vercel deploy**: Será implementado via `workflow_run` aguardando `ci.yml` com status `completed` e `conclusion: success`, ou via Vercel Deploy Hook acionado por step no próprio CI. A abordagem final será decidida na fase de implementação com base nas credenciais e configurações disponíveis no repositório.

2. **Fluxo de release semântico**: Mantém o release-please como único responsável por bump de versão e criação de tags/releases. Não haverá bump manual de versões. A configuração existente em `release-please-config.json` (monorepo com três componentes) deve ser preservada.

3. **GitHub App da Vercel vs. GitHub Actions**: Para garantir que o CI seja gate obrigatório antes do deploy, o deploy via GitHub App da Vercel deve ser desabilitado para a branch `main` (ou configurado para ignorá-la), e o deploy de produção deve ser orquestrado exclusivamente pelo GitHub Actions.

4. **Escopo de publicação no npm**: Os pacotes `@tarcisiojunior/web` (private: true) e o registry interno (`publish.yml`) estão fora do escopo do deploy automático no npm. Apenas `@tarcisiojunior/shared` e `aitk-cli` são publicados no npm público.
