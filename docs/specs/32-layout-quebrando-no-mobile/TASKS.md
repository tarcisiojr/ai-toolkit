# Tarefas — Issue #32: Layout quebrando no mobile

## 1. FileEditor — Toolbar Responsivo (Prioridade: CRÍTICA)

- [x]1.1 Converter container do toolbar de `flex items-center justify-between` para `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between` em `packages/web/src/components/artifact/FileEditor.tsx` (linha ~146)

- [x]1.2 Ocultar o botão "Split" em mobile aplicando `hidden sm:flex` (ou `hidden sm:inline-flex`) no wrapper/elemento do botão Split dentro do grupo de modos em `packages/web/src/components/artifact/FileEditor.tsx` (linha ~155–165)

- [x]1.3 Adicionar `self-end sm:self-auto` no grupo de botões de ação (Cancelar + Salvar) em `packages/web/src/components/artifact/FileEditor.tsx` para alinhar à direita em mobile (linha ~175–183)

- [x]1.4 Ajustar altura máxima do editor CodeMirror de `max-h-[600px]` para `max-h-[400px] sm:max-h-[600px]` em `packages/web/src/components/artifact/FileEditor.tsx` (linha ~191)

- [x]1.5 Ajustar altura máxima do painel de preview de `max-h-[600px]` para `max-h-[400px] sm:max-h-[600px]` em `packages/web/src/components/artifact/FileEditor.tsx` (linha ~197)

---

## 2. FileBrowser — Altura dos Painéis em Mobile (Prioridade: BAIXA)

- [x]2.1 Reduzir altura máxima do painel da árvore de arquivos de `max-h-[500px]` para `max-h-[300px] sm:max-h-[500px]` em `packages/web/src/components/artifact/FileBrowser.tsx` (linha ~244)

- [x]2.2 Reduzir altura máxima do painel de visualização de `max-h-[500px]` para `max-h-[300px] sm:max-h-[500px]` em `packages/web/src/components/artifact/FileBrowser.tsx` (linha ~257)

---

## 3. MetadataEditor — Campos Inline Responsivos (Prioridade: BAIXA)

- [x]3.1 Adicionar `gap-2 min-w-0` ao container `flex items-center justify-between` do componente `InlineEdit` em `packages/web/src/components/artifact/MetadataEditor.tsx` (linha ~78)

- [x]3.2 Adicionar classe `truncate` ao elemento de label dentro do `InlineEdit` para evitar overflow de texto em `packages/web/src/components/artifact/MetadataEditor.tsx` (linha ~78)

- [x]3.3 Aplicar o mesmo ajuste (`gap-2 min-w-0` + `truncate` no label) no componente `TagEditor` em `packages/web/src/components/artifact/MetadataEditor.tsx` (linha ~193)

- [x]3.4 Aplicar o mesmo ajuste (`gap-2 min-w-0` + `truncate` no label) no componente `CheckboxEditor` em `packages/web/src/components/artifact/MetadataEditor.tsx` (linha ~317)

---

## 4. Verificação e Validação

- [x]4.1 Verificar no código que o grid do `FileBrowser` já usa `grid-cols-1 md:grid-cols-2` (coluna única em mobile) — nenhuma mudança necessária se confirmado; documentar resultado em comentário no PR

- [x]4.2 Confirmar que `OwnerActions.tsx` não requer alterações (componente tem apenas um botão + um span, risco muito baixo de overflow)

- [x]4.3 Revisar visualmente as mudanças do `FileEditor` com DevTools no breakpoint 375px (iPhone SE) e 428px (iPhone 12/13) para confirmar que o toolbar exibe em duas linhas sem overflow horizontal

- [x]4.4 Revisar visualmente o layout desktop (≥ 1024px) para confirmar ausência de regressão: toolbar em linha única, botão Split visível para arquivos Markdown
