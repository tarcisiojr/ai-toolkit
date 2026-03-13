# Design Técnico — Issue #26: Erro de versão ao usar o CLI

## 1. Contexto e Estado Atual

### Estrutura do Monorepo

O repositório é um monorepo Turborepo com três pacotes publicáveis:

| Pacote | Nome npm | Versão | Público |
|--------|----------|--------|---------|
| `packages/shared` | `@tarcisiojunior/shared` | 0.2.3 | Sim |
| `packages/cli` | `aitk-cli` | 0.2.8 | Sim |
| `packages/web` | `@tarcisiojunior/web` | 0.3.5 | Não |

`packages/cli/package.json` declara dependência exata:
```json
"@tarcisiojunior/shared": "0.2.3"
```

### Workflow Atual (`npm-publish.yml`)

O workflow tem quatro jobs:

```
validate → publish-shared ┐
                           ├→ summary
validate → publish-cli    ┘
```

O `publish-shared` só roda se:
- `package == 'all'` ou `package == 'shared'` (dispatch manual), **ou**
- É um release com tag contendo `'shared'`

O `publish-cli` roda com a condição:
```yaml
if: |
  always() && needs.validate.result == 'success' && (
    github.event.inputs.package == 'all' ||
    github.event.inputs.package == 'cli' ||
    (github.event_name == 'release' && contains(github.event.release.tag_name, 'cli'))
  )
```

### Causa Raiz do Bug

A função `always()` cancela a dependência implícita criada pelo `needs: [validate, publish-shared]`. Quando um release com tag contendo apenas `'cli'` foi disparado (ex.: `aitk-cli-v0.2.8`):

1. `publish-shared` foi **skipped** (tag não continha `'shared'`)
2. `publish-cli` rodou normalmente por causa do `always()`
3. `aitk-cli@0.2.8` foi publicado **sem** que `@tarcisiojunior/shared@0.2.3` estivesse no registry

---

## 2. Abordagem Técnica

A solução é composta de duas partes independentes:

### Parte A — Correção Imediata (One-shot)

Acionar manualmente o workflow `npm-publish.yml` com `package = shared` e `dry_run = false` para publicar `@tarcisiojunior/shared@0.2.3`. Isso restaura o funcionamento para usuários que já tentam instalar `aitk-cli@0.2.8`.

Não há alteração de código nessa parte — é uma ação operacional de CI/CD.

### Parte B — Correção Sistêmica (Workflow)

Modificar `npm-publish.yml` em dois pontos:

**B1. Remover `always()` da condição do `publish-cli`**

Substitui a condição atual por uma que bloqueia o CLI quando `publish-shared` falhou (resultado `failure` ou `cancelled`). O resultado `skipped` continua aceitável (publicação seletiva é um caso de uso válido: ex.: publicar apenas o CLI quando o `shared` não mudou e já está disponível no registry).

**B2. Adicionar step de validação da dependência no `publish-cli`**

Antes de publicar o CLI, um step lê a versão de `@tarcisiojunior/shared` do `packages/cli/package.json` e verifica sua disponibilidade no registry via `npm view`. Se a versão não existir, o step falha com mensagem clara — impedindo a publicação e emitindo log observável (RNF-03).

---

## 3. Componentes e Arquivos Modificados

### Único arquivo alterado

| Arquivo | Tipo de mudança |
|---------|-----------------|
| `.github/workflows/npm-publish.yml` | Modificação |

Nenhum arquivo de código-fonte, `package.json`, ou versão é alterado.

### Mudanças detalhadas no workflow

#### 3.1 Condição do `publish-cli` (linha 129)

**Antes:**
```yaml
if: |
  always() && needs.validate.result == 'success' && (
    github.event.inputs.package == 'all' ||
    github.event.inputs.package == 'cli' ||
    (github.event_name == 'release' && contains(github.event.release.tag_name, 'cli'))
  )
```

**Depois:**
```yaml
if: |
  needs.validate.result == 'success' &&
  (needs.publish-shared.result == 'success' || needs.publish-shared.result == 'skipped') && (
    github.event.inputs.package == 'all' ||
    github.event.inputs.package == 'cli' ||
    (github.event_name == 'release' && contains(github.event.release.tag_name, 'cli'))
  )
```

**Efeito:** Com `always()` removido, o comportamento padrão do GitHub Actions retorna — jobs com `needs` não rodam se uma dependência falhou ou foi cancelada. A condição explicitamente aceita `skipped` para suportar publicação seletiva (`package = cli`).

#### 3.2 Novo step de validação no `publish-cli`

Inserido **antes** do step "Verificar versão" do CLI, após o build:

```yaml
- name: Verificar disponibilidade de @tarcisiojunior/shared
  working-directory: packages/cli
  run: |
    SHARED_VERSION=$(node -e "console.log(require('./package.json').dependencies['@tarcisiojunior/shared'])")
    echo "🔍 Verificando @tarcisiojunior/shared@${SHARED_VERSION} no registry npm..."

    if npm view "@tarcisiojunior/shared@${SHARED_VERSION}" version 2>/dev/null; then
      echo "✅ @tarcisiojunior/shared@${SHARED_VERSION} disponível no registry."
    else
      echo "❌ @tarcisiojunior/shared@${SHARED_VERSION} NÃO encontrado no registry npm."
      echo "   Publique o pacote shared antes de publicar o CLI."
      exit 1
    fi
```

---

## 4. Modelos de Dados

Não aplicável — a mudança é exclusivamente em configuração de CI/CD. Nenhum tipo, schema ou estrutura de dados é criado ou alterado.

---

## 5. Decisões Técnicas

### D1 — Manter `skipped` como estado aceitável para `publish-shared`

**Decisão:** `publish-cli` pode executar quando `publish-shared` foi `skipped`.

**Alternativa considerada:** Bloquear o CLI sempre que `publish-shared` não for `success`.

**Justificativa:** Bloquear no `skipped` impossibilitaria o caso de uso legítimo de publicar apenas o CLI (`package = cli`) quando o `shared` já existe no registry com a versão correta. O step de validação (B2) é a guarda real contra dependência ausente — ele consulta o registry independentemente de como o CI chegou até aquele ponto.

---

### D2 — Validação via `npm view` no step B2

**Decisão:** Usar `npm view @tarcisiojunior/shared@<version> version` para verificar disponibilidade.

**Alternativa considerada:** Tentar instalar com `npm install --dry-run`.

**Justificativa:** `npm view` é uma consulta leve e direta ao registry sem efeitos colaterais. Retorna exit code não-zero quando a versão não existe. `npm install --dry-run` poderia ser confundido com a lógica de dry-run já existente no workflow e teria overhead maior.

---

### D3 — Não alterar versões dos pacotes

**Decisão:** A correção publica `@tarcisiojunior/shared@0.2.3` exatamente como está no repositório.

**Alternativa considerada:** Fazer bump de versão e republish do CLI.

**Justificativa:** `aitk-cli@0.2.8` já está no registry e referencia `0.2.3`. Alterar versões quebraria a invariante que `aitk-cli@0.2.8` já estabelece para usuários. Publicar `shared@0.2.3` é a única mudança que restaura o contrato existente sem criar novas versões desnecessárias.

---

## 6. Riscos e Trade-offs

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `npm view` pode ter falso positivo (versão existe mas corrompida) | Muito baixa | Médio | Fora do escopo; publicação com `--provenance` garante integridade |
| Publicação manual do `shared` pode falhar por token expirado ou permissão | Baixa | Alto | Verificar segredo `NPM_TOKEN` antes de acionar o workflow |
| A condição revisada pode introduzir regressão em outros gatilhos do workflow | Baixa | Médio | A condição foi analisada para todos os três gatilhos: `workflow_dispatch` com `all`/`shared`/`cli` e `release` com tags. Ver tabela abaixo. |

### Tabela de compatibilidade da nova condição

| Gatilho | `publish-shared` result | `publish-cli` executa? | Correto? |
|---------|------------------------|------------------------|----------|
| `package=all` | `success` | Sim | ✅ |
| `package=all` | `skipped` (versão já existe) | Sim | ✅ (B2 valida) |
| `package=shared` | `success` | Não (condição de pacote) | ✅ |
| `package=cli` | `skipped` (não selecionado) | Sim | ✅ (B2 valida) |
| release tag `shared-v*` | `success` | Não (tag não contém `cli`) | ✅ |
| release tag `cli-v*` | `skipped` | Sim | ✅ (B2 valida) |
| release tag `shared-v*` e falha | `failure` | Não | ✅ (bloqueado) |

---

## 7. Plano de Implementação

### Passo 1 — Publicar `@tarcisiojunior/shared@0.2.3` (correção imediata)

Acionar manualmente o workflow `npm-publish.yml` via GitHub Actions UI:
- `package`: `shared`
- `dry_run`: `false`

Verificar após execução: `npm view @tarcisiojunior/shared@0.2.3 version`

### Passo 2 — Corrigir o workflow (prevenção de reincidência)

Editar `.github/workflows/npm-publish.yml`:
1. Substituir a condição `if` do job `publish-cli` (remove `always()`, adiciona checagem explícita de `publish-shared.result`)
2. Inserir step de validação da dependência antes do step "Verificar versão" no job `publish-cli`

### Passo 3 — Verificar critérios de aceitação

- CA-01: `npx aitk-cli help` sem erros
- CA-02: `npm view @tarcisiojunior/shared@0.2.3 version` retorna `0.2.3`
- CA-03/CA-04: Inspecionar lógica do workflow modificado (revisão de código)
- CA-05: Executar o workflow com `dry_run=true` e verificar logs do step de validação
