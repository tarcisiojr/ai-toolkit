# Requisitos — Issue #32: Layout quebrando no mobile

## Resumo do Problema

Ao acessar a tela de edição no mobile (resolução ~828×1792px, equivalente a iPhone XS/11), o layout quebra de forma visível. Com base na análise do código, o problema principal está no componente `FileEditor` (`packages/web/src/components/artifact/FileEditor.tsx`), cujo toolbar usa `flex items-center justify-between` em uma única linha sem adaptação para telas estreitas.

**Componentes afetados identificados:**

| Componente | Arquivo | Problema |
|---|---|---|
| `FileEditor` | `src/components/artifact/FileEditor.tsx` | Toolbar (`flex justify-between`) transborda em mobile — path do arquivo + botões de modo + "Salvar como nova versão" não cabem em uma linha |
| `FileBrowser` | `src/components/artifact/FileBrowser.tsx` | Grid `grid-cols-1 md:grid-cols-2` é responsivo, mas o painel de visualização pode ter scroll estranho em mobile |
| `MetadataEditor` | `src/components/artifact/MetadataEditor.tsx` | Campos `InlineEdit` com `flex items-center justify-between` (label + botão "Editar") podem comprimir em telas estreitas |
| `OwnerActions` | `src/components/artifact/OwnerActions.tsx` | `flex items-center gap-3` pode ser apertado em mobile quando combinado com o header do artefato |

---

## Requisitos Funcionais

### RF-01 — Toolbar do FileEditor responsivo
O toolbar do `FileEditor` deve reorganizar seus elementos para telas estreitas (< 640px):
- O nome do arquivo e os botões de modo (Editor / Split / Preview) devem ocupar uma linha.
- Os botões "Cancelar" e "Salvar como nova versão" devem ocupar uma segunda linha abaixo, alinhados à direita.
- Em mobile, o modo "Split" não deve ser exibido (ou deve ser desabilitado), pois não faz sentido em telas estreitas.

### RF-02 — Editor de código usável em mobile
O editor CodeMirror embutido no `FileEditor` deve:
- Ter altura adequada em telas mobile (não fixar `max-h-[600px]` sem um mínimo mínimo razoável).
- Permitir scroll horizontal interno para linhas longas sem quebrar o layout da página.

### RF-03 — FileBrowser com painel de visualização adaptado
No `FileBrowser`, em mobile:
- O layout deve ser em coluna única (`grid-cols-1`), com a árvore de arquivos acima e o painel de visualização abaixo (já implementado via `md:grid-cols-2`, confirmar que funciona corretamente).
- A altura máxima dos painéis (`max-h-[500px]`) pode ser reduzida em mobile para evitar que ocupem a tela inteira.

### RF-04 — MetadataEditor com campos inline responsivos
Em cada campo do `MetadataEditor` (`InlineEdit`, `TagEditor`, `CheckboxEditor`):
- O layout `flex items-center justify-between` (label + botão "Editar") deve funcionar corretamente em telas estreitas sem sobrescrever texto.

### RF-05 — OwnerActions responsivo no header do artefato
Os botões de `OwnerActions` dentro do header do artefato devem se adaptar corretamente em mobile, sem transbordar o card `flex items-start gap-4`.

---

## Requisitos Não-Funcionais

### RNF-01 — Compatibilidade de breakpoints
Usar os breakpoints padrão do Tailwind CSS já configurado no projeto:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

Não introduzir CSS customizado fora de classes Tailwind (a menos que absolutamente necessário).

### RNF-02 — Sem regressão desktop
As correções mobile não devem alterar o comportamento ou aparência nas resoluções desktop (≥ 1024px).

### RNF-03 — Performance
Não adicionar dependências novas. As correções devem ser feitas apenas com classes Tailwind CSS existentes.

### RNF-04 — Acessibilidade
Botões que trocam de posição em mobile devem manter `tab-order` lógico e labels acessíveis.

---

## Escopo

### Incluído
- Correção de layout do `FileEditor` (toolbar + editor).
- Verificação e ajuste do `FileBrowser` em mobile.
- Correção de campos inline do `MetadataEditor` em telas estreitas.
- Ajuste do `OwnerActions` dentro do header do artefato.

### Excluído
- Refatoração de lógica de negócio (save, upload, API calls).
- Alterações nos componentes de servidor (`page.tsx`).
- Suporte a gestos touch específicos (swipe, pinch-to-zoom no editor).
- Alterações no `PublishPage` — a análise indicou que os grids `sm:grid-cols-5` e `sm:grid-cols-3` já são responsivos.
- Criação de uma experiência de edição mobile nativa diferente da desktop.

---

## Critérios de Aceitação

### CA-01 — FileEditor toolbar em mobile
- **Dado** que o usuário acessa o `FileEditor` em um viewport de 375px ou 428px de largura
- **Quando** o arquivo selecionado é de qualquer tipo (markdown ou não)
- **Então** o toolbar deve exibir todos os botões sem overflow horizontal, com wrapping adequado

### CA-02 — Botão "Salvar como nova versão" visível em mobile
- **Dado** que o usuário está no `FileEditor` em mobile
- **Quando** ele visualiza o toolbar
- **Então** o botão "Salvar como nova versão" deve estar completamente visível e clicável, sem ser cortado pelo edge da tela

### CA-03 — Modo Split desabilitado/oculto em mobile
- **Dado** que o arquivo editado é Markdown
- **Quando** o viewport é menor que 640px
- **Então** o botão "Split" não deve ser exibido (ou deve estar desabilitado com tooltip explicativo)

### CA-04 — FileBrowser layout single-column em mobile
- **Dado** que o usuário acessa a página de artefato em um viewport < 768px
- **Quando** há arquivos listados
- **Então** a árvore de arquivos deve ocupar a largura total, e o painel de visualização deve aparecer abaixo (layout em coluna única)

### CA-05 — MetadataEditor sem overflow em mobile
- **Dado** que o usuário é dono do artefato e acessa a página em mobile
- **Quando** visualiza os campos editáveis na sidebar
- **Então** cada campo com label + botão "Editar" deve ser exibido sem overflow ou sobreposição de texto

### CA-06 — Sem regressão em desktop
- **Dado** que o usuário acessa qualquer tela de edição em viewport ≥ 1024px
- **Quando** interage com os componentes
- **Então** o layout deve ser idêntico ao estado anterior às correções (toolbar em linha única, split-view disponível para Markdown)

### CA-07 — Teste visual em dispositivos reais
- As correções devem ser validadas visualmente em, pelo menos:
  - iPhone SE (375px)
  - iPhone 12/13 (390px)
  - Android médio (412px)
  - Tablet pequeno (768px)

---

## Notas de Implementação

> **Não implementar nada neste documento.** As notas abaixo são apenas para orientar a fase de implementação.

- O problema mais crítico é o toolbar do `FileEditor` (linha 146-183 de `FileEditor.tsx`). A estrutura atual:
  ```html
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3"> <!-- path + mode buttons -->
    <div class="flex items-center gap-2"> <!-- cancel + save buttons -->
  ```
  Deve ser adaptada com `flex-wrap` ou mudança para `flex-col` em `sm:flex-row`.

- O texto "Salvar como nova versão" é longo (21 chars). Considerar abreviar para "Salvar versão" em mobile via `hidden sm:inline` / `sm:hidden`.

- A classe `max-h-[600px]` no editor e preview em `FileEditor.tsx` linha 191 e 197 pode ser ajustada para `max-h-[400px] sm:max-h-[600px]` em mobile.
