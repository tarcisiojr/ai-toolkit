## ADDED Requirements

### Requirement: Zona de drag & drop para upload de arquivos
O portal SHALL exibir uma zona de drag & drop para owners fazerem upload de arquivos ao criar nova versão.

#### Scenario: Arrastar arquivos para a zona de upload
- **WHEN** o owner arrasta um ou mais arquivos para a zona de drop
- **THEN** SHALL exibir preview dos arquivos selecionados com nome, tamanho e tipo
- **AND** SHALL permitir remover arquivos individuais da lista antes de publicar

#### Scenario: Clicar para selecionar arquivos
- **WHEN** o owner clica na zona de upload
- **THEN** SHALL abrir o file picker nativo do sistema operacional
- **AND** SHALL permitir seleção de múltiplos arquivos

#### Scenario: Arrastar pasta inteira
- **WHEN** o owner arrasta uma pasta para a zona de drop
- **THEN** SHALL adicionar todos os arquivos da pasta mantendo a estrutura de diretórios
- **AND** SHALL exibir a árvore de arquivos resultante

#### Scenario: Validação de tamanho no cliente
- **WHEN** o owner adiciona um arquivo maior que 5MB
- **THEN** SHALL exibir erro visual no arquivo indicando que excede o limite
- **AND** SHALL desabilitar o botão de publicar enquanto houver arquivos inválidos

### Requirement: Upload com indicador de progresso
O portal SHALL exibir progresso do upload durante a publicação.

#### Scenario: Upload em andamento
- **WHEN** o owner confirma a publicação e o upload inicia
- **THEN** SHALL exibir barra de progresso por arquivo e total
- **AND** SHALL desabilitar o botão de publicar durante o upload

#### Scenario: Upload concluído com sucesso
- **WHEN** todos os arquivos são enviados e a versão é criada
- **THEN** SHALL exibir mensagem de sucesso com link para a nova versão
- **AND** SHALL atualizar a página para refletir a nova versão

#### Scenario: Erro durante upload
- **WHEN** ocorre um erro durante o upload de qualquer arquivo
- **THEN** SHALL exibir mensagem de erro específica
- **AND** SHALL permitir tentar novamente sem perder os arquivos já selecionados
