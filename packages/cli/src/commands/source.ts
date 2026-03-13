/**
 * Comando `aitk source` — gerencia repositórios Git como fontes de artefatos.
 * Subcomandos: add, list, sync, remove
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import type { Source } from '@tarcisiojunior/shared';
import {
  addSource,
  removeSource,
  syncSources,
  readSourcesManifest,
  isGitAvailable,
} from '../core/git-source.js';
import { logger } from '../utils/logger.js';

/** Subcomando: aitk source add */
const addCommand = new Command('add')
  .description('Registrar repositório Git como fonte de artefatos')
  .argument('<url>', 'URL ou shorthand GitHub (ex: anthropics/skills)')
  .option('--name <name>', 'Nome customizado para a fonte')
  .option('--branch <branch>', 'Branch a ser usada (padrão: main)')
  .action(async (url: string, options: { name?: string; branch?: string }) => {
    // Verificar Git disponível
    if (!isGitAvailable()) {
      logger.blank();
      logger.error('Git não está instalado ou não foi encontrado no PATH.');
      logger.print(chalk.gray('  Instale o Git para usar fontes Git:'));
      logger.print(chalk.gray('    macOS: brew install git'));
      logger.print(chalk.gray('    Ubuntu/Debian: sudo apt install git'));
      logger.blank();
      return;
    }

    const spinner = ora({
      text: chalk.cyan('Adicionando fonte...'),
      color: 'cyan',
    }).start();

    try {
      const source = addSource({
        url,
        name: options.name,
        branch: options.branch,
      });

      spinner.succeed(chalk.green('Fonte adicionada com sucesso'));
      logger.blank();

      const box = logger.box([
        chalk.green.bold('Fonte registrada'),
        '',
        `${chalk.gray('Nome:')}      ${chalk.white.bold(source.name)}`,
        `${chalk.gray('URL:')}       ${chalk.gray(source.url)}`,
        `${chalk.gray('Branch:')}    ${chalk.gray(source.branch)}`,
        `${chalk.gray('Adapter:')}   ${chalk.cyan(source.adapterType || 'auto-detect')}`,
        `${chalk.gray('Artefatos:')} ${chalk.white.bold(String(source.artifactCount))} encontrado(s)`,
        '',
        chalk.gray(`Use ${chalk.cyan('aitk search <termo>')} para buscar artefatos.`),
      ]);
      logger.print(box);
      logger.blank();
    } catch (error) {
      spinner.fail(chalk.red('Erro ao adicionar fonte'));
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

/** Subcomando: aitk source list */
const listSourceCommand = new Command('list')
  .description('Listar fontes registradas')
  .action(async () => {
    const manifest = readSourcesManifest();

    if (manifest.sources.length === 0) {
      logger.blank();
      logger.warn('Nenhuma fonte registrada.');
      logger.print(chalk.gray(`  Use ${chalk.cyan('aitk source add <url>')} para adicionar uma fonte.`));
      logger.blank();
      return;
    }

    logger.blank();
    logger.print(`  ${chalk.white.bold(String(manifest.sources.length))} fonte(s) registrada(s)`);
    logger.blank();

    const nameWidth = Math.max(10, ...manifest.sources.map((s: Source) => s.name.length));

    const tableOutput = logger.table({
      columns: [
        { header: 'Fonte', width: nameWidth },
        { header: 'Tipo', width: 8 },
        { header: 'Artefatos', width: 10, align: 'right' },
        { header: 'Última Sync', width: 20 },
      ],
      rows: manifest.sources.map((source: Source) => [
        chalk.white.bold(source.name),
        chalk.cyan(source.type),
        chalk.green(String(source.artifactCount)),
        source.lastSync
          ? chalk.gray(new Date(source.lastSync).toLocaleString('pt-BR'))
          : chalk.yellow('Nunca'),
      ]),
    });

    logger.print(tableOutput);
    logger.blank();
  });

/** Subcomando: aitk source sync */
const syncCommand = new Command('sync')
  .description('Sincronizar fontes Git (atualizar cache)')
  .argument('[name]', 'Nome da fonte para sincronizar (todas se omitido)')
  .action(async (name?: string) => {
    if (!isGitAvailable()) {
      logger.blank();
      logger.error('Git não está instalado.');
      logger.blank();
      return;
    }

    const spinner = ora({
      text: chalk.cyan(name ? `Sincronizando "${name}"...` : 'Sincronizando todas as fontes...'),
      color: 'cyan',
    }).start();

    try {
      const synced = syncSources(name);

      if (synced.length === 0) {
        spinner.warn('Nenhuma fonte para sincronizar.');
        return;
      }

      spinner.succeed(
        chalk.green(`${synced.length} fonte(s) sincronizada(s)`),
      );
      logger.blank();

      for (const source of synced) {
        logger.print(
          `  ${chalk.cyan('●')} ${chalk.white.bold(source.name)} — ${chalk.green(String(source.artifactCount))} artefato(s)`,
        );
      }
      logger.blank();
    } catch (error) {
      spinner.fail(chalk.red('Erro ao sincronizar'));
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

/** Subcomando: aitk source remove */
const removeSourceCommand = new Command('remove')
  .description('Remover uma fonte registrada')
  .argument('<name>', 'Nome da fonte para remover')
  .action(async (name: string) => {
    const spinner = ora({
      text: chalk.cyan(`Removendo fonte "${name}"...`),
      color: 'cyan',
    }).start();

    try {
      removeSource(name);
      spinner.succeed(chalk.green(`Fonte "${name}" removida com sucesso`));
      logger.blank();
    } catch (error) {
      spinner.fail(chalk.red('Erro ao remover fonte'));
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

/** Comando principal: aitk source */
export const sourceCommand = new Command('source')
  .description('Gerenciar repositórios Git como fontes de artefatos')
  .addCommand(addCommand)
  .addCommand(listSourceCommand)
  .addCommand(syncCommand)
  .addCommand(removeSourceCommand);
