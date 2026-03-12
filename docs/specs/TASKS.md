# Tarefas — Issue #5: Falha no Job de Release (release-please)

> **Referências:** [REQUIREMENTS.md](./REQUIREMENTS.md) | [DESIGN.md](./DESIGN.md)
>
> **Estratégia adotada:** Solução alternativa via PAT (Opção B do design), pois é a única que pode ser implementada via Pull Request sem depender de acesso manual às configurações do repositório. A solução primária (Settings do repositório) é documentada como tarefa manual para o administrador.

---

## 1. Configuração Manual do Repositório (Solução Primária)

> Estas tarefas requerem acesso de administrador ao repositório GitHub e não produzem alterações em arquivos do repositório.

- [ ] 1.1 Acessar `Settings → Actions → General → Workflow permissions` no repositório GitHub e habilitar a opção "Allow GitHub Actions to create and approve pull requests"
- [ ] 1.2 Verificar se a opção foi salva com sucesso acessando novamente `Settings → Actions → General`

---

## 2. Configuração do PAT (Solução Alternativa — se Settings não puder ser alterado)

> Estas tarefas requerem acesso de administrador para criar o PAT e cadastrar o secret. Devem ser executadas antes da tarefa 3.1.

- [ ] 2.1 Criar um Fine-grained Personal Access Token (PAT) na conta do proprietário do repositório com permissões `contents: write` e `pull-requests: write` apenas para este repositório
- [ ] 2.2 Adicionar o PAT como secret `RELEASE_PLEASE_TOKEN` no repositório em `Settings → Secrets and variables → Actions → New repository secret`

---

## 3. Alteração do Workflow (Solução Alternativa — se Settings não puder ser alterado)

> Depende da conclusão das tarefas do grupo 2.

- [x] 3.1 Editar `.github/workflows/release-please.yml` substituindo `token: ${{ secrets.GITHUB_TOKEN }}` por `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}` (linha 25) e adicionar comentário explicativo sobre o motivo do uso do PAT

---

## 4. Verificação

- [x] 4.1 Confirmar que o arquivo `.github/workflows/release-please.yml` não contém nenhum valor literal de token (verificar com `grep -i token .github/workflows/release-please.yml`)
- [x] 4.2 Confirmar que os workflows `ci.yml`, `publish.yml` e `npm-publish.yml` não foram modificados
- [ ] 4.3 Após merge na `main`, verificar na aba "Actions" do repositório que o job `release-please` executa sem o erro `GitHub Actions is not permitted to create or approve pull requests`
- [ ] 4.4 Confirmar que um PR de release é criado ou atualizado automaticamente pelo bot `github-actions[bot]` com título no padrão `chore(main): release X.Y.Z`
