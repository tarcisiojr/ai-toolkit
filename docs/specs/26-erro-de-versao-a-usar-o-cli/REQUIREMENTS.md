# Requisitos — Issue #26: Erro de versão ao usar o CLI

## Resumo do Problema

Ao executar `npx aitk-cli help`, o npm falha com o erro:

```
npm error code ETARGET
npm error notarget No matching version found for @tarcisiojunior/shared@0.2.3.
```

**Causa raiz**: `aitk-cli@0.2.8` foi publicado no npm com dependência em `@tarcisiojunior/shared@0.2.3`, porém essa versão do pacote `shared` não estava disponível no registry npm no momento da instalação. O pacote `shared` precisa ser publicado **antes** ou **junto** com o `cli` que o referencia.

### Contexto Técnico

O repositório é um monorepo gerenciado com Turborepo contendo três pacotes:

| Pacote | Nome npm | Versão atual |
|--------|----------|--------------|
| `packages/shared` | `@tarcisiojunior/shared` | 0.2.3 |
| `packages/cli` | `aitk-cli` | 0.2.8 |
| `packages/web` | `@tarcisiojunior/web` (privado) | 0.3.5 |

O `packages/cli/package.json` declara:
```json
"dependencies": {
  "@tarcisiojunior/shared": "0.2.3"
}
```

O workflow `npm-publish.yml` publica os pacotes separadamente, com `publish-cli` dependendo de `publish-shared` via `needs`. Porém, a condição `if` para `publish-cli` inclui `always()`, o que permite que o CLI seja publicado mesmo se a publicação do `shared` tiver sido pulada (ex.: versão já existente no npm). Se `shared` nunca foi publicado com a versão `0.2.3`, qualquer usuário que tente instalar `aitk-cli@0.2.8` vai falhar.

---

## Requisitos Funcionais

### RF-01 — Garantir publicação ordenada: shared antes do cli

O pacote `@tarcisiojunior/shared` **deve** ser publicado no npm com a versão correta **antes** que `aitk-cli` que o referencia seja publicado.

**Critério**: Se `@tarcisiojunior/shared@X.Y.Z` não existir no registry npm, a publicação de qualquer versão de `aitk-cli` que dependa de `X.Y.Z` **deve** falhar com erro explícito, impedindo a publicação do CLI.

---

### RF-02 — Verificar disponibilidade da dependência antes de publicar o CLI

O workflow de publicação do `aitk-cli` **deve** verificar que `@tarcisiojunior/shared` na versão exigida pelo `package.json` do CLI está disponível no registry npm antes de publicar.

**Critério**: Um step de validação deve executar `npm view @tarcisiojunior/shared@<versão> version` e falhar o job se a versão não existir.

---

### RF-03 — Publicar a versão ausente do @tarcisiojunior/shared

A versão `@tarcisiojunior/shared@0.2.3` **deve** ser publicada no npm para restaurar o funcionamento do `aitk-cli@0.2.8` já publicado.

**Critério**: Após a correção, `npx aitk-cli help` deve executar sem erros de dependência ausente.

---

### RF-04 — Correção da lógica de dependência no workflow de publicação

O job `publish-cli` no workflow `npm-publish.yml` **não deve** executar se `publish-shared` falhou ou foi cancelado (apenas "skipped" por não ter sido selecionado é aceitável).

**Critério**: A condição `always()` no `publish-cli` deve ser substituída por uma verificação que bloqueie a publicação do CLI quando `publish-shared` falhou.

---

## Requisitos Não-Funcionais

### RNF-01 — Idempotência

A correção da publicação do `shared` não deve causar republicação de versões já existentes. O check de versão existente já presente no workflow (`npm view ... version`) deve ser mantido.

### RNF-02 — Sem breaking changes

A correção não deve alterar as APIs públicas do `shared` nem do `cli`, pois isso afetaria usuários já instalados.

### RNF-03 — Observabilidade

O workflow de publicação deve gerar logs claros indicando qual versão de `shared` era esperada e se ela estava disponível antes de tentar publicar o CLI.

---

## Escopo

### Incluído

- Publicação da versão `@tarcisiojunior/shared@0.2.3` no npm (correção imediata)
- Ajuste no workflow `npm-publish.yml` para garantir ordenação e dependência correta entre publicações
- Adição de step de validação de disponibilidade da dependência antes da publicação do CLI

### Excluído

- Mudanças nas versões dos pacotes (sem bump de versão neste fix)
- Alterações nas APIs ou funcionalidades do `shared` ou `cli`
- Modificações nos workflows `publish.yml`, `release-please.yml` ou `ci.yml`
- Mudanças no pacote `web`

---

## Critérios de Aceitação

| ID | Critério | Como verificar |
|----|----------|----------------|
| CA-01 | `npx aitk-cli help` executa sem erros em um ambiente limpo | Executar em máquina sem cache do aitk-cli instalado |
| CA-02 | `npm view @tarcisiojunior/shared@0.2.3 version` retorna `0.2.3` | Rodar o comando diretamente |
| CA-03 | O workflow `npm-publish.yml` falha se tentar publicar o CLI sem o `shared` disponível | Simular cenário com dry-run e versão de shared inexistente |
| CA-04 | O job `publish-cli` não executa quando `publish-shared` falha | Verificar lógica da condição `if` no workflow |
| CA-05 | O workflow de publicação emite log indicando a versão de `shared` esperada e sua disponibilidade | Inspecionar logs de CI após execução |

---

## Decisões de Análise

- **Causa imediata vs. sistêmica**: O erro reportado é causado por `@tarcisiojunior/shared@0.2.3` não estar no npm. Isso pode ter ocorrido porque o `shared` nunca foi publicado nessa versão, ou porque foi publicado após o `cli`. A solução deve tratar ambos os casos.
- **Prioridade**: Publicar o `shared` ausente é a ação mais urgente para restaurar o funcionamento para usuários finais. A correção do workflow previne reincidência.
- **Sem alteração de versão**: Como `aitk-cli@0.2.8` já está publicado e referencia `@tarcisiojunior/shared@0.2.3`, a solução é publicar exatamente essa versão do `shared` — não uma nova versão.
