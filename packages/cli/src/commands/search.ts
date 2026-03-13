import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../core/api-client.js';
import { logger } from '../utils/logger.js';

export const searchCommand = new Command('search')
  .description('Buscar artefatos no registry')
  .argument('<query>', 'Termo de busca')
  .option('-t, --type <type>', 'Filtrar por tipo (skill, mcp, template, config, hook)')
  .option('--tool <tool>', 'Filtrar por ferramenta (claude-code, opencode, etc.)')
  .action(async (query: string, options: { type?: string; tool?: string }) => {
    const spinner = ora({
      text: chalk.cyan('Buscando artefatos...'),
      color: 'cyan',
    }).start();

    try {
      const client = createApiClient();
      const results = await client.search({ q: query, type: options.type, tool: options.tool });

      spinner.stop();

      if (results.data.length === 0) {
        logger.blank();
        logger.warn(`Nenhum artefato encontrado para "${query}".`);
        logger.blank();
        logger.print(chalk.gray('  Dica: tente termos mais genericos ou remova filtros.'));
        logger.blank();
        return;
      }

      // Cabecalho dos resultados
      logger.blank();
      logger.print(
        `  ${chalk.white.bold(`${results.data.length}`)} artefato(s) encontrado(s) para ${chalk.cyan.bold(`"${query}"`)}`,
      );
      logger.blank();

      // Calcular larguras para a tabela
      const nameWidth = Math.max(
        12,
        ...results.data.map((a) => a.slug.length),
      );
      const typeWidth = 10;
      const versionWidth = 10;
      const downloadsWidth = 12;

      // Renderizar tabela
      const tableOutput = logger.table({
        columns: [
          { header: 'Artefato', width: nameWidth },
          { header: 'Tipo', width: typeWidth },
          { header: 'Versao', width: versionWidth },
          { header: 'Downloads', width: downloadsWidth, align: 'right' },
        ],
        rows: results.data.map((artifact) => [
          chalk.white.bold(artifact.slug),
          logger.typeBadge(artifact.type),
          artifact.latestVersion ? chalk.gray(`v${artifact.latestVersion}`) : chalk.yellow('—'),
          formatDownloads(artifact.totalDownloads ?? 0),
        ]),
      });

      logger.print(tableOutput);

      // Descricoes abaixo da tabela
      logger.blank();
      for (const artifact of results.data) {
        logger.print(
          `  ${logger.colorByType(artifact.type, '●')} ${chalk.white.bold(artifact.slug)} ${chalk.gray('—')} ${chalk.gray(artifact.description)}`,
        );
      }

      logger.blank();
      logger.print(
        chalk.gray(`  Use ${chalk.cyan('aitk install <artefato>')} para instalar.`),
      );
      logger.blank();
    } catch (error) {
      spinner.fail(chalk.red('Erro ao buscar artefatos'));
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

/** Formata o numero de downloads para exibicao */
function formatDownloads(count: number): string {
  if (count >= 1_000_000) {
    return chalk.green.bold(`${(count / 1_000_000).toFixed(1)}M`);
  }
  if (count >= 1_000) {
    return chalk.green.bold(`${(count / 1_000).toFixed(1)}K`);
  }
  return chalk.green(String(count));
}
