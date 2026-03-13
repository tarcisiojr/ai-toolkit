# Design Técnico — Issue #32: Layout quebrando no mobile

## 1. Contexto e Estado Atual do Código

### Problema raiz

A screenshot do issue mostra a tela de edição em um iPhone XS/11 (828×1792px) com o toolbar do `FileEditor` transbordando horizontalmente. A causa é o layout `flex items-center justify-between` com dois grupos de elementos side-by-side que não têm espaço suficiente em telas estreitas.

### Componentes afetados e seus problemas

| Componente | Arquivo | Linha(s) problemáticas | Problema |
|---|---|---|---|
| `FileEditor` | `packages/web/src/components/artifact/FileEditor.tsx` | 146–183 | Toolbar `flex justify-between` transborda em mobile; `max-h-[600px]` sem mínimo |
| `FileBrowser` | `packages/web/src/components/artifact/FileBrowser.tsx` | 242–337 | `grid-cols-1 md:grid-cols-2` já está correto, mas `max-h-[500px]` fixo pode ser excessivo |
| `MetadataEditor` | `packages/web/src/components/artifact/MetadataEditor.tsx` | 78, 193, 317 | `flex items-center justify-between` (label + botão "Editar") pode comprimir em telas estreitas |
| `OwnerActions` | `packages/web/src/components/artifact/OwnerActions.tsx` | 35 | `flex items-center gap-3` pode ficar apertado no header — risco baixo dado que há apenas 1 botão + 1 span |

### Análise detalhada do FileEditor (problema crítico)

Estrutura atual do toolbar (linhas 146–183):
```html
<div class="flex items-center justify-between">         <!-- linha única rígida -->
  <div class="flex items-center gap-3">
    <span>{filePath}</span>                             <!-- texto longo variável -->
    <div class="flex rounded border">                   <!-- botões Editor/Split/Preview -->
      <button>Editor</button>
      <button>Split</button>
      <button>Preview</button>
    </div>
  </div>
  <div class="flex items-center gap-2">
    <button>Cancelar</button>
    <button>Salvar como nova versão</button>            <!-- 21 chars -->
  </div>
</div>
```

Em 375px de largura, o texto do `filePath` + botões de modo + "Cancelar" + "Salvar como nova versão" somam mais do que a tela comporta, causando overflow horizontal.

O editor e preview têm `max-h-[600px]` sem mínimo, o que em mobile ocupa toda a viewport disponível sem controle.

---

## 2. Abordagem Técnica Escolhida

### Estratégia: `flex-wrap` com reordenação via `flex-col sm:flex-row`

A abordagem escolhida é converter o toolbar de um `flex` em linha única para um layout que faz wrap em mobile e mantém a linha única no desktop. Isso é feito com:

1. **Toolbar container**: `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`
2. **Grupo de ações (cancelar/salvar)**: em mobile, alinhado à direita com `self-end sm:self-auto`
3. **Modo Split**: oculto em mobile com `hidden sm:flex` dentro do grupo de botões de modo

### Justificativa

- **Sem JavaScript adicional**: usar só classes Tailwind evita adição de lógica condicional de viewport.
- **Sem `useMediaQuery`**: window resize listeners ou hooks de media query adicionariam complexidade e custo de hidratação. O Tailwind CSS resolve isso em build time via classes responsivas.
- **Preservação do tab-order**: o DOM permanece inalterado — apenas o layout visual muda via flexbox. Isso preserva a ordem de tabulação logicamente (RF-04/RNF-04).
- **Zero regressão desktop**: as classes `sm:` só ativam em ≥ 640px; desktop fica idêntico.

### Alternativas descartadas

| Alternativa | Motivo de descarte |
|---|---|
| `useMediaQuery` hook + renderização condicional | Adiciona lógica JS/hidratação desnecessária; Tailwind já resolve no CSS |
| CSS módulo customizado com `@media` | Viola RNF-01 (não introduzir CSS fora de classes Tailwind) |
| Abreviar texto "Salvar como nova versão" | Mudança de cópia de UI — poderia ser feita como otimização opcional, mas não é a solução principal |
| Remover completamente o modo Split em mobile via JS | `hidden sm:flex` no próprio botão é mais simples e idiomático |

---

## 3. Componentes e Arquivos a Modificar

### 3.1 `FileEditor.tsx` — Prioridade: CRÍTICA

**Localização**: `packages/web/src/components/artifact/FileEditor.tsx`

**Mudanças no toolbar (linhas 146–183)**:

```
ANTES: <div className="mb-3 flex items-center justify-between">
DEPOIS: <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
```

**Grupo esquerdo (filePath + mode buttons)** — permanece igual exceto pelo botão Split:
- Botão "Split" no grupo `['editor', 'split', 'preview']`: filtrar `split` em telas < sm **OU** aplicar `hidden sm:inline` apenas no botão Split.
- Abordagem escolhida: condicional no map, renderizando o botão Split somente se não for mobile. Como não usaremos JS para detectar viewport, a solução CSS é: aplicar `hidden sm:inline-flex` (ou `sm:flex`) apenas ao botão Split dentro do grupo. O container do grupo de botões usa `flex`, então o botão com `hidden sm:flex` desaparece em mobile.

**Grupo direito (cancelar/salvar)** — adicionar `self-end sm:self-auto`:
```
ANTES: <div className="flex items-center gap-2">
DEPOIS: <div className="flex items-center gap-2 self-end sm:self-auto">
```

**Editor e preview (linhas 191, 197)** — ajustar altura máxima:
```
ANTES: className="max-h-[600px] overflow-auto ..."
DEPOIS: className="max-h-[400px] sm:max-h-[600px] overflow-auto ..."
```

### 3.2 `FileBrowser.tsx` — Prioridade: BAIXA (verificação)

**Localização**: `packages/web/src/components/artifact/FileBrowser.tsx`

**Análise**: O grid `grid-cols-1 md:grid-cols-2` (linha 242) já está correto conforme RF-03/CA-04. Em mobile renderiza em coluna única automaticamente.

**Ajuste menor**: a altura `max-h-[500px]` (linhas 244, 257) em mobile pode ser reduzida:
```
ANTES: className="max-h-[500px] overflow-y-auto ..."
DEPOIS: className="max-h-[300px] sm:max-h-[500px] overflow-y-auto ..."
```
Isso evita que os dois painéis (árvore + visualização) juntos ocupem 1000px de scroll em mobile.

### 3.3 `MetadataEditor.tsx` — Prioridade: BAIXA

**Localização**: `packages/web/src/components/artifact/MetadataEditor.tsx`

**Análise**: O `InlineEdit`, `TagEditor` e `CheckboxEditor` usam `flex items-center justify-between` com apenas dois elementos pequenos (label texto-xs e botão texto-[10px]). Em telas estreitas (375px), isso raramente transborda porque ambos são curtos. O `min-w-0` no label pode prevenir compressão extrema.

**Mudança defensiva** no header de cada componente (linhas 78, 193, 317):
```
ANTES: <div className="flex items-center justify-between">
DEPOIS: <div className="flex items-center justify-between gap-2 min-w-0">
  <span className="... truncate">  <!-- adicionar truncate ao label -->
```

### 3.4 `OwnerActions.tsx` — Prioridade: MUITO BAIXA

**Localização**: `packages/web/src/components/artifact/OwnerActions.tsx`

**Análise**: O componente tem apenas um botão "+ Nova Versão" e um `<span>` "Última: vX.Y.Z". O `flex items-center gap-3` na linha 35 é simples e dificilmente causa overflow.

**Mudança**: Nenhuma mudança necessária no próprio `OwnerActions.tsx`. O problema relatado nos requisitos provavelmente ocorre no componente pai que combina o header do artefato com `OwnerActions`. Se houver overflow, o pai deve aplicar `flex-wrap` no seu container, mas isso está fora do escopo (o `page.tsx` está excluído per REQUIREMENTS.md).

---

## 4. Modelos de Dados

Não há alterações em modelos de dados, interfaces TypeScript ou APIs. As mudanças são exclusivamente de apresentação (classes CSS Tailwind).

---

## 5. Decisões Técnicas

### DT-01: Não usar `useMediaQuery` hook

**Decisão**: Usar classes Tailwind responsivas (`sm:`, `md:`) em vez de JavaScript para detecção de viewport.
**Razão**: Mais simples, sem custo de hidratação, sem flash de conteúdo incorreto (FOUC), e compatível com SSR/RSC do Next.js.

### DT-02: Ocultar botão Split via CSS (`hidden sm:flex`) em vez de lógica condicional

**Decisão**: Aplicar `hidden sm:flex` no wrapper do botão Split dentro do grupo de modo.
**Razão**: Mantém o DOM consistente entre server e client render, sem warnings de hidratação. O botão continua no DOM mas invisível em mobile — isso é aceitável para um botão de UI simples.

### DT-03: `flex-col` no toolbar do FileEditor em vez de `flex-wrap`

**Decisão**: Usar `flex-col gap-2 sm:flex-row` em vez de `flex-wrap` no container do toolbar.
**Razão**: `flex-wrap` quebraria o layout de forma imprevisível dependendo do conteúdo do `filePath`. Com `flex-col sm:flex-row`, o comportamento em mobile é explícito e controlado: sempre duas linhas em mobile, sempre uma linha em desktop.

### DT-04: Reduzir max-h no editor em mobile

**Decisão**: `max-h-[400px] sm:max-h-[600px]` em vez de `max-h-[600px]` fixo.
**Razão**: Em mobile com viewport de 812px de altura (iPhone XS), um editor de 600px mais o toolbar e o header do artefato ultrapassaria a viewport, forçando scroll de página desnecessário.

---

## 6. Riscos e Trade-offs

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Toolbar em duas linhas pode parecer "quebrado" visualmente | Baixa | Médio | Design de duas linhas é padrão em apps mobile — semanticamente correto |
| Ocultar botão Split pode confundir usuários que alternam entre desktop e mobile | Baixa | Baixo | O modo ativo retorna a "editor" quando Split fica indisponível (comportamento a implementar: fallback de `viewMode`) |
| `truncate` no label do MetadataEditor pode cortar textos importantes | Muito Baixa | Baixo | Labels são curtos e fixos no código ("Keywords", "Licença", etc.) |
| Redução de `max-h-[500px]` para `max-h-[300px]` no FileBrowser pode ser insuficiente para árvores de arquivos grandes | Baixa | Baixo | A árvore tem scroll interno; 300px já acomoda ~15 itens visíveis |

### Trade-off principal

A abordagem CSS-only via Tailwind é mais simples e robusta que uma abordagem JS, mas significa que o botão Split permanece no DOM (apenas oculto). Se no futuro a lógica de `viewMode` precisar ser resetada ao entrar em mobile, seria necessário adicionar lógica JS (e.g., resetar `viewMode` para `editor` quando Split estava ativo e usuário rotaciona para mobile). Essa lógica adicional está fora do escopo desta issue — a solução atual previne o problema de UX mais crítico (overflow visual) sem introduzir complexidade desnecessária.

---

## 7. Resumo das Mudanças por Arquivo

| Arquivo | Tipo de Mudança | Complexidade |
|---|---|---|
| `FileEditor.tsx` | Refatoração de classes Tailwind no toolbar + ajuste de max-h | Baixa |
| `FileBrowser.tsx` | Ajuste de max-h com breakpoint sm | Muito Baixa |
| `MetadataEditor.tsx` | Adicionar `min-w-0` e `truncate` nos headers inline | Muito Baixa |
| `OwnerActions.tsx` | Nenhuma mudança necessária | — |
