import { Command } from 'commander';
import chalk from 'chalk';
import { readManifest } from '../core/manifest.js';
import { logger } from '../utils/logger.js';

export const listCommand = new Command('list')
  .alias('ls')
  .description('Listar artefatos instalados no projeto')
  .action(async () => {
    try {
      const manifest = readManifest();

      if (!manifest) {
        logger.blank();
        logger.warn('Nenhum aitk.json encontrado neste diretorio.');
        logger.blank();
        logger.print(
          chalk.gray(`  Execute ${chalk.cyan('aitk install <artefato>')} para comecar.`),
        );
        logger.blank();
        return;
      }

      const artifacts = Object.entries(manifest.artifacts);
      const devArtifacts = Object.entries(manifest.devArtifacts || {});
      const totalCount = artifacts.length + devArtifacts.length;

      if (totalCount === 0) {
        logger.blank();
        logger.warn('Nenhum artefato instalado.');
        logger.print(
          chalk.gray(`\n  Execute ${chalk.cyan('aitk install <artefato>')} para comecar.`),
        );
        logger.blank();
        return;
      }

      logger.blank();
      logger.print(`  ${chalk.white.bold('Artefatos instalados')} ${chalk.gray(`(${totalCount})`)}`);
      logger.print(chalk.gray(`  Ferramenta: ${manifest.tool}`));
      logger.blank();

      // Combinar todos os artefatos para a tabela
      const allEntries: Array<{ name: string; version: string; isDev: boolean }> = [
        ...artifacts.map(([name, version]) => ({ name, version, isDev: false })),
        ...devArtifacts.map(([name, version]) => ({ name, version, isDev: true })),
      ];

      // Calcular larguras
      const nameWidth = Math.max(12, ...allEntries.map((e) => e.name.length));
      const versionWidth = 12;
      const tipoWidth = 8;

      // Renderizar tabela
      const tableOutput = logger.table({
        columns: [
          { header: 'Artefato', width: nameWidth },
          { header: 'Versao', width: versionWidth },
          { header: 'Tipo', width: tipoWidth },
        ],
        rows: allEntries.map((entry) => {
          // Inferir tipo a partir do nome (se disponivel)
          const typeLabel = entry.isDev
            ? chalk.yellow('dev')
            : chalk.green('prod');

          return [
            chalk.cyan.bold(entry.name),
            chalk.white(entry.version),
            typeLabel,
          ];
        }),
      });

      logger.print(tableOutput);

      // Sumario
      logger.blank();
      const parts: string[] = [];
      if (artifacts.length > 0) {
        parts.push(chalk.green(`${artifacts.length} producao`));
      }
      if (devArtifacts.length > 0) {
        parts.push(chalk.yellow(`${devArtifacts.length} desenvolvimento`));
      }
      logger.print(`  ${chalk.gray('Total:')} ${parts.join(chalk.gray(' | '))}`);
      logger.blank();
    } catch (error) {
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });
