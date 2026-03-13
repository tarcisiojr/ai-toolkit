# Tarefas — Issue #26: Erro de versão ao usar o CLI

## 1. Correção Imediata — Publicar @tarcisiojunior/shared@0.2.3

- [ ] 1.1 Acionar manualmente o workflow `npm-publish.yml` via GitHub Actions com `package=shared` e `dry_run=false` para publicar `@tarcisiojunior/shared@0.2.3` no registry npm
- [ ] 1.2 Verificar que a publicação foi bem-sucedida executando `npm view @tarcisiojunior/shared@0.2.3 version` e confirmando retorno `0.2.3`
- [ ] 1.3 Validar que `npx aitk-cli help` executa sem erros em ambiente limpo (sem cache do aitk-cli)

## 2. Correção Sistêmica — Workflow npm-publish.yml

- [x] 2.1 Remover `always()` da condição `if` do job `publish-cli` em `.github/workflows/npm-publish.yml` (linha 129), substituindo pela condição que aceita `publish-shared.result == 'success'` ou `publish-shared.result == 'skipped'` e bloqueia em caso de `failure` ou `cancelled`
- [x] 2.2 Inserir step `Verificar disponibilidade de @tarcisiojunior/shared` no job `publish-cli` em `.github/workflows/npm-publish.yml`, posicionado antes do step `Verificar versão` (linha 155), que lê a versão requerida do `packages/cli/package.json` e valida sua existência no registry via `npm view`, falhando com mensagem clara se ausente

## 3. Verificação e Validação

- [x] 3.1 Revisar o workflow modificado confirmando que todos os cenários da tabela de compatibilidade (DESIGN.md §6) se comportam corretamente com a nova condição do `publish-cli`
- [ ] 3.2 Executar o workflow `npm-publish.yml` com `dry_run=true` e `package=cli` e inspecionar os logs do step de validação para confirmar que a versão do `shared` é exibida e o resultado é observável (CA-05)
