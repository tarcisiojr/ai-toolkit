# Design Técnico — Issue #30: Ainda permanece com erro o CLI

## 1. Contexto e Estado Atual

### Estado do npm

- `aitk-cli@0.2.8` está publicado no npm com dependência exata `@tarcisiojunior/shared@0.2.3`
- `@tarcisiojunior/shared@0.2.3` **não existe** no registry npm — foi pulado em alguma publicação anterior
- O pacote CLI no npm é imutável; a única saída é publicar o shared ausente

### Estado do código

```
packages/
  shared/package.json    → version: "0.2.3"
  cli/package.json       → version: "0.2.8", dep: "@tarcisiojunior/shared": "0.2.3"

.release-please-manifest.json → "packages/shared": "0.2.3", "packages/cli": "0.2.8"
```

O código local de `packages/shared` está na versão `0.2.3` — alinhado com o que `aitk-cli@0.2.8` espera. Publicar esse código resolve o problema imediato.

### Causa raiz no workflow

```yaml
# .github/workflows/npm-publish.yml — job publish-cli (linha 131-136)
if: |
  always() && needs.validate.result == 'success' && (
    github.event.inputs.package == 'all' ||
    github.event.inputs.package == 'cli' ||
    (github.event_name == 'release' && contains(github.event.release.tag_name, 'cli'))
  )
```

O `always()` faz com que o job ignore o resultado de `publish-shared`. Quando `publish-shared` é **skipped** (ex: tag de release contém apenas "cli"), o `publish-cli` ainda executa — publicando o CLI com uma dependência que não existe no npm.

---

## 2. Abordagem Técnica

### Solução em duas partes

#### Parte A — Correção imediata (estado quebrado no npm)

Publicar `@tarcisiojunior/shared@0.2.3` via `workflow_dispatch` no workflow existente, usando `package=shared`.

Isso não requer mudança de código. O workflow já tem a lógica correta para publicar o shared individualmente. Basta acionar manualmente com `package=shared`.

> **Nota para implementação:** Esta ação requer o secret `NPM_TOKEN` e acesso ao ambiente `npm` no GitHub. O agente de implementação deve orientar o acionamento manual ou criar um passo documentado. Não é possível publicar no npm diretamente do código — a publicação ocorre via GitHub Actions.

#### Parte B — Correção estrutural (prevenir reincidência)

Modificar `.github/workflows/npm-publish.yml` em dois pontos:

1. **Remover `always()`** da condição `if` do job `publish-cli`, substituindo por uma condição que respeite o resultado de `publish-shared`.

2. **Adicionar etapa de verificação** no job `publish-cli` que consulta o npm registry para confirmar que a versão de `@tarcisiojunior/shared` referenciada em `packages/cli/package.json` existe antes de prosseguir com o build e publicação.

---

## 3. Componentes/Arquivos Modificados

| Arquivo | Tipo de mudança | Descrição |
|---------|----------------|-----------|
| `.github/workflows/npm-publish.yml` | Modificação | Corrigir condição `if` do job `publish-cli`; adicionar etapa de verificação de disponibilidade do shared no npm |

Nenhum outro arquivo precisa ser modificado.

---

## 4. Design Detalhado das Mudanças

### 4.1 Condição `if` do job `publish-cli`

**Problema:** `always()` permite execução mesmo quando `publish-shared` foi skipped.

**Solução:** A condição deve verificar explicitamente o resultado de `publish-shared`:

```yaml
# Antes (problemático):
if: |
  always() && needs.validate.result == 'success' && (
    github.event.inputs.package == 'all' ||
    github.event.inputs.package == 'cli' ||
    (github.event_name == 'release' && contains(github.event.release.tag_name, 'cli'))
  )

# Depois (correto):
if: |
  (needs.publish-shared.result == 'success' || needs.publish-shared.result == 'skipped') &&
  needs.validate.result == 'success' && (
    github.event.inputs.package == 'all' ||
    github.event.inputs.package == 'cli' ||
    (github.event_name == 'release' && contains(github.event.release.tag_name, 'cli'))
  )
```

**Por que manter `skipped` como condição válida?**

O caso legítimo de `publish-shared` ser skipped é quando `package=cli` foi escolhido intencionalmente — situação em que o operador assume que a versão do shared já está disponível no npm. A etapa de verificação (4.2) cobre esse caso: se a versão não existir no npm, o job falha com mensagem explicativa antes de publicar.

Isso atende ao RNF-02: publicação individual do CLI continua funcionando, mas agora com verificação de disponibilidade do shared.

### 4.2 Etapa de verificação de disponibilidade do shared no npm

Adicionar como primeiro passo substantivo no job `publish-cli`, após o checkout e setup do Node.js, antes do build:

```yaml
- name: Verificar disponibilidade do @tarcisiojunior/shared no npm
  working-directory: packages/cli
  run: |
    SHARED_VERSION=$(node -e "console.log(require('./package.json').dependencies['@tarcisiojunior/shared'])")
    echo "🔍 Verificando @tarcisiojunior/shared@${SHARED_VERSION} no npm..."

    if npm view "@tarcisiojunior/shared@${SHARED_VERSION}" version 2>/dev/null; then
      echo "✅ @tarcisiojunior/shared@${SHARED_VERSION} disponível no npm."
    else
      echo "❌ ERRO: @tarcisiojunior/shared@${SHARED_VERSION} não encontrado no npm registry."
      echo "   O CLI depende desta versão mas ela não está publicada."
      echo "   Para corrigir: execute o workflow com package=shared (ou package=all) primeiro."
      exit 1
    fi
```

**Posicionamento no job:** Após `npm ci` e antes de `npx turbo run build`. Isso evita gastar tempo em build quando a dependência não existe.

---

## 5. Fluxo Corrigido

### Cenário 1: publicação de tudo (`package=all` ou release com ambos)

```
validate → publish-shared (executa, publica shared) → publish-cli
           [result: success]                           [condição: skipped|success → ok]
                                                       [verificação npm: shared existe → ok]
                                                       [publica cli]
```

### Cenário 2: publicação apenas do CLI (`package=cli`)

```
validate → publish-shared (skipped)                  → publish-cli
           [result: skipped]                           [condição: skipped|success → ok]
                                                       [verificação npm: shared existe? → se não, FAIL com msg clara]
                                                       [se sim → publica cli]
```

### Cenário 3: publicação apenas do shared (`package=shared`)

```
validate → publish-shared (executa, publica shared) → publish-cli (skipped por condição de package)
```

### Cenário anterior problemático (eliminado):

```
release tag com "cli" apenas
  → publish-shared: skipped
  → publish-cli: EXECUTAVA (always()) → publicava cli com dep quebrada
  → AGORA: publish-cli executa → verificação npm falha → ERRO CLARO
```

---

## 6. Decisões Técnicas e Alternativas

### D-01: Manter `skipped` como condição válida para `publish-cli`

**Escolhido:** `needs.publish-shared.result == 'success' || needs.publish-shared.result == 'skipped'`

**Alternativa rejeitada:** Exigir `success` obrigatório (`needs.publish-shared.result == 'success'` apenas). Isso quebraria o caso de uso legítimo `package=cli` onde o operador quer publicar apenas o CLI porque o shared já foi publicado anteriormente.

**Justificativa:** A verificação de disponibilidade no npm (etapa 4.2) é a defesa real. A condição do job apenas controla se o job deve rodar; a verificação de disponibilidade garante que a dependência existe no registry.

### D-02: Verificação via `npm view` em vez de confiar nos resultados do GitHub Actions

**Escolhido:** `npm view "@tarcisiojunior/shared@${VERSION}" version`

**Alternativa rejeitada:** Verificar apenas o resultado do job `publish-shared`. O problema com confiar apenas no resultado do job é que ele pode ser `skipped` por razões legítimas, e ainda assim a versão já estar no npm de uma publicação anterior.

**Justificativa:** `npm view` consulta o estado real do registry — a fonte de verdade definitiva. Isso segue a decisão D-03 do documento de requisitos.

### D-03: Publicação do `@tarcisiojunior/shared@0.2.3` via workflow existente

**Escolhido:** Acionar `workflow_dispatch` com `package=shared` para publicar a versão ausente.

**Alternativa rejeitada:** Publicar localmente via `npm publish`. Isso requer credenciais npm locais e bypassa os controles de CI (provenance, environment protection). O workflow já tem toda a lógica necessária.

**Alternativa rejeitada:** Criar nova versão do shared (`0.2.4`). Isso exigiria republicar o CLI com dependência atualizada — duas publicações em vez de uma, e complicaria o histórico de versões.

---

## 7. Riscos e Trade-offs

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `npm view` falha por timeout de rede | Baixa | Médio — bloqueia publicação | Retry automático do step do GitHub Actions; erro é transitório |
| Operador publica CLI com `package=cli` quando shared ainda não existe | Média | Alto — recria o problema | A verificação de disponibilidade (4.2) captura esse caso e falha com mensagem clara |
| Versão já publicada no npm com bugs | N/A | N/A | A versão `0.2.3` do shared é o código atual do repositório; não há divergência conhecida |
| `workflow_dispatch` manual para publicar shared pode ser esquecido | Baixa | Baixo — o CLI já está quebrado de qualquer forma | A correção estrutural (Parte B) previne o problema em publicações futuras |

### Trade-off principal

A solução mantém flexibilidade para publicar CLI e shared independentemente, ao custo de uma verificação extra no npm a cada execução do `publish-cli`. O overhead é mínimo (uma chamada `npm view`) e o benefício (detecção precoce de dep quebrada) justifica.

---

## 8. Instruções para Publicação Manual do `@tarcisiojunior/shared@0.2.3`

Como a correção imediata não pode ser automatizada por código (requer credenciais npm e acesso ao ambiente GitHub), o fluxo esperado é:

1. Após merge do PR com a correção do workflow, acionar manualmente:
   - `Actions → Publish to npm → Run workflow`
   - Parâmetros: `package=shared`, `dry_run=false`

2. Verificar que o job `publish-shared` completa com sucesso

3. Confirmar com: `npm view @tarcisiojunior/shared@0.2.3 version`

4. Verificar que `npx aitk-cli help` funciona em ambiente limpo

> A publicação do shared pode (e deve) ocorrer antes do merge do PR de correção do workflow, pois são ações independentes. Publicar o shared primeiro já desbloqueia usuários finais.
