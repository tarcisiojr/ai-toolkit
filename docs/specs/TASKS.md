# Tarefas — Issue #9: Erro ao instalar dependências (`npm ci`)

> **Referências:** [REQUIREMENTS.md](./REQUIREMENTS.md) | [DESIGN.md](./DESIGN.md)
>
> **Estratégia adotada:** Atualizar as referências a `@tarcisiojunior/shared` nos pacotes consumidores (`cli` e `web`) para a versão `0.2.2` e regenerar o `package-lock.json` via `npm install`, restaurando a sincronia exigida pelo `npm ci`.

---

## 1. Atualização dos Manifestos dos Pacotes Consumidores

> Ajustar as referências à dependência interna `@tarcisiojunior/shared` nos pacotes que a consomem. Deve ser feito antes da regeneração do lock file.

- [x] 1.1 Editar `packages/cli/package.json` alterando `"@tarcisiojunior/shared": "0.2.1"` para `"@tarcisiojunior/shared": "0.2.2"` (RF-02 / AC-02)
- [x] 1.2 Editar `packages/web/package.json` alterando `"@tarcisiojunior/shared": "0.2.1"` para `"@tarcisiojunior/shared": "0.2.2"` (RF-02 / AC-03)

---

## 2. Regeneração do Lock File

> Depende da conclusão de todas as tarefas do grupo 1.

- [x] 2.1 Executar `npm install` na raiz do monorepo para regenerar o `package-lock.json` em sincronia com os `package.json` atualizados (DT-02 / RF-01 / AC-04)

---

## 3. Verificação Local

> Validar que a sincronia foi restaurada e que o `npm ci` funciona antes de abrir o PR.

- [x] 3.1 Verificar que `package-lock.json` registra `packages/shared` com `"version": "0.2.2"` executando `grep -A3 '"packages/shared"' package-lock.json` (AC-04)
- [x] 3.2 Executar `rm -rf node_modules && npm ci` localmente para confirmar que a instalação limpa conclui sem erros (AC-05)

---

## 4. Commit e Push

> Depende da conclusão de todas as tarefas dos grupos 1, 2 e 3.

- [x] 4.1 Commitar os três arquivos modificados (`packages/cli/package.json`, `packages/web/package.json`, `package-lock.json`) na branch `fix/issue-9` com mensagem descritiva (ex.: `fix(deps): sync @tarcisiojunior/shared to 0.2.2 and regenerate lock file`)
- [ ] 4.2 Fazer push da branch `fix/issue-9` para o repositório remoto e abrir Pull Request apontando para `main`

---

## 5. Verificação no CI

> Depende do push e abertura do PR (tarefa 4.2).

- [ ] 5.1 Confirmar que o job `commitlint` passa sem erros de `npm ci` na aba "Actions" do PR (AC-05)
- [ ] 5.2 Confirmar que o job `quality` (lint + type-check + tests) passa sem erros (AC-07)
- [ ] 5.3 Confirmar que o job `build` (`npx turbo run build`) conclui com sucesso (AC-06)
- [ ] 5.4 Confirmar que o job `validate` (publish) passa sem erros de `npm ci` (RF-03)
