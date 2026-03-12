# Design Técnico — Issue #20: Revisão de CI

## 1. Contexto e Estado Atual

### Estrutura do Repositório

Monorepo Turborepo com três pacotes:
- `packages/shared` → `@tarcisiojunior/shared` (publicado no npm, v0.2.2)
- `packages/cli` → `aitk-cli` (publicado no npm, v0.2.4)
- `packages/web` → `@tarcisiojunior/web` (deploy na Vercel, private, v0.3.4)

### Workflows Existentes

| Arquivo | Trigger Atual | Função | Problema |
|---|---|---|---|
| `ci.yml` | `push`/`pull_request` → `main` | lint, type-check, testes, build | Funciona corretamente. Nenhum outro workflow depende da sua conclusão. |
| `release-please.yml` | `push` → `main` | cria PR de release com bump semântico | Dispara em paralelo ao CI, sem aguardar aprovação. |
| `npm-publish.yml` | `release: published` | publica `shared` e `cli` no npm | Correto, mas o elo antes (release-please sem gate) compromete o fluxo. |
| `publish.yml` | `release: published`, `push: tags v*`, `workflow_dispatch` | publica no registry aitk interno | Desconectado do CI; fora do escopo desta issue. |
| Vercel GitHub App | push direto (externo ao Actions) | deploy de produção imediato | Deploy ocorre sem aguardar CI. |

### Problemas Identificados

1. **`release-please.yml` sem gate de CI**: Dispara imediatamente no `push` para `main`, em paralelo com o `ci.yml`, podendo criar PRs de release a partir de commits que quebram a build.

2. **Deploy na Vercel sem gate de CI**: O GitHub App da Vercel realiza deploy de produção no push para `main` sem aguardar o `ci.yml` concluir com sucesso.

3. **Ausência de workflow de deploy Vercel orquestrado pelo CI**: Não existe `vercel-deploy.yml` ou equivalente que aguarde o CI antes de fazer deploy.

4. **`vercel.json` com `buildCommand` incorreto**: O comando atual é:
   ```
   npx turbo run build --filter=@tarcisiojunior/web && echo '{"version":1,"success":false}' > packages/web/.next/export-detail.json
   ```
   O `echo` sobrescreve o `export-detail.json` gerado pelo Next.js com `"success":false`, comprometendo verificações pós-build da Vercel.

---

## 2. Abordagem Técnica

### Fluxo Alvo

```
push → main
  │
  ▼
ci.yml  (jobs: quality → build)
  │
  ├── conclusion: success ──────────────────────────────────────────────┐
  │                                                                      │
  ▼                                                                      ▼
release-please.yml                                            vercel-deploy.yml
(cria PR de release)                                         (deploy produção Vercel)
  │
  ▼
merge do PR de release (aprovação humana)
  │
  ▼
GitHub Release criada (tag semântica por componente)
  │
  ▼
npm-publish.yml
(publica @tarcisiojunior/shared e aitk-cli no npm)
```

### Decisão: Trigger `workflow_run` para Orquestração

O mecanismo `workflow_run` do GitHub Actions é o gatilho correto para dependência entre workflows. Ele dispara quando um workflow nomeado completa, permitindo filtrar por `conclusion: success`.

**Alternativas consideradas**:

| Abordagem | Prós | Contras |
|---|---|---|
| `workflow_run` (separado) | Separação de responsabilidades; workflows independentes | Latência adicional (~5-10min) |
| Consolidar tudo em `ci.yml` | Um único arquivo | Viola coesão; arquivo muito grande |
| `repository_dispatch` custom event | Flexível | Mais complexo; requer step extra para disparar |
| Branch protection sem mudança nos workflows | Zero esforço | Não resolve deploy Vercel sem gate |

**Decisão**: `workflow_run` separado para cada preocupação (release-please e vercel-deploy).

### Decisão: Vercel CLI vs. Deploy Hook

Para o `vercel-deploy.yml`, duas opções foram consideradas:

| Critério | Vercel CLI | Deploy Hook (URL secreta) |
|---|---|---|
| Visibilidade de logs | Alta (output no Actions) | Baixa (apenas disparo HTTP) |
| Número de secrets | 3 (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) | 1 (`VERCEL_DEPLOY_HOOK`) |
| Controle de parâmetros de build | Alta | Baixa |
| URL de deploy no sumário | Sim | Não diretamente |
| Complexidade de setup | Média | Baixa |

**Decisão**: Vercel CLI como abordagem principal. O Deploy Hook é documentado como alternativa para ambientes com acesso limitado a secrets do projeto Vercel.

### Decisão: Desabilitar GitHub App da Vercel para Produção

Para que o gate de CI funcione, o deploy de produção deve ser **exclusivamente** controlado pelo `vercel-deploy.yml`. O GitHub App da Vercel não deve fazer auto-deploy para `main`.

Isso requer configuração manual no painel da Vercel: desabilitar "Production Branch" auto-deploy. Esta é uma etapa operacional fora do escopo de arquivos do repositório, documentada como pré-requisito.

---

## 3. Componentes a Criar ou Modificar

### 3.1 CRIAR: `.github/workflows/vercel-deploy.yml`

**Propósito**: Deploy automático na Vercel após CI aprovado em pushes para `main`.

**Trigger**:
```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
```

**Condição no job**: `if: github.event.workflow_run.conclusion == 'success'`

**Checkout correto**: Em `workflow_run`, o `github.sha` aponta para o SHA do evento filho, não para o commit que gerou o CI. É necessário usar `github.event.workflow_run.head_sha` para checkout:
```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ github.event.workflow_run.head_sha }}
```

**Jobs**:
- `deploy`: instala Vercel CLI, autentica, executa `vercel --prod` com variáveis de ambiente do Next.js.

**Secrets necessários** (a serem cadastrados no GitHub):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Variáveis de ambiente de build** (herdadas dos secrets do repositório, com fallback para placeholders como no `ci.yml`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

**Sumário**: Gerar `$GITHUB_STEP_SUMMARY` com status e URL de deploy.

**Concorrência**: Grupo `vercel-deploy-${{ github.ref }}` com `cancel-in-progress: false` para evitar deploys simultâneos.

---

### 3.2 MODIFICAR: `.github/workflows/release-please.yml`

**Mudança**: Substituir trigger `push: branches: [main]` por `workflow_run` aguardando o CI.

**Antes**:
```yaml
on:
  push:
    branches: [main]
```

**Depois**:
```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
```

**Condição no job**:
```yaml
jobs:
  release-please:
    if: github.event.workflow_run.conclusion == 'success'
```

**Justificativa**: Garante que PRs de release só são criados a partir de commits com build aprovada.

**Impacto no fluxo do release-please**: Quando o release-please merga seu próprio PR de release (bot commit), o CI rodará para esse commit e, ao concluir com sucesso, disparará novamente o `release-please.yml`. Isso é comportamento correto — o release-please detectará que não há novos commits convencionais e não fará nada.

---

### 3.3 MODIFICAR: `vercel.json`

**Mudança**: Remover o trecho `&& echo '{"version":1,"success":false}' > packages/web/.next/export-detail.json`.

**Antes**:
```json
{
  "buildCommand": "npx turbo run build --filter=@tarcisiojunior/web && echo '{\"version\":1,\"success\":false}' > packages/web/.next/export-detail.json",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "npm install --include=optional"
}
```

**Depois**:
```json
{
  "buildCommand": "npx turbo run build --filter=@tarcisiojunior/web",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "npm install --include=optional"
}
```

**Justificativa**: O `export-detail.json` é gerado pelo Next.js com `"success":true` durante um build bem-sucedido. Sobrescrevê-lo com `"success":false` pode causar falhas silenciosas em verificações pós-build da Vercel.

---

### 3.4 NÃO MODIFICAR: `.github/workflows/ci.yml`

O `ci.yml` existente está correto e é o gate de referência:
- Job `commitlint` para PRs (RF-05).
- Job `quality` (lint, type-check, testes) com build do `shared` como dependência.
- Job `build` com `needs: quality`, verificando artefatos do CLI e do Next.js.

Nenhuma alteração necessária.

---

### 3.5 NÃO MODIFICAR: `.github/workflows/npm-publish.yml`

O `npm-publish.yml` está corretamente configurado:
- Trigger `release: published` é o comportamento correto.
- Verificação de idempotência via `npm view` já implementada (RNF-01).
- Grupos de concorrência já configurados (RNF-04).
- Sumário via `$GITHUB_STEP_SUMMARY` já implementado (RNF-05).

---

### 3.6 NÃO MODIFICAR: `.github/workflows/publish.yml`

O `publish.yml` (registry aitk interno) está fora do escopo desta issue.

---

### 3.7 NÃO MODIFICAR: `release-please-config.json` e `.release-please-manifest.json`

A configuração do release-please está correta para monorepo com três componentes e versionamento semântico por pacote.

---

## 4. Modelos de Dados

Não há modelos de dados novos. Os dados relevantes trafegam via contexto do GitHub Actions:

| Variável de contexto | Origem | Uso |
|---|---|---|
| `github.event.workflow_run.conclusion` | GitHub Actions | Gate: verificar se CI passou (`"success"`) |
| `github.event.workflow_run.head_sha` | GitHub Actions | Checkout correto no `vercel-deploy.yml` |
| `github.event.release.tag_name` | GitHub Actions | `npm-publish.yml`: filtrar publicação por pacote (`contains(..., 'shared')`) |

---

## 5. Decisões Técnicas com Alternativas

### D-01: Orquestração via `workflow_run` vs. Workflow Único

**Decisão**: `workflow_run` com arquivos separados por responsabilidade.

**Justificativa**: Cada workflow tem um único propósito claro. Facilita manutenção, debugging e observabilidade no painel do GitHub Actions.

### D-02: Vercel CLI vs. Deploy Hook

**Decisão**: Vercel CLI como padrão. Deploy Hook como alternativa documentada.

**Justificativa**: Maior visibilidade de logs e controle sobre o processo de deploy, ao custo de 2 secrets adicionais.

### D-03: Migrar release-please para `workflow_run`

**Decisão**: Sim, migrar.

**Justificativa**: Criar PRs de release a partir de commits que quebraram o CI é um anti-padrão. O custo é apenas latência adicional de ~5-10min, que é aceitável para um processo de versionamento.

### D-04: Manter `npm-publish.yml` inalterado

**Decisão**: Sim, manter.

**Justificativa**: O fluxo `release: published` é o elo correto. O problema estava antes (release-please sem gate), não no `npm-publish.yml` em si.

---

## 6. Riscos e Trade-offs

### R-01: Latência Adicional no Release-Please

**Risco**: Com `workflow_run`, o release-please adiciona ~5-10 minutos de latência após o push.

**Trade-off aceitável**: Garantia de qualidade antes de criar PRs de release compensa a latência.

### R-02: Desabilitação do GitHub App da Vercel (Manual, Pré-Requisito)

**Risco**: Se o administrador não desabilitar o auto-deploy da Vercel para `main`, ocorrerão deploys duplos: um via GitHub App (sem gate) e outro via `vercel-deploy.yml` (com gate).

**Mitigação**: Documentar como pré-requisito obrigatório antes de ativar o `vercel-deploy.yml`. O deploy duplo não causa perda de dados, apenas desperdício de recursos de build na Vercel.

### R-03: Checkout com SHA Incorreto em `workflow_run`

**Risco**: Em `workflow_run`, `github.sha` aponta para o SHA do commit que disparou o evento filho (não o commit que gerou o CI), causando deploy do código errado.

**Mitigação**: Usar explicitamente `github.event.workflow_run.head_sha` no step de checkout.

### R-04: Secrets da Vercel Ausentes

**Risco**: Se `VERCEL_TOKEN`, `VERCEL_ORG_ID` ou `VERCEL_PROJECT_ID` não estiverem cadastrados, o `vercel-deploy.yml` falhará com erro de autenticação.

**Mitigação**: O workflow deve falhar graciosamente com mensagem de erro clara. Documentar os secrets necessários no próprio arquivo do workflow via comentários.

### R-05: Race Condition em Releases Multi-Pacote

**Risco**: O release-please com `separate-pull-requests: false` pode criar uma release que inclui múltiplos componentes. O `npm-publish.yml` filtra por `contains(tag_name, 'shared')` e `contains(tag_name, 'cli')`, o que funciona apenas se as tags contiverem o nome do componente.

**Estado**: A configuração `include-component-in-tag: true` no `release-please-config.json` garante tags no formato `shared-v0.X.X` e `cli-v0.X.X`, compatível com o filtro atual.

**Mitigação**: Monitorar durante os primeiros ciclos de release pós-implementação.

---

## 7. Pré-Requisitos Operacionais

Etapas manuais necessárias antes ou junto ao merge desta implementação:

1. **Vercel Dashboard**: Desabilitar auto-deploy para a branch `main` no projeto de produção.
   - Caminho: Project Settings → Git → Production Branch → desmarcar auto-deploy.

2. **GitHub Secrets**: Cadastrar no repositório:
   - `VERCEL_TOKEN` (token de autenticação da conta Vercel)
   - `VERCEL_ORG_ID` (ID da organização/conta Vercel — encontrado em Settings da conta)
   - `VERCEL_PROJECT_ID` (ID do projeto Vercel para `packages/web` — encontrado em Project Settings)

3. **GitHub Branch Protection** (RF-06): Configurar status check obrigatório para `main` exigindo aprovação do CI antes de merge (requer acesso de administrador ao repositório).

---

## 8. Sumário de Arquivos Afetados

| Arquivo | Ação | Descrição da Mudança |
|---|---|---|
| `.github/workflows/vercel-deploy.yml` | **CRIAR** | Novo workflow: deploy produção Vercel via CLI, aguardando CI via `workflow_run` |
| `.github/workflows/release-please.yml` | **MODIFICAR** | Substituir trigger `push` por `workflow_run` aguardando CI com sucesso |
| `vercel.json` | **MODIFICAR** | Remover `echo '{"version":1,"success":false}'` do `buildCommand` |
| `.github/workflows/ci.yml` | sem alteração | Gate de referência, já correto |
| `.github/workflows/npm-publish.yml` | sem alteração | Trigger `release: published` já é o correto |
| `.github/workflows/publish.yml` | sem alteração | Fora do escopo desta issue |
| `release-please-config.json` | sem alteração | Configuração correta para monorepo |
| `.release-please-manifest.json` | sem alteração | Versões atuais corretas |
