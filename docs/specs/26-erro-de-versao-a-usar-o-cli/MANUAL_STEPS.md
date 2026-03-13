# Ações Manuais — Issue #26: Erro de versão ao usar o CLI

## Publicação do @tarcisiojunior/shared@0.2.3 (Correção Imediata)

- [ ] Acionar manualmente o workflow `npm-publish.yml` no GitHub Actions com os parâmetros:
  - `package`: `shared`
  - `dry_run`: `false`
  - URL: https://github.com/tarcisiojr/ai-toolkit/actions/workflows/npm-publish.yml

- [ ] Verificar que a publicação foi bem-sucedida:
  ```bash
  npm view @tarcisiojunior/shared@0.2.3 version
  # Deve retornar: 0.2.3
  ```

- [ ] Validar que o CLI funciona em ambiente limpo:
  ```bash
  npx --yes aitk-cli help
  # Deve executar sem erros de dependência ausente
  ```

## CI/CD — Validação do Workflow Corrigido

- [ ] Após o merge do PR, executar o workflow `npm-publish.yml` com `dry_run=true` e `package=cli` para validar que o step "Verificar disponibilidade de @tarcisiojunior/shared" exibe a versão esperada e conclui com sucesso (CA-05)
