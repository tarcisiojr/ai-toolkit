import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';

/**
 * Script de autocompletion para Bash.
 * Gera completions para todos os comandos e subcomandos do aitk.
 */
function generateBashCompletions(): string {
  return `#!/bin/bash
# Autocompletion para o CLI aitk (AI Toolkit)
# Instalacao: eval "$(aitk completions bash)"

_aitk_completions() {
  local cur prev commands subcommands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Comandos principais
  commands="login logout search install update remove publish list status init config sync team completions help"

  # Subcomandos do team
  local team_subcommands="list create add-member remove-member delete"

  # Subcomandos do config
  local config_subcommands="list get set unset"

  case "\${prev}" in
    aitk)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    team)
      COMPREPLY=( $(compgen -W "\${team_subcommands}" -- "\${cur}") )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "\${config_subcommands}" -- "\${cur}") )
      return 0
      ;;
    install|update|remove)
      # Completar com scope/name — sem sugestoes automaticas (depende do registry)
      return 0
      ;;
    completions)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      return 0
      ;;
    --tool)
      COMPREPLY=( $(compgen -W "claude-code opencode gemini-cli cursor aider copilot-cli" -- "\${cur}") )
      return 0
      ;;
    *)
      # Opcoes globais
      COMPREPLY=( $(compgen -W "--help --version" -- "\${cur}") )
      return 0
      ;;
  esac
}

complete -F _aitk_completions aitk
`;
}

/**
 * Script de autocompletion para Zsh.
 * Gera completions com descricoes para todos os comandos.
 */
function generateZshCompletions(): string {
  return `#compdef aitk
# Autocompletion para o CLI aitk (AI Toolkit)
# Instalacao: eval "$(aitk completions zsh)"

_aitk() {
  local -a commands
  commands=(
    'login:Autenticar com o registry'
    'logout:Remover credenciais salvas'
    'search:Buscar artefatos no registry'
    'install:Instalar um artefato'
    'update:Atualizar artefatos instalados'
    'remove:Remover um artefato instalado'
    'publish:Publicar um artefato'
    'list:Listar artefatos instalados'
    'status:Verificar atualizacoes disponiveis'
    'init:Inicializar projeto ou aplicar template'
    'config:Gerenciar configuracao'
    'sync:Sincronizar dependencias do manifesto'
    'team:Gerenciar equipes'
    'completions:Gerar script de autocompletion'
    'help:Mostrar ajuda'
  )

  local -a tools
  tools=(
    'claude-code:Claude Code (Anthropic)'
    'opencode:OpenCode'
    'gemini-cli:Gemini CLI (Google)'
    'cursor:Cursor'
    'aider:Aider'
    'copilot-cli:GitHub Copilot CLI'
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case "$state" in
    command)
      _describe 'command' commands
      ;;
    args)
      case "$words[1]" in
        team)
          local -a team_cmds
          team_cmds=(
            'list:Listar equipes'
            'create:Criar equipe'
            'add-member:Adicionar membro'
            'remove-member:Remover membro'
            'delete:Deletar equipe'
          )
          _describe 'team command' team_cmds
          ;;
        config)
          local -a config_cmds
          config_cmds=(
            'list:Listar configuracoes'
            'get:Obter valor de configuracao'
            'set:Definir configuracao'
            'unset:Remover configuracao'
          )
          _describe 'config command' config_cmds
          ;;
        completions)
          local -a shells
          shells=('bash' 'zsh' 'fish')
          _describe 'shell' shells
          ;;
        install|update|remove)
          _arguments \\
            '--tool[Ferramenta alvo]:tool:->tool' \\
            '--save-dev[Salvar como dev dependency]'
          if [[ "$state" == "tool" ]]; then
            _describe 'tool' tools
          fi
          ;;
        init)
          _arguments \\
            '--tool[Ferramenta alvo]:tool:->tool' \\
            '--force[Sobrescrever manifesto existente]'
          if [[ "$state" == "tool" ]]; then
            _describe 'tool' tools
          fi
          ;;
      esac
      ;;
  esac
}

_aitk "$@"
`;
}

/**
 * Script de autocompletion para Fish shell.
 * Gera completions nativas do Fish.
 */
function generateFishCompletions(): string {
  return `# Autocompletion para o CLI aitk (AI Toolkit)
# Instalacao: aitk completions fish | source
# Ou para permanente: aitk completions fish > ~/.config/fish/completions/aitk.fish

# Desabilitar completions de arquivo por padrao
complete -c aitk -f

# Comandos principais
complete -c aitk -n '__fish_use_subcommand' -a login -d 'Autenticar com o registry'
complete -c aitk -n '__fish_use_subcommand' -a logout -d 'Remover credenciais salvas'
complete -c aitk -n '__fish_use_subcommand' -a search -d 'Buscar artefatos no registry'
complete -c aitk -n '__fish_use_subcommand' -a install -d 'Instalar um artefato'
complete -c aitk -n '__fish_use_subcommand' -a update -d 'Atualizar artefatos instalados'
complete -c aitk -n '__fish_use_subcommand' -a remove -d 'Remover um artefato instalado'
complete -c aitk -n '__fish_use_subcommand' -a publish -d 'Publicar um artefato'
complete -c aitk -n '__fish_use_subcommand' -a list -d 'Listar artefatos instalados'
complete -c aitk -n '__fish_use_subcommand' -a status -d 'Verificar atualizacoes disponiveis'
complete -c aitk -n '__fish_use_subcommand' -a init -d 'Inicializar projeto ou aplicar template'
complete -c aitk -n '__fish_use_subcommand' -a config -d 'Gerenciar configuracao'
complete -c aitk -n '__fish_use_subcommand' -a sync -d 'Sincronizar dependencias do manifesto'
complete -c aitk -n '__fish_use_subcommand' -a team -d 'Gerenciar equipes'
complete -c aitk -n '__fish_use_subcommand' -a completions -d 'Gerar script de autocompletion'

# Subcomandos do team
complete -c aitk -n '__fish_seen_subcommand_from team' -a list -d 'Listar equipes'
complete -c aitk -n '__fish_seen_subcommand_from team' -a create -d 'Criar equipe'
complete -c aitk -n '__fish_seen_subcommand_from team' -a add-member -d 'Adicionar membro'
complete -c aitk -n '__fish_seen_subcommand_from team' -a remove-member -d 'Remover membro'
complete -c aitk -n '__fish_seen_subcommand_from team' -a delete -d 'Deletar equipe'

# Subcomandos do config
complete -c aitk -n '__fish_seen_subcommand_from config' -a list -d 'Listar configuracoes'
complete -c aitk -n '__fish_seen_subcommand_from config' -a get -d 'Obter configuracao'
complete -c aitk -n '__fish_seen_subcommand_from config' -a set -d 'Definir configuracao'
complete -c aitk -n '__fish_seen_subcommand_from config' -a unset -d 'Remover configuracao'

# Shells para completions
complete -c aitk -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish' -d 'Shell'

# Opcao --tool para install/update/init
complete -c aitk -n '__fish_seen_subcommand_from install update init' -l tool -d 'Ferramenta alvo' -xa 'claude-code opencode gemini-cli cursor aider copilot-cli'

# Opcoes globais
complete -c aitk -s h -l help -d 'Mostrar ajuda'
complete -c aitk -s V -l version -d 'Mostrar versao'
`;
}

export const completionsCommand = new Command('completions')
  .description('Gerar script de autocompletion para o shell')
  .argument('<shell>', 'Shell alvo (bash, zsh, fish)')
  .action((shell: string) => {
    const shellLower = shell.toLowerCase();

    switch (shellLower) {
      case 'bash':
        // Imprime direto para stdout (sem logger) para permitir eval
        process.stdout.write(generateBashCompletions());
        break;

      case 'zsh':
        process.stdout.write(generateZshCompletions());
        break;

      case 'fish':
        process.stdout.write(generateFishCompletions());
        break;

      default:
        logger.blank();
        logger.error(`Shell "${shell}" nao suportado.`);
        logger.print(chalk.gray('  Shells suportados: bash, zsh, fish'));
        logger.blank();
        logger.print(chalk.gray('  Exemplos de instalacao:'));
        logger.print(`    ${chalk.gray('Bash:')}  ${chalk.cyan('eval "$(aitk completions bash)"')}`);
        logger.print(`    ${chalk.gray('Zsh:')}   ${chalk.cyan('eval "$(aitk completions zsh)"')}`);
        logger.print(`    ${chalk.gray('Fish:')}  ${chalk.cyan('aitk completions fish | source')}`);
        logger.blank();
        process.exitCode = 1;
    }
  });
