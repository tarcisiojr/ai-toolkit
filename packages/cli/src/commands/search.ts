import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../core/api-client.js';
import { SourceResolver } from '../core/source-resolver.js';
import { readSourcesManifest } from '../core/git-source.js';
import { logger } from '../utils/logger.js';
import type { ArtifactType } from '@tarcisiojunior/shared';

/** Resultado unificado de busca */
interface SearchResult {
  slug: string;
  type: ArtifactType;
  latestVersion?: string;
  totalDownloads: number;
  description: string;
  source: string;
}

export const searchCommand = new Command('search')
  .description('Buscar artefatos no registry e fontes Git')
  .argument('<query>', 'Termo de busca')
  .option('-t, --type <type>', 'Filtrar por tipo (skill, mcp, template, config, hook)')
  .option('--tool <tool>', 'Filtrar por ferramenta (claude-code, opencode, etc.)')
  .option('--source <source>', 'Filtrar por fonte específica (ex: anthropics/skills)')
  .action(async (query: string, options: { type?: string; tool?: string; source?: string }) => {
    const spinner = ora({
      text: chalk.cyan('Buscando artefatos...'),
      color: 'cyan',
    }).start();

    try {
      const allResults: SearchResult[] = [];

      // Buscar no registry (exceto se --source especifica uma fonte Git)
      if (!options.source) {
        try {
          const client = createApiClient();
          const results = await client.search({ q: query, type: options.type, tool: options.tool });

          for (const artifact of results.data) {
            allResults.push({
              slug: artifact.slug,
              type: artifact.type,
              latestVersion: artifact.latestVersion,
              totalDownloads: artifact.totalDownloads ?? 0,
              description: artifact.description,
              source: 'registry',
            });
          }
        } catch {
          // Registry indisponível, continua com fontes Git
        }
      }

      // Buscar em fontes Git registradas
      const manifest = readSourcesManifest();
      if (manifest.sources.length > 0) {
        const resolver = new SourceResolver();
        const gitResults = await resolver.searchInGitSources(query, options.source);

        for (const item of gitResults) {
          // Filtrar por tipo se especificado
          if (options.type && item.manifest.type !== options.type) continue;

          const slug = `${item.manifest.scope}/${item.manifest.name}`;

          // Evitar duplicatas (registry tem prioridade)
          if (allResults.some((r) => r.slug === slug)) continue;

          allResults.push({
            slug,
            type: item.manifest.type,
            latestVersion: item.manifest.version !== '0.0.0' ? item.manifest.version : undefined,
            totalDownloads: 0,
            description: item.manifest.description,
            source: item.source,
          });
        }
      }

      spinner.stop();

      if (allResults.length === 0) {
        logger.blank();
        logger.warn(`Nenhum artefato encontrado para "${query}".`);
        logger.blank();
        logger.print(chalk.gray('  Dica: tente termos mais genericos ou remova filtros.'));
        logger.blank();
        return;
      }

      // Cabeçalho dos resultados
      logger.blank();
      logger.print(
        `  ${chalk.white.bold(`${allResults.length}`)} artefato(s) encontrado(s) para ${chalk.cyan.bold(`"${query}"`)}`,
      );
      logger.blank();

      // Calcular larguras para a tabela
      const hasMultipleSources = new Set(allResults.map((r) => r.source)).size > 1;
      const nameWidth = Math.max(12, ...allResults.map((a) => a.slug.length));
      const typeWidth = 10;
      const versionWidth = 10;
      const downloadsWidth = 12;
      const sourceWidth = hasMultipleSources
        ? Math.max(10, ...allResults.map((a) => a.source.length))
        : 0;

      // Montar colunas
      const columns: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }> = [
        { header: 'Artefato', width: nameWidth },
        { header: 'Tipo', width: typeWidth },
        { header: 'Versao', width: versionWidth },
        { header: 'Downloads', width: downloadsWidth, align: 'right' },
      ];

      if (hasMultipleSources) {
        columns.push({ header: 'Fonte', width: sourceWidth });
      }

      // Renderizar tabela
      const tableOutput = logger.table({
        columns,
        rows: allResults.map((artifact) => {
          const row = [
            chalk.white.bold(artifact.slug),
            logger.typeBadge(artifact.type),
            artifact.latestVersion ? chalk.gray(`v${artifact.latestVersion}`) : chalk.yellow('—'),
            formatDownloads(artifact.totalDownloads),
          ];

          if (hasMultipleSources) {
            row.push(
              artifact.source === 'registry'
                ? chalk.blue('registry')
                : chalk.magenta(artifact.source),
            );
          }

          return row;
        }),
      });

      logger.print(tableOutput);

      // Descrições abaixo da tabela
      logger.blank();
      for (const artifact of allResults) {
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

/** Formata o numero de downloads para exibição */
function formatDownloads(count: number): string {
  if (count >= 1_000_000) {
    return chalk.green.bold(`${(count / 1_000_000).toFixed(1)}M`);
  }
  if (count >= 1_000) {
    return chalk.green.bold(`${(count / 1_000).toFixed(1)}K`);
  }
  return chalk.green(String(count));
}
