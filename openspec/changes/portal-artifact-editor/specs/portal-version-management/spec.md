## ADDED Requirements

### Requirement: Criar nova versão pelo portal
O portal SHALL permitir que o owner crie novas versões do artefato diretamente pela interface web.

#### Scenario: Criar versão por edição inline
- **WHEN** o owner edita um arquivo e clica "Salvar como nova versão"
- **THEN** SHALL exibir modal com: campo de versão (pré-preenchido com patch bump), campo de changelog
- **AND** ao confirmar, SHALL enviar as alterações via API com `baseVersion` da versão atual
- **AND** SHALL redirecionar para a nova versão após sucesso

#### Scenario: Criar versão por upload completo
- **WHEN** o owner clica "Nova Versão" e faz upload de arquivos
- **THEN** SHALL exibir formulário com: zona de upload, campo de versão (sugerindo bump), campo de changelog
- **AND** ao confirmar, SHALL enviar os arquivos via API
- **AND** SHALL redirecionar para a nova versão após sucesso

#### Scenario: Sugestão automática de versão
- **WHEN** o modal de nova versão é aberto
- **THEN** SHALL sugerir a próxima versão baseada na latest:
  - Edição inline → patch bump (1.0.0 → 1.0.1)
  - Upload completo → minor bump (1.0.0 → 1.1.0)
- **AND** SHALL permitir que o owner altere o número manualmente
- **AND** SHALL validar formato semver em tempo real

#### Scenario: Changelog obrigatório
- **WHEN** o owner tenta publicar sem preencher o changelog
- **THEN** SHALL exibir mensagem de validação indicando que changelog é obrigatório
- **AND** SHALL desabilitar o botão de publicar

### Requirement: Yank e restore de versões
O portal SHALL permitir que o owner marque versões como yanked (retiradas) ou restaure versões yanked.

#### Scenario: Yank de uma versão
- **WHEN** o owner clica em "Yank" em uma versão listada
- **THEN** SHALL exibir modal de confirmação pedindo motivo (obrigatório)
- **AND** ao confirmar, SHALL chamar API PATCH com `isYanked: true`
- **AND** a versão SHALL aparecer com indicador visual de "yanked" na lista

#### Scenario: Restore de versão yanked
- **WHEN** o owner clica em "Restore" em uma versão yanked
- **THEN** SHALL chamar API PATCH com `isYanked: false`
- **AND** a versão SHALL voltar ao estado normal na lista

#### Scenario: Yank da versão latest
- **WHEN** o owner faz yank da versão latest
- **THEN** SHALL atualizar o `latest_version` do artefato para a versão não-yanked mais recente

### Requirement: Lista de versões com ações do owner
O portal SHALL exibir a lista de versões com ações contextuais para o owner.

#### Scenario: Owner visualiza lista de versões
- **WHEN** o owner acessa a página do seu artefato
- **THEN** SHALL exibir todas as versões (incluindo yanked, com indicador visual)
- **AND** cada versão SHALL ter botões de ação: "Ver Arquivos", "Yank"/"Restore"

#### Scenario: Visitante visualiza lista de versões
- **WHEN** um visitante acessa a página do artefato
- **THEN** SHALL exibir apenas versões não-yanked
- **AND** NÃO SHALL exibir botões de ação de gerenciamento
