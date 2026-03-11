import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import type { ArtifactManifest, ToolTarget } from '@tarcisiojr/shared';
import { createApiClient } from '../core/api-client.js';
import {
  readManifest,
  writeManifest,
  addArtifactToManifest,
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

/** Formata bytes para exibicao legivel */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extrai um tarball para um diretorio temporario */
function extractTarball(tarballPath: string): string {
  const extractDir = join(tmpdir(), `aitk-update-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });

  execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`, {
    stdio: 'pipe',
  });

  return extractDir;
}

/** Limpa arquivos temporarios */
function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (existsSync(p)) {
        rmSync(p, { recursive: true, force: true });
      }
    } catch {
      // Ignora erros de limpeza
    }
  }
}

/** Extrai a versao numerica de uma version range (ex: ^1.0.0 -> 1.0.0) */
function extractVersion(versionRange: string): string {
  return versionRange.replace(/^[\^~>=<]+/, '');
}

/** Informacoes de atualizacao de um artefato */
interface UpdateInfo {
  scope: string;
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: string;
  isDev: boolean;
}

/** Verifica atualizacoes disponiveis para os artefatos */
async function checkUpdates(
  artifacts: Record<string, string>,
  isDev: boolean,
): Promise<UpdateInfo[]> {
  const client = createApiClient();
  const updates: UpdateInfo[] = [];

  for (const [slug, versionRange] of Object.entries(artifacts)) {
    const parsed = parseArtifactArg(slug);
    if (!parsed) continue;

    try {
      const response = await client.getArtifact(parsed.scope, parsed.name);
      const artifact = response.data;
      const currentVersion = extractVersion(versionRange);

      if (artifact.latestVersion && artifact.latestVersion !== currentVersion) {
        updates.push({
          scope: parsed.scope,
          name: parsed.name,
          currentVersion,
          latestVersion: artifact.latestVersion,
          type: artifact.type,
          isDev,
        });
      }
    } catch {
      // Ignora artefatos que nao foram encontrados na API
    }
  }

  return updates;
}

/** Atualiza um unico artefato para a versao mais recente */
async function updateSingleArtifact(
  update: UpdateInfo,
  tool: ToolTarget,
): Promise<boolean> {
  const fullName = `${update.scope}/${update.name}`;
  const totalSteps = 4;
  const tmpFiles: string[] = [];

  try {
    // Passo 1: Baixar nova versao
    const spinner1 = ora({
      text: `${logger.stepIndicator(1, totalSteps)} Baixando ${chalk.cyan(fullName)}@${chalk.green(update.latestVersion)}...`,
      color: 'cyan',
    }).start();

    const client = createApiClient();
    const { buffer, size } = await client.downloadVersion(
      update.scope,
      update.name,
      update.latestVersion,
    );

    // Salva o tarball em diretorio temporario
    const tmpDir = join(tmpdir(), `aitk-update-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    tmpFiles.push(tmpDir);

    const tarballPath = join(tmpDir, `${update.scope}-${update.name}-${update.latestVersion}.tgz`);
    writeFileSync(tarballPath, Buffer.from(buffer));

    spinner1.succeed(
      `${logger.stepIndicator(1, totalSteps)} Download completo ${chalk.gray(`(${formatBytes(size)})`)}`,
    );

    // Passo 2: Extrair e reinstalar
    const spinner2 = ora({
      text: `${logger.stepIndicator(2, totalSteps)} Instalando arquivos...`,
      color: 'cyan',
    }).start();

    const extractDir = extractTarball(tarballPath);
    tmpFiles.push(extractDir);

    const installer = getInstaller(update.type);

    const installManifest: ArtifactManifest = {
      name: update.name,
      scope: update.scope,
      version: update.latestVersion,
      type: update.type as ArtifactManifest['type'],
      description: '',
      toolTargets: [tool],
      files: [],
      install: {},
    };

    // Remove versao antiga antes de instalar a nova
    await installer.uninstall(installManifest, process.cwd(), tool);

    // Instala a nova versao
    const result = await installer.install(installManifest, extractDir, process.cwd(), tool);

    if (!result.success) {
      spinner2.fail(
        `${logger.stepIndicator(2, totalSteps)} Falha na instalacao`,
      );
      if (result.message) {
        logger.error(result.message);
      }
      return false;
    }

    spinner2.succeed(
      `${logger.stepIndicator(2, totalSteps)} Arquivos instalados em ${chalk.gray(result.installedPath)}`,
    );

    // Passo 3: Atualizar manifesto
    const spinner3 = ora({
      text: `${logger.stepIndicator(3, totalSteps)} Atualizando aitk.json...`,
      color: 'cyan',
    }).start();

    let projectManifest = readManifest();
    if (projectManifest) {
      const artifactSlug = `${update.scope}/${update.name}`;
      const versionRange = `^${update.latestVersion}`;
      projectManifest = addArtifactToManifest(
        projectManifest,
        artifactSlug,
        versionRange,
        update.isDev,
      );
      writeManifest(projectManifest);
    }

    spinner3.succeed(
      `${logger.stepIndicator(3, totalSteps)} Manifesto atualizado`,
    );

    // Passo 4: Verificacao
    const spinner4 = ora({
      text: `${logger.stepIndicator(4, totalSteps)} Verificando...`,
      color: 'cyan',
    }).start();

    if (existsSync(result.installedPath)) {
      spinner4.succeed(
        `${logger.stepIndicator(4, totalSteps)} ${chalk.cyan(fullName)} atualizado: ${chalk.gray(update.currentVersion)} ${chalk.white('->')} ${chalk.green.bold(update.latestVersion)}`,
      );
    } else {
      spinner4.warn(
        `${logger.stepIndicator(4, totalSteps)} Diretorio de instalacao nao encontrado`,
      );
    }

    return true;
  } catch (error) {
    logger.error(
      `Erro ao atualizar ${fullName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    );
    return false;
  } finally {
    cleanup(...tmpFiles);
  }
}

export const updateCommand = new Command('update')
  .description('Atualizar artefatos instalados para a versao mais recente')
  .argument('[artifact]', 'Artefato no formato scope/nome (opcional — atualiza todos se omitido)')
  .option('--tool <tool>', 'Ferramenta alvo (padrao: lido do manifesto)')
  .action(async (artifact?: string, options?: { tool?: string }) => {
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

      const tool = (options?.tool || manifest.tool || 'claude-code') as ToolTarget;

      logger.blank();

      // Se um artefato especifico foi fornecido, atualiza apenas ele
      if (artifact) {
        const parsed = parseArtifactArg(artifact);
        if (!parsed) {
          logger.error('Formato invalido. Use: scope/nome');
          logger.print(chalk.gray(`  Exemplo: ${chalk.cyan('aitk update official/code-review')}`));
          logger.blank();
          return;
        }

        const slug = `${parsed.scope}/${parsed.name}`;
        const currentRange = manifest.artifacts[slug] || manifest.devArtifacts?.[slug];

        if (!currentRange) {
          logger.error(`Artefato ${chalk.cyan(slug)} nao esta instalado.`);
          logger.print(
            chalk.gray(`  Use ${chalk.cyan('aitk list')} para ver artefatos instalados.`),
          );
          logger.blank();
          return;
        }

        const isDev = !manifest.artifacts[slug];
        logger.print(`  ${chalk.white.bold('Verificando atualizacao para')} ${chalk.cyan.bold(slug)}...`);
        logger.blank();

        // Consulta a API para verificar a versao mais recente
        const spinner = ora({
          text: 'Consultando registry...',
          color: 'cyan',
        }).start();

        const client = createApiClient();
        const response = await client.getArtifact(parsed.scope, parsed.name);
        const artifactData = response.data;
        const currentVersion = extractVersion(currentRange);

        if (!artifactData.latestVersion || artifactData.latestVersion === currentVersion) {
          spinner.succeed(
            `${chalk.cyan(slug)} ja esta na versao mais recente ${chalk.green(`v${currentVersion}`)}`,
          );
          logger.blank();
          return;
        }

        spinner.succeed(
          `Atualizacao disponivel: ${chalk.gray(currentVersion)} ${chalk.white('->')} ${chalk.green.bold(artifactData.latestVersion)}`,
        );
        logger.blank();

        // Executa a atualizacao
        const success = await updateSingleArtifact(
          {
            scope: parsed.scope,
            name: parsed.name,
            currentVersion,
            latestVersion: artifactData.latestVersion,
            type: artifactData.type,
            isDev,
          },
          tool,
        );

        if (success) {
          logger.blank();
          logger.success(`${slug} atualizado com sucesso!`);
        }
        logger.blank();
        return;
      }

      // Atualizar todos os artefatos
      logger.print(`  ${chalk.white.bold('Verificando atualizacoes...')}`);
      logger.blank();

      const spinner = ora({
        text: 'Consultando registry...',
        color: 'cyan',
      }).start();

      // Verifica atualizacoes para artifacts e devArtifacts
      const prodUpdates = await checkUpdates(manifest.artifacts, false);
      const devUpdates = await checkUpdates(manifest.devArtifacts || {}, true);
      const allUpdates = [...prodUpdates, ...devUpdates];

      if (allUpdates.length === 0) {
        spinner.succeed(chalk.green('Todos os artefatos estao atualizados!'));
        logger.blank();
        return;
      }

      spinner.succeed(
        `${chalk.yellow(String(allUpdates.length))} atualizacao(oes) disponivel(is)`,
      );
      logger.blank();

      // Mostra quais serao atualizados
      for (const update of allUpdates) {
        logger.print(
          `  ${chalk.cyan(`${update.scope}/${update.name}`)} ${chalk.gray(update.currentVersion)} ${chalk.white('->')} ${chalk.green.bold(update.latestVersion)}`,
        );
      }
      logger.blank();

      // Executa as atualizacoes
      let successCount = 0;
      let failCount = 0;

      for (const update of allUpdates) {
        logger.print(chalk.gray(`  ── ${update.scope}/${update.name} ${'─'.repeat(30)}`));
        logger.blank();

        const success = await updateSingleArtifact(update, tool);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        logger.blank();
      }

      // Resumo final
      const summaryBox = logger.box([
        chalk.white.bold('Resumo da atualizacao'),
        '',
        `${chalk.green(`${successCount} atualizado(s)`)}${failCount > 0 ? chalk.red(` | ${failCount} falha(s)`) : ''}`,
        '',
        chalk.gray(`Use ${chalk.cyan('aitk status')} para verificar o estado atual.`),
      ]);
      logger.print(summaryBox);
      logger.blank();
    } catch (error) {
      logger.blank();
      logger.error('Erro ao atualizar artefatos');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    }
  });
