# Design Técnico — Issue #28: Erro ao usar o CLI

## 1. Contexto e Estado Atual

### Estrutura do Monorepo

```
ai-toolkit/
├── packages/
│   ├── shared/       (@tarcisiojunior/shared — biblioteca comum)
│   ├── cli/          (aitk-cli — ferramenta de linha de comando)
│   └── web/          (@tarcisiojunior/web)
├── .github/workflows/
│   ├── npm-publish.yml   (publica shared e cli no npm)
│   └── release-please.yml
├── release-please-config.json
├── .release-please-manifest.json
└── .husky/
    └── commit-msg    (commitlint)
```

### Problema Atual

`packages/cli/package.json` referencia `@tarcisiojunior/shared` com versão exata pinada:

```json
"dependencies": {
  "@tarcisiojunior/shared": "0.2.3"
}
```

O Release Please gerencia versões dos pacotes de forma independente. Quando bumpa a versão de `packages/shared` (ex: `0.2.3` → `0.2.4`), **não há nenhum mecanismo que atualize a referência** em `packages/cli/package.json`. Isso resulta em:

1. `shared@0.2.4` é publicado no npm
2. `cli@0.2.9` é publicado, ainda referenciando `shared@0.2.3`
3. Se `0.2.3` foi despublicado ou nunca existiu com aquele nome exato → `ETARGET` ao instalar via `npx`

### Fluxo de Publicação Atual

```
push main → release-please.yml → Release PR (bumpa versões)
merge Release PR → npm-publish.yml (acionado por GitHub Release)
  └─ validate → publish-shared → publish-cli
```

O `npm-publish.yml` atualmente **não verifica** se a versão de `shared` referenciada no `cli` é a correta antes de publicar.

---

## 2. Abordagem Técnica Escolhida

### Estratégia: Script de Sincronização + Validação em CI

A solução combina três componentes:

1. **Script de sincronização** (`scripts/sync-shared-version.js`): lê a versão atual de `packages/shared/package.json` e atualiza a referência em `packages/cli/package.json`, preservando o tipo de range semver existente.

2. **Hook pre-commit** (`.husky/pre-commit`): executa o script de sincronização automaticamente antes de cada commit, garantindo que o desenvolvedor nunca precise lembrar de atualizar manualmente.

3. **Etapa de validação no `npm-publish.yml`**: verifica a consistência das versões antes de qualquer publicação, bloqueando o pipeline com mensagem de erro clara em caso de divergência.

### Por que esta abordagem

- **Integra com o toolchain existente**: usa Husky (já configurado), não altera o Release Please, não altera npm workspaces.
- **Dois níveis de proteção**: o hook corrige localmente durante desenvolvimento; a validação em CI bloqueia se algo escapar.
- **Mínima fricção**: o desenvolvedor não executa nenhum passo manual. O hook roda silenciosamente e o arquivo atualizado entra no commit automaticamente.
- **Sem side effects em produção**: a sincronização ocorre antes do commit (não durante o publish), portanto o estado no git é sempre consistente.

### Alternativas Consideradas

| Alternativa | Prós | Contras | Decisão |
|-------------|------|---------|---------|
| `extraFiles` no Release Please config | Nativo ao RP | RP não suporta atualizar dependências em outros packages.json; apenas arquivos extras com padrão de versão simples | Descartado |
| Workspace protocol `"*"` em dev, versão exata em publish | Transparente no dev | Requer transformação no momento do publish; adiciona complexidade ao pipeline | Descartado (D-01 nos requisitos) |
| Script apenas no workflow de publish (sem hook) | Simples | Não dá feedback imediato ao dev; divergência fica latente até CI rodar | Descartado (não atende RF-03/CA-05) |
| **Script + hook pre-commit + validação CI** | Dois níveis de proteção; feedback imediato; sem passos manuais | Script adicional no repo | **Escolhido** |

---

## 3. Componentes e Arquivos

### 3.1 Novo: `scripts/sync-shared-version.js`

Script Node.js (ESM, sem dependências externas) que:

1. Lê `packages/shared/package.json` → extrai `version`
2. Lê `packages/cli/package.json` → extrai a referência atual de `@tarcisiojunior/shared`
3. Detecta o prefixo de range atual (`^`, `~`, ou exato)
4. Se a versão divergir, atualiza `packages/cli/package.json` preservando o prefixo
5. Reporta o que foi feito (stdout); se já estava em sync, não modifica o arquivo
6. Suporta flag `--check`: apenas valida sem modificar; exit 1 se divergir (usado no CI)

```
scripts/sync-shared-version.js --check   → apenas valida (CI)
scripts/sync-shared-version.js           → sincroniza (hook)
```

### 3.2 Novo: `.husky/pre-commit`

Hook que executa o script de sincronização antes de cada commit:

```sh
node scripts/sync-shared-version.js
# Se o arquivo foi modificado, adiciona ao staging automaticamente
```

O hook deve adicionar `packages/cli/package.json` ao staging (`git add`) caso o script tenha feito alguma alteração, para que a correção entre no commit em andamento.

### 3.3 Modificado: `.github/workflows/npm-publish.yml`

Adicionar nova etapa no job `validate`, após `Instalar dependências` e **antes** de `Build`:

```yaml
- name: Verificar consistência de versões internas
  run: node scripts/sync-shared-version.js --check
```

Esta etapa falha com `exit 1` se as versões divergirem, bloqueando os jobs `publish-shared` e `publish-cli` que dependem de `validate`.

### 3.4 Modificado: `package.json` (raiz)

Adicionar script npm para facilitar execução manual e documentação:

```json
"scripts": {
  "sync-versions": "node scripts/sync-shared-version.js"
}
```

---

## 4. Lógica Detalhada do Script

### Detecção de range semver

O script deve preservar o tipo de range existente ao atualizar a versão:

| Valor atual em cli/package.json | Versão nova de shared | Resultado |
|---|---|---|
| `"0.2.3"` (exato) | `0.2.4` | `"0.2.4"` |
| `"^0.2.3"` | `0.2.4` | `"^0.2.4"` |
| `"~0.2.3"` | `0.2.4` | `"~0.2.4"` |

### Fluxo do script (modo sync)

```
1. Ler packages/shared/package.json → SHARED_VERSION
2. Ler packages/cli/package.json → CLI_SHARED_REF
3. Extrair prefixo de CLI_SHARED_REF (^, ~, ou "")
4. Construir nova referência: prefixo + SHARED_VERSION
5. Se nova referência == CLI_SHARED_REF → log "já em sync", exit 0
6. Atualizar packages/cli/package.json com nova referência
7. Log "atualizado: X → Y", exit 0
```

### Fluxo do script (modo --check)

```
1-4. Igual ao modo sync
5. Se nova referência == CLI_SHARED_REF → log "OK", exit 0
6. Log erro claro: "ERRO: @tarcisiojunior/shared@X no cli mas shared está em Y"
7. exit 1
```

---

## 5. Fluxo com a Solução Implementada

### Desenvolvimento local

```
dev altera packages/shared/package.json (bump de versão)
  → git commit
    → .husky/pre-commit executa sync-shared-version.js
      → cli/package.json atualizado automaticamente
      → git add packages/cli/package.json
    → commit inclui ambos os arquivos atualizados
```

### Pipeline de publicação

```
GitHub Release criada
  → npm-publish.yml
    → validate job:
        Instalar deps
        Verificar consistência de versões ← NOVA ETAPA
          se divergir → exit 1, workflow falha com mensagem clara
          se OK → continua
        Build
        Lint
        Type Check
        Testes
    → publish-shared (depende de validate)
    → publish-cli (depende de validate + publish-shared)
```

---

## 6. Decisões Técnicas

### D-01: Script em JS puro (sem dependências)

O script usa apenas `node:fs` e `node:path` (built-ins do Node.js). Não adiciona dependências ao `package.json` da raiz. Isso garante que funciona em qualquer ambiente com Node.js 20+ sem instalação prévia — inclusive no hook pre-commit antes de `npm ci`.

### D-02: ESM em vez de CommonJS

O projeto usa `"type": "module"` nos packages. O script usa ESM (`import`, `fs/promises`) para consistência. A flag `--input-type=module` ou extensão `.js` com package.json `type: module` na raiz resolve o contexto.

**Atenção:** O `package.json` da raiz não declara `"type": "module"`. O script deve usar extensão `.mjs` ou ser invocado com `node --input-type=module`, ou usar `require()` (CJS) para ser executado diretamente. A opção mais simples: usar `require()` em CJS puro, sem depender do `type` do package.json raiz.

### D-03: Não rodar `npm install` automaticamente no hook

Atualizar `package-lock.json` no hook pre-commit é lento e pode causar problemas (ex: se o `shared` ainda não foi publicado no npm). O hook apenas atualiza o `package.json` do CLI. O `package-lock.json` será atualizado no próximo `npm install` do desenvolvedor ou pelo CI.

### D-04: Posição da validação no workflow

A etapa de validação é inserida no job `validate` (que já existe), não em um job separado. Isso evita adicionar latência ao pipeline e mantém a lógica de validação centralizada no job que já agrega todas as verificações pré-publicação.

---

## 7. Riscos e Trade-offs

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Hook pre-commit não roda (husky não instalado) | Baixa | Médio | Validação no CI serve como segunda barreira; dev vê falha antes do publish |
| Script falha por mudança de estrutura do package.json | Baixa | Alto | Script com tratamento de erro explícito e mensagens claras |
| `package-lock.json` fica desatualizado após sync | Alta | Baixo | Divergência resolve no próximo `npm ci`; não afeta publicação |
| Release Please e o hook entram em conflito | Baixa | Baixo | Release Please cria PRs, não commits diretos; hook roda no dev, não no bot |

### Trade-off principal

Manter a versão exata (sem `^`) em `cli/package.json` é a causa raiz do problema mas também a decisão correta para publicação npm (conforme D-01 nos requisitos). A solução proposta mantém essa decisão e apenas garante que o pinamento seja sempre correto.

---

## 8. Arquivos Resumo

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `scripts/sync-shared-version.js` | Criar | Script de sync/validação de versões |
| `.husky/pre-commit` | Criar | Hook que executa o script antes do commit |
| `.github/workflows/npm-publish.yml` | Modificar | Adicionar etapa de validação no job `validate` |
| `package.json` (raiz) | Modificar | Adicionar script `sync-versions` |
