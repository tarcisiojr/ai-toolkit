## ADDED Requirements

### Requirement: Navegação em árvore de arquivos
O portal SHALL exibir um componente de árvore (tree view) mostrando a estrutura de arquivos de uma versão do artefato.

#### Scenario: Exibir árvore de arquivos da versão latest
- **WHEN** um usuário acessa a página de um artefato que tem arquivos
- **THEN** SHALL exibir uma árvore de diretórios/arquivos da versão latest
- **AND** pastas SHALL ser colapsáveis/expansíveis
- **AND** arquivos SHALL exibir ícone baseado no tipo (md, json, js, imagem, etc.)

#### Scenario: Navegar entre versões
- **WHEN** o usuário seleciona uma versão diferente no seletor de versão
- **THEN** SHALL atualizar a árvore de arquivos para refletir os arquivos daquela versão

#### Scenario: Exibir tamanho dos arquivos
- **WHEN** a árvore de arquivos é renderizada
- **THEN** cada arquivo SHALL exibir seu tamanho formatado (bytes, KB, MB)

### Requirement: Visualização de conteúdo de arquivo
O portal SHALL permitir visualizar o conteúdo de arquivos textuais clicando neles na árvore.

#### Scenario: Clicar em arquivo textual
- **WHEN** o usuário clica em um arquivo textual na árvore
- **THEN** SHALL exibir o conteúdo do arquivo em um painel de visualização com syntax highlighting
- **AND** para arquivos `.md`, SHALL renderizar o Markdown como HTML

#### Scenario: Clicar em arquivo de imagem
- **WHEN** o usuário clica em um arquivo de imagem (.png, .jpg, .svg)
- **THEN** SHALL exibir a imagem renderizada no painel de visualização

#### Scenario: Clicar em arquivo binário não-imagem
- **WHEN** o usuário clica em um arquivo binário que não é imagem
- **THEN** SHALL exibir mensagem informando que o arquivo não pode ser visualizado
- **AND** SHALL oferecer botão de download

### Requirement: Download de arquivos individuais
O portal SHALL permitir download de arquivos individuais da versão.

#### Scenario: Botão de download em arquivo
- **WHEN** o usuário clica no botão de download de um arquivo
- **THEN** SHALL iniciar o download do arquivo individual via API de arquivos
