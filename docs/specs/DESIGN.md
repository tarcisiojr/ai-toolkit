# Design Técnico — Issue #5: Falha no Job de Release (release-please)

## 1. Contexto e Estado Atual

### 1.1 Problema

O workflow `Release Please` (`.github/workflows/release-please.yml`) falha com o erro:

```
Error: release-please failed: GitHub Actions is not permitted to create or approve pull requests.
```

### 1.2 Análise do Código Existente

**Arquivo:** `.github/workflows/release-please.yml`

O workflow está estruturalmente correto:
- Declara `permissions: pull-requests: write` e `contents: write` no nível do workflow (linha 10–13)
- Usa `googleapis/release-please-action@v4` com `config-file` e `manifest-file` para monorepo (linhas 19–25)
- Autentica via `${{ secrets.GITHUB_TOKEN }}` (linha 25)

**Causa raiz:** O `GITHUB_TOKEN` tem suas permissões efetivas limitadas pela configuração do repositório em:

> `Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"`

Quando essa opção está desabilitada, o `GITHUB_TOKEN` **não pode criar PRs**, independentemente das permissões declaradas no YAML. As permissões declaradas no YAML são um teto superior — a configuração do repositório é o limitador real.

### 1.3 Escopo de Impacto

Apenas o workflow `release-please.yml` é afetado. Os workflows `ci.yml`, `publish.yml` e `npm-publish.yml` não utilizam criação de PRs e não são impactados.

---

## 2. Abordagem Técnica

### 2.1 Solução Primária — Configuração do Repositório (sem alteração de código)

**Ação:** Habilitar a opção "Allow GitHub Actions to create and approve pull requests" no repositório GitHub.

```
GitHub → Repositório → Settings → Actions → General → Workflow permissions
☑ Allow GitHub Actions to create and approve pull requests
```

Essa abordagem não requer nenhuma alteração em arquivos do repositório. O workflow já está corretamente configurado com as permissões YAML adequadas.

**Justificativa:**
- Solução mais simples: zero mudanças de código.
- Não cria dependências externas (sem PAT, sem secrets adicionais).
- Não requer manutenção contínua (PATs expiram).
- O workflow já possui as declarações de permissão corretas — basta remover o bloqueio no nível do repositório.

### 2.2 Solução Alternativa — PAT (Personal Access Token)

**Quando usar:** Quando não for possível alterar as configurações do repositório (ex: restrição de organização, política corporativa).

**Ações necessárias:**

1. Criar um PAT com escopo `repo` na conta do proprietário do repositório.
2. Armazenar o PAT como secret `RELEASE_PLEASE_TOKEN` no repositório:
   `Settings → Secrets and variables → Actions → New repository secret`
3. Alterar `release-please.yml` para usar o novo secret:

```yaml
# Linha 25 — substituir:
token: ${{ secrets.GITHUB_TOKEN }}

# Por:
token: ${{ secrets.RELEASE_PLEASE_TOKEN }}
```

**Justificativa para ser alternativa (não preferida):**
- Requer criação e manutenção de um PAT (rotação periódica).
- PATs com escopo `repo` têm acesso mais amplo que o necessário.
- Adiciona complexidade operacional desnecessária se a configuração do repositório puder ser alterada.

---

## 3. Componentes e Arquivos

### 3.1 Solução Primária

| Componente | Ação | Detalhe |
|---|---|---|
| GitHub Settings | Configuração manual | Habilitar "Allow GitHub Actions to create and approve pull requests" |
| `.github/workflows/release-please.yml` | **Sem alteração** | Já está correto |

### 3.2 Solução Alternativa (PAT)

| Componente | Ação | Detalhe |
|---|---|---|
| GitHub Secrets | Criação manual | Adicionar secret `RELEASE_PLEASE_TOKEN` com PAT `repo` |
| `.github/workflows/release-please.yml` | **Modificação mínima** | Substituir `secrets.GITHUB_TOKEN` por `secrets.RELEASE_PLEASE_TOKEN` na linha 25 |

---

## 4. Decisões Técnicas

### DT-01: Preferir configuração de repositório ao invés de PAT

**Decisão:** A solução primária é a configuração de settings do repositório.

**Alternativas consideradas:**
1. **PAT** — funciona, mas adiciona overhead operacional (rotação, escopo mais amplo).
2. **GitHub App personalizado** — excesso de complexidade para o problema em questão.
3. **Alterar o workflow para usar `gh` CLI** — não resolve o bloqueio de permissão; o `GITHUB_TOKEN` ainda seria usado sob o capô.

**Conclusão:** A opção de settings é a menos invasiva e a mais alinhada com o princípio de mínima mudança.

### DT-02: Não alterar outros workflows

**Decisão:** `ci.yml`, `publish.yml` e `npm-publish.yml` não serão tocados.

**Justificativa:** O problema é exclusivo do `release-please.yml`. Alterar outros arquivos amplia o risco sem benefício.

### DT-03: Manter permissões YAML no workflow

**Decisão:** As declarações `contents: write` e `pull-requests: write` permanecem no YAML mesmo após a correção.

**Justificativa:** Seguem o princípio do mínimo privilégio e documentam explicitamente as permissões requeridas pelo workflow, independente de qual token for usado.

---

## 5. Riscos e Trade-offs

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Configuração de repositório não pode ser alterada (política de organização) | Média | Alto | Adotar solução alternativa com PAT |
| PAT expira e release-please para de funcionar | Alta (se PAT usado) | Alto | Documentar prazo de rotação; usar secret com alerta de expiração |
| PAT com escopo `repo` concede acesso além do necessário | Alta (se PAT usado) | Médio | Usar Fine-grained PAT com permissões `contents: write` e `pull-requests: write` apenas |
| Alteração de settings habilita criação de PRs por outros workflows não intencionais | Baixa | Baixo | Os outros workflows não têm `pull-requests: write` declarado, então o bloqueio padrão continua |

---

## 6. Plano de Implementação

### Opção A — Solução Primária (sem PR)

1. Acessar `Settings → Actions → General` no repositório GitHub.
2. Em "Workflow permissions", marcar "Allow GitHub Actions to create and approve pull requests".
3. Salvar.
4. Fazer um push de commit convencional na `main` e verificar se o job executa com sucesso.

**Arquivos modificados no repositório:** nenhum.

### Opção B — Solução Alternativa (com PR)

1. Criar PAT (preferencialmente Fine-grained) com permissões:
   - `contents: write`
   - `pull-requests: write`
2. Adicionar secret `RELEASE_PLEASE_TOKEN` no repositório.
3. Editar `.github/workflows/release-please.yml`, linha 25:
   - De: `token: ${{ secrets.GITHUB_TOKEN }}`
   - Para: `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}`
4. Abrir PR com a alteração, fazer merge na `main`.
5. Verificar execução do workflow.

**Arquivos modificados no repositório:** `.github/workflows/release-please.yml`

---

## 7. Critérios de Verificação

Após a implementação, validar:

- [ ] Job `release-please` executa sem erros na aba Actions.
- [ ] PR de release é criado/atualizado pelo bot `github-actions[bot]`.
- [ ] Logs não exibem `GitHub Actions is not permitted to create or approve pull requests`.
- [ ] Workflows `ci.yml`, `publish.yml` e `npm-publish.yml` continuam funcionando.
- [ ] Se PAT usado: nenhum valor literal de token no YAML (`grep -i token .github/workflows/release-please.yml` não retorna valor hardcoded).
