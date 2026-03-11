## ADDED Requirements

### Requirement: Detecção de ownership na página do artefato
O portal SHALL detectar se o usuário logado é o owner do artefato e exibir a interface adequada.

#### Scenario: Owner acessa seu artefato
- **WHEN** um usuário logado acessa a página de um artefato onde `owner_user_id` corresponde ao seu `user.id`
- **THEN** SHALL renderizar a página em modo owner com todas as ações de edição visíveis

#### Scenario: Membro de time acessa artefato do time
- **WHEN** um usuário logado que é membro (role owner ou admin) do time que possui o artefato acessa a página
- **THEN** SHALL renderizar a página em modo owner

#### Scenario: Membro de time com role member
- **WHEN** um usuário logado que é membro com role "member" do time acessa a página
- **THEN** SHALL renderizar a página em modo visitante (read-only)

#### Scenario: Visitante não logado
- **WHEN** um usuário não autenticado acessa a página
- **THEN** SHALL renderizar a página em modo visitante (read-only)

#### Scenario: Usuário logado que não é owner
- **WHEN** um usuário logado que não é owner nem membro do time acessa a página
- **THEN** SHALL renderizar a página em modo visitante (read-only)

### Requirement: Ações condicionais na interface
O portal SHALL exibir botões e controles de edição apenas para owners, sem afetar a experiência de visitantes.

#### Scenario: Botões de edição para owner
- **WHEN** a página é renderizada em modo owner
- **THEN** SHALL exibir: botão "Editar" nos metadados, botão "✏️" em cada arquivo textual, botão "Nova Versão", botões "Yank"/"Restore" nas versões, zona de upload

#### Scenario: Sem botões de edição para visitante
- **WHEN** a página é renderizada em modo visitante
- **THEN** NÃO SHALL exibir nenhum botão de edição ou gerenciamento
- **AND** a página SHALL ter a mesma aparência visual atual (sem espaços vazios onde botões estariam)

### Requirement: Componentes de edição com lazy loading
Os componentes de edição (editor, upload, etc.) SHALL ser carregados sob demanda para não impactar performance de visitantes.

#### Scenario: Bundle do visitante
- **WHEN** um visitante carrega a página do artefato
- **THEN** o JavaScript dos componentes de edição (CodeMirror, upload zone, etc.) NÃO SHALL estar no bundle inicial

#### Scenario: Bundle do owner
- **WHEN** o owner interage com um controle de edição pela primeira vez
- **THEN** SHALL carregar os módulos necessários via dynamic import
- **AND** SHALL exibir skeleton/loading state enquanto carrega
