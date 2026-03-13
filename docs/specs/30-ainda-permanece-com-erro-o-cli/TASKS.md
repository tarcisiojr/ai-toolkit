# Tarefas — Issue #30: Ainda permanece com erro o CLI

## 1. Correção Estrutural do Workflow

- [x] 1.1 Substituir `always()` pela condição correta no job `publish-cli` em `.github/workflows/npm-publish.yml` (linha 132): trocar `always() && needs.validate.result == 'success'` por `(needs.publish-shared.result == 'success' || needs.publish-shared.result == 'skipped') && needs.validate.result == 'success'`

- [x] 1.2 Adicionar etapa de verificação de disponibilidade do `@tarcisiojunior/shared` no npm registry no job `publish-cli` em `.github/workflows/npm-publish.yml`, posicionada após `npm ci` e antes do build, conforme design 4.2

## 2. Documentação de Publicação Manual

- [x] 2.1 Documentar no PR (corpo da descrição) as instruções para acionar manualmente o `workflow_dispatch` com `package=shared` após o merge, a fim de publicar `@tarcisiojunior/shared@0.2.3` e desbloquear usuários finais
