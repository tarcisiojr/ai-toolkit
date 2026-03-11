## ADDED Requirements

### Requirement: Editor inline com syntax highlighting
O portal SHALL exibir um editor CodeMirror 6 para arquivos textuais, com syntax highlighting adequado ao tipo de arquivo.

#### Scenario: Abrir arquivo Markdown para edição
- **WHEN** o owner clica no botão de editar em um arquivo `.md`
- **THEN** SHALL abrir o editor CodeMirror com extensão `@codemirror/lang-markdown`
- **AND** SHALL carregar o conteúdo atual do arquivo da versão latest

#### Scenario: Abrir arquivo JSON para edição
- **WHEN** o owner clica no botão de editar em um arquivo `.json`
- **THEN** SHALL abrir o editor CodeMirror com extensão `@codemirror/lang-json`

#### Scenario: Abrir arquivo YAML para edição
- **WHEN** o owner clica no botão de editar em um arquivo `.yaml` ou `.yml`
- **THEN** SHALL abrir o editor CodeMirror com extensão `@codemirror/lang-yaml`

#### Scenario: Abrir arquivo JavaScript/TypeScript para edição
- **WHEN** o owner clica no botão de editar em um arquivo `.js` ou `.ts`
- **THEN** SHALL abrir o editor CodeMirror com extensão `@codemirror/lang-javascript`

#### Scenario: Abrir arquivo sem extensão reconhecida
- **WHEN** o owner clica no botão de editar em um arquivo com extensão não mapeada
- **THEN** SHALL abrir o editor CodeMirror em modo plain text com line numbers

### Requirement: Preview de Markdown
O portal SHALL exibir preview renderizado de arquivos Markdown ao lado do editor.

#### Scenario: Preview em split view
- **WHEN** o owner está editando um arquivo `.md`
- **THEN** SHALL exibir painel de preview ao lado do editor com o Markdown renderizado em HTML
- **AND** o preview SHALL atualizar em tempo real conforme o usuário digita

#### Scenario: Toggle entre editor e preview
- **WHEN** o owner clica no botão de toggle de view
- **THEN** SHALL alternar entre: editor only, split view, preview only

### Requirement: Carregamento lazy do editor
O componente do editor SHALL ser carregado via dynamic import para não impactar o bundle de visitantes.

#### Scenario: Visitante acessa página do artefato
- **WHEN** um visitante (não-owner) acessa a página do artefato
- **THEN** o código do CodeMirror NÃO SHALL ser incluído no bundle carregado

#### Scenario: Owner clica em editar
- **WHEN** o owner clica no botão de editar pela primeira vez
- **THEN** SHALL carregar o módulo do CodeMirror via dynamic import
- **AND** SHALL exibir indicador de carregamento enquanto o módulo carrega
