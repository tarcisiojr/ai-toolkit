#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from '../commands/login.js';
import { logoutCommand } from '../commands/logout.js';
import { searchCommand } from '../commands/search.js';
import { installCommand } from '../commands/install.js';
import { updateCommand } from '../commands/update.js';
import { removeCommand } from '../commands/remove.js';
import { publishCommand } from '../commands/publish.js';
import { listCommand } from '../commands/list.js';
import { statusCommand } from '../commands/status.js';
import { teamCommand } from '../commands/team.js';
import { configCommand } from '../commands/config.js';
import { syncCommand } from '../commands/sync.js';
import { initCommand } from '../commands/init.js';
import { completionsCommand } from '../commands/completions.js';
import { sourceCommand } from '../commands/source.js';
import { createCommand } from '../commands/create.js';
import { logger } from '../utils/logger.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Lê a versão do package.json para evitar hardcode */
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const VERSION: string = pkg.version;

const program = new Command();

program
  .name('aitk')
  .description('AI Toolkit — Gerenciador de artefatos para ferramentas de AI coding')
  .version(VERSION);

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(searchCommand);
program.addCommand(installCommand);
program.addCommand(updateCommand);
program.addCommand(removeCommand);
program.addCommand(publishCommand);
program.addCommand(listCommand);
program.addCommand(statusCommand);
program.addCommand(teamCommand);
program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(initCommand);
program.addCommand(completionsCommand);
program.addCommand(sourceCommand);
program.addCommand(createCommand);

// ── Help personalizado com banner e cores ────────────────────────────────
program.configureHelp({
  formatHelp: (cmd, helper) => {
    const output: string[] = [];

    // Banner ASCII
    logger.banner();

    // Descricao
    const description = helper.commandDescription(cmd);
    if (description) {
      output.push(`  ${chalk.gray(description)}`);
      output.push('');
    }

    // Versao
    output.push(`  ${chalk.gray('Versao:')} ${chalk.white.bold(`v${VERSION}`)}`);
    output.push('');

    // Uso
    output.push(`  ${chalk.yellow.bold('USO')}`);
    output.push(`  ${chalk.gray('$')} ${chalk.cyan('aitk')} ${chalk.white('<comando>')} ${chalk.gray('[opcoes]')}`);
    output.push('');

    // Comandos
    output.push(`  ${chalk.yellow.bold('COMANDOS')}`);
    const commands = helper.visibleCommands(cmd);
    const maxNameLen = Math.max(...commands.map((c) => c.name().length));

    // Agrupar comandos por categoria
    const authCommands = ['login', 'logout'];
    const registryCommands = ['search', 'install', 'update', 'remove', 'publish'];
    const projectCommands = ['init', 'list', 'status', 'sync', 'config'];
    const sourceCommands = ['source', 'create'];
    const teamCommands = ['team'];
    const utilCommands = ['completions'];

    const groups: Array<{ label: string; names: string[] }> = [
      { label: 'Registry', names: registryCommands },
      { label: 'Projeto', names: projectCommands },
      { label: 'Fontes Git', names: sourceCommands },
      { label: 'Equipes', names: teamCommands },
      { label: 'Autenticacao', names: authCommands },
      { label: 'Utilitarios', names: utilCommands },
    ];

    for (const group of groups) {
      output.push(`  ${chalk.gray(group.label)}`);
      for (const cmdName of group.names) {
        const subcmd = commands.find((c) => c.name() === cmdName);
        if (subcmd) {
          const padding = ' '.repeat(maxNameLen - subcmd.name().length + 2);
          output.push(
            `    ${chalk.cyan.bold(subcmd.name())}${padding}${chalk.gray(helper.subcommandDescription(subcmd))}`,
          );
        }
      }
      output.push('');
    }

    // Opcoes
    output.push(`  ${chalk.yellow.bold('OPCOES')}`);
    const globalOptions = helper.visibleOptions(cmd);
    for (const opt of globalOptions) {
      const flags = opt.flags;
      output.push(`    ${chalk.green(flags)}  ${chalk.gray(opt.description)}`);
    }
    output.push('');

    // Exemplos
    output.push(`  ${chalk.yellow.bold('EXEMPLOS')}`);
    output.push(`    ${chalk.gray('$')} ${chalk.cyan('aitk init')}                          ${chalk.gray('# Inicializar projeto')}`);
    output.push(`    ${chalk.gray('$')} ${chalk.cyan('aitk init')} ${chalk.white('official/starter-kit')}       ${chalk.gray('# Iniciar com template')}`);
    output.push(`    ${chalk.gray('$')} ${chalk.cyan('aitk search')} ${chalk.white('"memory"')}`);
    output.push(`    ${chalk.gray('$')} ${chalk.cyan('aitk install')} ${chalk.white('official/code-review')}`);
    output.push(`    ${chalk.gray('$')} ${chalk.cyan('aitk list')}`);
    output.push('');

    // Link
    output.push(`  ${chalk.gray('Documentacao:')} ${chalk.cyan.underline('https://ai-toolkit-henna.vercel.app/docs')}`);
    output.push('');

    return output.join('\n');
  },
});

program.parse();
