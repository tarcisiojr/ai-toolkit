## ADDED Requirements

### Requirement: Edição inline de metadados do artefato
O portal SHALL permitir que o owner edite os metadados do artefato diretamente na página de detalhe.

#### Scenario: Editar descrição
- **WHEN** o owner clica em "Editar" na seção de descrição
- **THEN** SHALL transformar o texto em textarea editável
- **AND** SHALL exibir botões "Salvar" e "Cancelar"
- **AND** ao salvar, SHALL chamar API PATCH com o novo valor
- **AND** SHALL atualizar a UI com o valor salvo sem recarregar a página

#### Scenario: Editar keywords
- **WHEN** o owner clica em "Editar" na seção de keywords
- **THEN** SHALL exibir input de tags (mesmo componente da página de publish)
- **AND** SHALL permitir adicionar e remover keywords
- **AND** ao salvar, SHALL chamar API PATCH com o array atualizado

#### Scenario: Editar license
- **WHEN** o owner clica em "Editar" na seção de license
- **THEN** SHALL exibir select dropdown com as opções disponíveis (MIT, Apache-2.0, GPL-3.0, BSD-3-Clause, ISC, UNLICENSED)
- **AND** ao salvar, SHALL chamar API PATCH com o novo valor

#### Scenario: Editar tool targets
- **WHEN** o owner clica em "Editar" na seção de tool targets
- **THEN** SHALL exibir checkboxes com as ferramentas disponíveis (claude-code, opencode, gemini-cli, copilot-cli, cursor, windsurf)
- **AND** SHALL exigir pelo menos 1 selecionado
- **AND** ao salvar, SHALL chamar API PATCH com o array atualizado

#### Scenario: Editar repository URL
- **WHEN** o owner clica em "Editar" na seção de links
- **THEN** SHALL exibir input de URL editável
- **AND** SHALL validar formato de URL antes de permitir salvar
- **AND** ao salvar, SHALL chamar API PATCH com o novo valor

#### Scenario: Cancelar edição
- **WHEN** o owner clica em "Cancelar" durante a edição de qualquer campo
- **THEN** SHALL reverter o campo para o valor original sem chamar a API

### Requirement: Feedback visual nas operações de edição
O portal SHALL fornecer feedback claro sobre o estado das operações de salvamento.

#### Scenario: Salvamento em andamento
- **WHEN** o owner clica em "Salvar" em qualquer campo
- **THEN** SHALL exibir indicador de loading no botão
- **AND** SHALL desabilitar o campo durante o salvamento

#### Scenario: Salvamento com sucesso
- **WHEN** a API retorna sucesso
- **THEN** SHALL exibir feedback visual de sucesso (ex: borda verde temporária)
- **AND** SHALL voltar ao modo de visualização com o valor atualizado

#### Scenario: Erro no salvamento
- **WHEN** a API retorna erro
- **THEN** SHALL exibir mensagem de erro específica
- **AND** SHALL manter o campo em modo de edição para o owner corrigir

### Requirement: Marcar artefato como deprecated
O portal SHALL permitir que o owner marque seu artefato como deprecated com uma mensagem explicativa.

#### Scenario: Deprecar artefato
- **WHEN** o owner clica em "Deprecar" nas configurações do artefato
- **THEN** SHALL exibir modal pedindo mensagem de deprecação (obrigatória)
- **AND** ao confirmar, SHALL chamar API PATCH com `isDeprecated: true` e `deprecatedMessage`
- **AND** SHALL exibir banner de deprecated na página do artefato

#### Scenario: Remover deprecação
- **WHEN** o owner clica em "Remover Deprecação"
- **THEN** SHALL chamar API PATCH com `isDeprecated: false`
- **AND** SHALL remover o banner de deprecated
