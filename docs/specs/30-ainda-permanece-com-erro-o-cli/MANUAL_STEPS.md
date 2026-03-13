# Passos Manuais — Issue #30

## Publicação de @tarcisiojunior/shared@0.2.3 no npm

Após o merge do PR com a correção do workflow, é necessário publicar manualmente
a versão `0.2.3` do pacote `@tarcisiojunior/shared` que está ausente no npm registry.
Isso desbloqueia os usuários finais que tentam executar `npx aitk-cli help` e recebem
o erro `ETARGET`.

### ## GitHub Actions

- [ ] Acessar o repositório no GitHub → aba **Actions**
- [ ] Selecionar o workflow **"Publish to npm"**
- [ ] Clicar em **"Run workflow"**
- [ ] Preencher os parâmetros:
  - **Pacote a publicar:** `shared`
  - **Apenas simular (não publica de verdade):** `false`
- [ ] Clicar em **"Run workflow"** para confirmar
- [ ] Aguardar o job `publish-shared` completar com sucesso
- [ ] Verificar a publicação executando:
  ```bash
  npm view @tarcisiojunior/shared@0.2.3 version
  # Deve retornar: 0.2.3
  ```
- [ ] Verificar que o CLI funciona:
  ```bash
  npx aitk-cli help
  # Deve executar sem o erro ETARGET
  ```

> **Pré-requisito:** O secret `NPM_TOKEN` deve estar configurado no repositório e o
> ambiente `npm` deve ter as permissões necessárias. Sem isso, o job falhará na etapa
> de publicação.
