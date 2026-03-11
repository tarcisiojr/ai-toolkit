import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import type { ArtifactManifest, ToolTarget } from '@tarcisiojr/shared';
import { createApiClient } from '../core/api-client.js';
import {
  readManifest,
  writeManifest,
  removeArtifactFromManifest,
} from '../core/manifest.js';
import { SkillInstaller } from '../installers/skill-installer.js';
import { McpInstaller } from '../installers/mcp-installer.js';
import { ConfigInstaller } from '../installers/config-installer.js';
import { HookInstaller } from '../installers/hook-installer.js';
import { BaseInstaller } from '../installers/base-installer.js';
import { logger } from '../utils/logger.js';

/** Parseia o argumento no formato scope/name */
function parseArtifactArg(artifact: string): {
  scope: string;
  name: string;
} | null {
  const match = artifact.match(/^([^/]+)\/([^@]+)$/);
  if (!match) return null;

  const [, scope, name] = match;
  return { scope, name };
}

/** Retorna o instalador adequado para o tipo do artefato */
function getInstaller(type: string): BaseInstaller {
  const installers: Record<string, BaseInstaller> = {
    skill: new SkillInstaller(),
    mcp: new McpInstaller(),
    config: new ConfigInstaller(),
    hook: new HookInstaller(),
  };

  const installer = installers[type];
  if (!installer) {
    throw new Error(
      `Tipo de artefato "${type}" ainda nao possui instalador.\n` +
      `Tipos suportados: ${Object.keys(installers).join(', ')}`,
    );
  }

  return installer;
}

/** Extrai a versao numerica de uma version range (ex: ^1.0.0 -> 1.0.0) */
function extractVersion(versionRange: string): string {
  return versionRange.replace(/^[\^~>=<]+/, '');
}

export const removeCommand = new Command('remove')
  .alias('rm')
  .alias('uninstall')
  .description('Remover um artefato instalado')
  .argument('<artifact>', 'Artefato no formato scope/nome')
  .option('--tool <tool>', 'Ferramenta alvo (padrao: lido do manifesto)')
  .action(async (artifact: string, options: { tool?: string }) => {
    try {
      // Parseia o argumento
      const parsed = parseArtifactArg(artifact);
      if (!parsed) {
        logger.blank();
        logger.error('Formato invalido. Use: scope/nome');
        logger.print(chalk.gray(`  Exemplo: ${chalk.cyan('aitk remove official/code-review')}`));
        logger.blank();
        return;
      }

      const { scope, name } = parsed;
      const slug = `${scope}/${name}`;

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

      // Verifica se o artefato esta instalado
      const currentRange = manifest.artifacts[slug] || manifest.devArtifacts?.[slug];
      if (!currentRange) {
        logger.blank();
        logger.error(`Artefato ${chalk.cyan(slug)} nao esta instalado.`);
        logger.print(
          chalk.gray(`  Use ${chalk.cyan('aitk list')} para ver artefatos instalados.`),
        );
        logger.blank();
        return;
      }

      const currentVersion = extractVersion(currentRange);
      const isDev = !manifest.artifacts[slug];
      const tool = (options.tool || manifest.tool || 'claude-code') as ToolTarget;

      logger.blank();
      logger.print(
        `  ${chalk.white.bold('Removendo')} ${chalk.cyan.bold(slug)}${chalk.gray(`@${currentVersion}`)}`,
      );
      logger.blank();

      const totalSteps = 3;

      // Passo 1: Consultar tipo do artefato na API
      const spinner1 = ora({
        text: `${logger.stepIndicator(1, totalSteps)} Consultando informacoes do artefato...`,
        color: 'cyan',
      }).start();

      let artifactType: string;

      try {
        const client = createApiClient();
        const response = await client.getArtifact(scope, name);
        artifactType = response.data.type;

        spinner1.succeed(
          `${logger.stepIndicator(1, totalSteps)} Tipo identificado: ${logger.typeBadge(artifactType)}`,
        );
      } catch {
        // Se nao conseguir consultar a API, tenta inferir o tipo
        // Usa 'skill' como padrao, pois e o tipo mais comum
        artifactType = 'skill';

        spinner1.warn(
          `${logger.stepIndicator(1, totalSteps)} API indisponivel — usando tipo padrao: ${chalk.yellow('skill')}`,
        );
      }

      // Passo 2: Remover arquivos instalados
      const spinner2 = ora({
        text: `${logger.stepIndicator(2, totalSteps)} Removendo arquivos...`,
        color: 'cyan',
      }).start();

      const installer = getInstaller(artifactType);

      // Monta o manifesto minimo necessario para o uninstall
      const uninstallManifest: ArtifactManifest = {
        name,
        scope,
        version: currentVersion,
        type: artifactType as ArtifactManifest['type'],
        description: '',
        toolTargets: [tool],
        files: [],
        install: {},
      };

      const projectRoot = process.cwd();
      await installer.uninstall(uninstallManifest, projectRoot, tool);

      spinner2.succeed(
        `${logger.stepIndicator(2, totalSteps)} Arquivos removidos`,
      );

      // Passo 3: Atualizar manifesto
      const spinner3 = ora({
        text: `${logger.stepIndicator(3, totalSteps)} Atualizando aitk.json...`,
        color: 'cyan',
      }).start();

      const updatedManifest = removeArtifactFromManifest(manifest, slug);
      writeManifest(updatedManifest);

      spinner3.succeed(
        `${logger.stepIndicator(3, totalSteps)} Manifesto atualizado`,
      );

      // Mensagem de sucesso
      logger.blank();
      const successBox = logger.box([
        chalk.green.bold('Remocao concluida!'),
        '',
        `${chalk.gray('Artefato:')}   ${chalk.cyan.bold(slug)}@${currentVersion}`,
        `${chalk.gray('Tipo:')}       ${logger.typeBadge(artifactType)}`,
        `${chalk.gray('Escopo:')}     ${isDev ? chalk.yellow('desenvolvimento') : chalk.green('producao')}`,
        '',
        chalk.gray(`Use ${chalk.cyan('aitk list')} para ver artefatos restantes.`),
      ]);
      logger.print(successBox);
      logger.blank();
    } catch (error) {
      logger.blank();
      logger.error('Erro ao remover artefato');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    }
  });
