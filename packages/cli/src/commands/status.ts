import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../core/api-client.js';
import { readManifest } from '../core/manifest.js';
import { logger } from '../utils/logger.js';

/** Parseia o slug no formato scope/name */
function parseSlug(slug: string): { scope: string; name: string } | null {
  const match = slug.match(/^([^/]+)\/([^@]+)$/);
  if (!match) return null;

  const [, scope, name] = match;
  return { scope, name };
}

/** Extrai a versao numerica de uma version range (ex: ^1.0.0 -> 1.0.0) */
function extractVersion(versionRange: string): string {
  return versionRange.replace(/^[\^~>=<]+/, '');
}

/** Informacao de status de um artefato */
interface ArtifactStatus {
  slug: string;
  currentVersion: string;
  latestVersion: string;
  type: string;
  isDev: boolean;
  hasUpdate: boolean;
  error?: string;
}

export const statusCommand = new Command('status')
  .description('Verificar atualizacoes disponiveis para artefatos instalados')
  .action(async () => {
    try {
      // Le o manifesto do projeto
      const manifest = readManifest();
      if (!manifest) {
        logger.blank();
        logger.warn('Nenhum aitk.json encontrado neste diretorio.');
        logger.print(
          chalk.gray(`  Execute ${chalk.cyan('aitk install <artefato>')} para comecar.`),
        );
        logger.blank();
        return;
      }

      const prodArtifacts = Object.entries(manifest.artifacts);
      const devArtifacts = Object.entries(manifest.devArtifacts || {});
      const totalCount = prodArtifacts.length + devArtifacts.length;

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
      logger.print(`  ${chalk.white.bold('Verificando atualizacoes...')} ${chalk.gray(`(${totalCount} artefato(s))`)}`);
      logger.blank();

      const spinner = ora({
        text: 'Consultando registry...',
        color: 'cyan',
      }).start();

      // Consulta a API para cada artefato instalado
      const client = createApiClient();
      const statuses: ArtifactStatus[] = [];

      // Combina todos os artefatos
      const allEntries = [
        ...prodArtifacts.map(([slug, version]) => ({ slug, version, isDev: false })),
        ...devArtifacts.map(([slug, version]) => ({ slug, version, isDev: true })),
      ];

      for (const entry of allEntries) {
        const parsed = parseSlug(entry.slug);
        if (!parsed) {
          statuses.push({
            slug: entry.slug,
            currentVersion: extractVersion(entry.version),
            latestVersion: '-',
            type: '?',
            isDev: entry.isDev,
            hasUpdate: false,
            error: 'Formato de slug invalido',
          });
          continue;
        }

        try {
          const response = await client.getArtifact(parsed.scope, parsed.name);
          const artifact = response.data;
          const currentVersion = extractVersion(entry.version);
          const latestVersion = artifact.latestVersion || currentVersion;

          statuses.push({
            slug: entry.slug,
            currentVersion,
            latestVersion,
            type: artifact.type,
            isDev: entry.isDev,
            hasUpdate: latestVersion !== currentVersion,
          });
        } catch {
          statuses.push({
            slug: entry.slug,
            currentVersion: extractVersion(entry.version),
            latestVersion: '-',
            type: '?',
            isDev: entry.isDev,
            hasUpdate: false,
            error: 'Nao encontrado no registry',
          });
        }
      }

      // Conta atualizacoes disponiveis
      const updateCount = statuses.filter((s) => s.hasUpdate).length;

      if (updateCount > 0) {
        spinner.succeed(
          `${chalk.yellow(String(updateCount))} atualizacao(oes) disponivel(is)`,
        );
      } else {
        spinner.succeed(chalk.green('Todos os artefatos estao atualizados!'));
      }

      logger.blank();

      // Calcula larguras das colunas baseado no conteudo
      const slugWidth = Math.max(12, ...statuses.map((s) => s.slug.length));
      const installedWidth = 12;
      const latestWidth = 12;
      const statusWidth = 20;

      // Renderiza tabela
      const tableOutput = logger.table({
        columns: [
          { header: 'Artefato', width: slugWidth },
          { header: 'Instalada', width: installedWidth },
          { header: 'Latest', width: latestWidth },
          { header: 'Status', width: statusWidth },
        ],
        rows: statuses.map((status) => {
          // Formata a versao instalada
          const installed = chalk.white(`v${status.currentVersion}`);

          // Formata a versao latest
          const latest = status.error
            ? chalk.gray('-')
            : status.hasUpdate
              ? chalk.green.bold(`v${status.latestVersion}`)
              : chalk.white(`v${status.latestVersion}`);

          // Formata o status
          let statusLabel: string;
          if (status.error) {
            statusLabel = chalk.red(status.error);
          } else if (status.hasUpdate) {
            statusLabel = chalk.yellow('Atualizacao disponivel');
          } else {
            statusLabel = chalk.green('Atualizado');
          }

          // Formata o nome com cor baseada no tipo
          const nameFormatted = status.type !== '?'
            ? logger.colorByType(status.type, status.slug)
            : chalk.gray(status.slug);

          return [nameFormatted, installed, latest, statusLabel];
        }),
      });

      logger.print(tableOutput);

      // Resumo
      logger.blank();
      const upToDate = statuses.filter((s) => !s.hasUpdate && !s.error).length;
      const withErrors = statuses.filter((s) => s.error).length;

      const parts: string[] = [];
      if (upToDate > 0) {
        parts.push(chalk.green(`${upToDate} atualizado(s)`));
      }
      if (updateCount > 0) {
        parts.push(chalk.yellow(`${updateCount} com atualizacao`));
      }
      if (withErrors > 0) {
        parts.push(chalk.red(`${withErrors} com erro`));
      }

      logger.print(`  ${chalk.gray('Resumo:')} ${parts.join(chalk.gray(' | '))}`);

      // Sugestao de atualizacao se houver atualizacoes disponiveis
      if (updateCount > 0) {
        logger.blank();
        logger.print(
          chalk.gray(`  Execute ${chalk.cyan('aitk update')} para atualizar todos os artefatos.`),
        );
      }

      logger.blank();
    } catch (error) {
      logger.blank();
      logger.error('Erro ao verificar atualizacoes');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    }
  });
