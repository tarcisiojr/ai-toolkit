# Requisitos — Issue #5: Falha no Job de Release (release-please)

## Resumo do Problema

O workflow `Release Please` (`.github/workflows/release-please.yml`) falha ao tentar criar um Pull Request automático de release. O erro reportado é:

```
Error: release-please failed: GitHub Actions is not permitted to create or approve pull requests.
https://docs.github.com/rest/pulls/pulls#create-a-pull-request
```

### Causa Raiz

O GitHub possui uma configuração de segurança no nível do repositório (e/ou organização) que controla se o `GITHUB_TOKEN` padrão do GitHub Actions pode criar ou aprovar Pull Requests. Por padrão, essa permissão pode estar desabilitada.

O workflow **já declara** as permissões corretas no YAML:

```yaml
permissions:
  contents: write
  pull-requests: write
```

Porém, as permissões declaradas no workflow só funcionam se a opção **"Allow GitHub Actions to create and approve pull requests"** estiver habilitada nas configurações do repositório em:

> `Settings > Actions > General > Workflow permissions`

Quando essa opção está desabilitada no nível do repositório/organização, o `GITHUB_TOKEN` é impedido de criar PRs, independentemente das permissões declaradas no workflow YAML.

---

## Requisitos Funcionais

### RF-01: Permissão para criar Pull Requests via GitHub Actions
O sistema de CI/CD deve ser capaz de criar Pull Requests automaticamente na branch `main` usando o token de autenticação configurado no workflow `release-please.yml`.

### RF-02: Execução bem-sucedida do Release Please
O job `release-please` deve executar sem erros, criando ou atualizando o PR de release ao detectar commits convencionais (`feat`, `fix`, etc.) na branch `main`.

### RF-03: Manutenção das permissões declaradas no workflow
O arquivo `.github/workflows/release-please.yml` deve manter as declarações de permissão `contents: write` e `pull-requests: write` como boa prática de segurança (princípio do mínimo privilégio).

### RF-04: Compatibilidade com o modo de autenticação adotado
A solução deve funcionar com uma das seguintes abordagens, em ordem de preferência:
1. **Habilitação da permissão no repositório** (configuração de settings): ativar "Allow GitHub Actions to create and approve pull requests" nas configurações do repositório GitHub.
2. **PAT (Personal Access Token)**: substituir `${{ secrets.GITHUB_TOKEN }}` por um PAT com escopo `repo` armazenado como secret (ex: `secrets.RELEASE_PLEASE_TOKEN`), para os casos em que a configuração do repositório não puder ser alterada.

---

## Requisitos Não-Funcionais

### RNF-01: Segurança
- O token utilizado deve ter o mínimo de escopos necessários.
- Se for usado um PAT, ele deve ser rotacionado periodicamente e armazenado exclusivamente como GitHub Secret (nunca em código).

### RNF-02: Manutenibilidade
- A solução deve ser simples e não introduzir dependências extras ou scripts adicionais.
- A configuração deve ser auto-documentada via comentários no workflow YAML.

### RNF-03: Sem impacto em outros workflows
- A correção não deve alterar o comportamento dos workflows `ci.yml`, `publish.yml` ou `npm-publish.yml`.

---

## Escopo

### Incluído
- Diagnóstico e documentação da causa raiz do erro no workflow `release-please.yml`.
- Correção do workflow para habilitar a criação de PRs pelo GitHub Actions.
- Instrução de configuração de repositório necessária (settings do GitHub) e/ou ajuste no arquivo YAML de workflow.

### Excluído
- Alterações nos workflows `ci.yml`, `publish.yml` e `npm-publish.yml`.
- Alterações em código-fonte dos pacotes (`packages/`).
- Mudanças na lógica de versionamento ou nas configurações do `release-please-config.json` e `.release-please-manifest.json`.
- Criação de novos secrets além do que for estritamente necessário para a correção.

---

## Critérios de Aceitação

| # | Critério | Como verificar |
|---|----------|---------------|
| AC-01 | O workflow `Release Please` executa com sucesso após um commit convencional na branch `main` | Verificar o resultado do job na aba "Actions" do repositório GitHub — status deve ser ✅ `success` |
| AC-02 | Um Pull Request de release é criado (ou atualizado) automaticamente pelo bot `github-actions[bot]` | Verificar a existência de um PR aberto com título no padrão `chore(main): release X.Y.Z` |
| AC-03 | O erro `GitHub Actions is not permitted to create or approve pull requests` não aparece mais nos logs | Inspecionar logs do step `googleapis/release-please-action@v4` |
| AC-04 | Nenhum outro workflow é quebrado pela alteração | Executar manualmente os workflows `CI`, `Publish Artifact` e `Publish to npm` e confirmar que todos passam |
| AC-05 | Se for usado PAT, o token está armazenado como secret e não hardcoded no YAML | Inspecionar o arquivo `release-please.yml` — não deve conter nenhum valor literal de token |

---

## Decisões Técnicas Registradas

**Decisão:** A solução preferencial é habilitar "Allow GitHub Actions to create and approve pull requests" nas configurações do repositório (Settings > Actions > General), pois:
- Não requer criação de secrets adicionais.
- Não requer manutenção de um PAT.
- O workflow já possui as permissões YAML corretas (`pull-requests: write`).

**Alternativa (se settings não puder ser alterado):** Criar um PAT com escopo `repo`, armazená-lo como secret `RELEASE_PLEASE_TOKEN` e substituir `${{ secrets.GITHUB_TOKEN }}` no `token:` do workflow. Isso resolve o bloqueio mesmo sem alterar as configurações do repositório.
