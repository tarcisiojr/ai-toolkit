# Tarefas — Issue #28: Erro ao usar o CLI

## 1. Script de Sincronização de Versões

- [x] 1.1 Criar `scripts/sync-shared-version.js` com lógica de leitura das versões de `packages/shared/package.json` e `packages/cli/package.json`
- [x] 1.2 Implementar no script a detecção e preservação do prefixo semver existente (`^`, `~`, ou exato)
- [x] 1.3 Implementar modo padrão (sync): atualiza `packages/cli/package.json` se as versões divergirem e loga o resultado
- [x] 1.4 Implementar modo `--check`: apenas valida sem modificar, exit 1 com mensagem de erro clara se divergir

## 2. Hook Pre-commit

- [x] 2.1 Criar `.husky/pre-commit` que executa `node scripts/sync-shared-version.js`
- [x] 2.2 Adicionar ao hook o `git add packages/cli/package.json` condicional, para incluir a atualização no commit caso o script tenha modificado o arquivo

## 3. Validação no Workflow de CI

- [x] 3.1 Modificar `.github/workflows/npm-publish.yml` adicionando etapa `Verificar consistência de versões internas` no job `validate`, após a instalação de dependências e antes do build, executando `node scripts/sync-shared-version.js --check`

## 4. Script npm na Raiz

- [x] 4.1 Modificar `package.json` (raiz) adicionando o script `"sync-versions": "node scripts/sync-shared-version.js"` na seção `scripts`
