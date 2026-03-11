import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import type { ArtifactManifest, ToolTarget } from '@tarcisiojunior/shared';
import { createApiClient } from '../core/api-client.js';
import {
  readManifest,
  writeManifest,
  createDefaultManifest,
  addArtifactToManifest,
} from '../core/manifest.js';
import { SkillInstaller } from '../installers/skill-installer.js';
import { McpInstaller } from '../installers/mcp-installer.js';
import { ConfigInstaller } from '../installers/config-installer.js';
import { HookInstaller } from '../installers/hook-installer.js';
import { TemplateInstaller } from '../installers/template-installer.js';
import { BaseInstaller } from '../installers/base-installer.js';
import { logger } from '../utils/logger.js';

/** Parseia o argumento no formato scope/name[@version] */
function parseArtifactArg(artifact: string): {
  scope: string;
  name: string;
  version?: string;
} | null {
  const match = artifact.match(/^([^/]+)\/([^@]+)(?:@(.+))?$/);
  if (!match) return null;

  const [, scope, name, version] = match;
  return { scope, name, version };
}

/** Retorna o instalador adequado para o tipo do artefato */
function getInstaller(type: string): BaseInstaller {
  // Mapa de instaladores por tipo de artefato
  const installers: Record<string, BaseInstaller> = {
    skill: new SkillInstaller(),
    mcp: new McpInstaller(),
    config: new ConfigInstaller(),
    hook: new HookInstaller(),
    template: new TemplateInstaller(),
  };

  const installer = installers[type];
  if (!installer) {
    throw new Error(
      `Tipo de artefato "${type}" ainda não possui instalador.\n` +
      `Tipos suportados: ${Object.keys(installers).join(', ')}`,
    );
  }

  return installer;
}

/** Formata bytes para exibição legível */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extrai um tarball para um diretório temporário */
function extractTarball(tarballPath: string): string {
  const extractDir = join(tmpdir(), `aitk-install-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });

  execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`, {
    stdio: 'pipe',
  });

  return extractDir;
}

/** Limpa arquivos temporários */
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

export const installCommand = new Command('install')
  .description('Instalar um artefato')
  .argument('<artifact>', 'Artefato no formato scope/nome[@versao]')
  .option('--save-dev', 'Salvar como dependencia de desenvolvimento')
  .option('--tool <tool>', 'Ferramenta alvo (padrao: claude-code)')
  .action(async (artifact: string, options: { saveDev?: boolean; tool?: string }) => {
    // Parsear scope/name@version
    const parsed = parseArtifactArg(artifact);
    if (!parsed) {
      logger.blank();
      logger.error('Formato invalido. Use: scope/nome[@versao]');
      logger.print(chalk.gray(`  Exemplo: ${chalk.cyan('aitk install official/code-review@1.0.0')}`));
      logger.blank();
      return;
    }

    const { scope, name, version: requestedVersion } = parsed;
    const tool = (options.tool || 'claude-code') as ToolTarget;
    const fullName = `${scope}/${name}`;
    const versionTag = requestedVersion || 'latest';

    logger.blank();
    logger.print(`  ${chalk.white.bold('Instalando')} ${chalk.cyan.bold(fullName)}${chalk.gray(`@${versionTag}`)}`);
    logger.print(chalk.gray(`  Ferramenta alvo: ${tool}`));
    logger.blank();

    const totalSteps = 5;
    const tmpFiles: string[] = [];

    try {
      // ── Passo 1: Buscar artefato e resolver versão ────────────────
      const spinner1 = ora({
        text: `${logger.stepIndicator(1, totalSteps)} Resolvendo versao...`,
        color: 'cyan',
      }).start();

      const client = createApiClient();

      // Busca detalhes do artefato
      const artifactResponse = await client.getArtifact(scope, name);
      const artifactData = artifactResponse.data;

      // Resolve a versão (latest ou específica)
      let resolvedVersion: string;

      if (requestedVersion) {
        // Versão específica solicitada — verifica se existe
        const versionsResponse = await client.getVersions(scope, name);
        const found = versionsResponse.data.find((v) => v.version === requestedVersion);
        if (!found) {
          spinner1.fail(
            `${logger.stepIndicator(1, totalSteps)} Versão ${chalk.red(requestedVersion)} não encontrada`,
          );
          logger.blank();

          // Lista versões disponíveis para ajudar o usuário
          if (versionsResponse.data.length > 0) {
            logger.print(chalk.gray('  Versões disponíveis:'));
            for (const v of versionsResponse.data.slice(0, 5)) {
              logger.print(`    ${chalk.cyan(v.version)} ${chalk.gray(`(${new Date(v.publishedAt).toLocaleDateString('pt-BR')})`)}`);
            }
          }

          logger.blank();
          return;
        }
        resolvedVersion = requestedVersion;
      } else {
        // Usa a versão latest do artefato
        if (!artifactData.latestVersion) {
          spinner1.fail(
            `${logger.stepIndicator(1, totalSteps)} Artefato não possui nenhuma versão publicada`,
          );
          logger.blank();
          return;
        }
        resolvedVersion = artifactData.latestVersion;
      }

      spinner1.succeed(
        `${logger.stepIndicator(1, totalSteps)} Versão resolvida: ${chalk.green.bold(`v${resolvedVersion}`)} ${chalk.gray(`(${artifactData.type})`)}`,
      );

      // ── Passo 2: Baixar artefato ──────────────────────────────────
      const spinner2 = ora({
        text: `${logger.stepIndicator(2, totalSteps)} Baixando artefato...`,
        color: 'cyan',
      }).start();

      const { buffer, size } = await client.downloadVersion(scope, name, resolvedVersion);

      // Salva o tarball em diretório temporário
      const tmpDir = join(tmpdir(), `aitk-dl-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      tmpFiles.push(tmpDir);

      const tarballPath = join(tmpDir, `${scope}-${name}-${resolvedVersion}.tgz`);
      writeFileSync(tarballPath, Buffer.from(buffer));

      spinner2.succeed(
        `${logger.stepIndicator(2, totalSteps)} Download completo ${chalk.gray(`(${formatBytes(size)})`)}`,
      );

      // ── Passo 3: Extrair e instalar arquivos ──────────────────────
      const spinner3 = ora({
        text: `${logger.stepIndicator(3, totalSteps)} Instalando arquivos...`,
        color: 'cyan',
      }).start();

      // Extrai o tarball
      const extractDir = extractTarball(tarballPath);
      tmpFiles.push(extractDir);

      // Obtém o instalador adequado para o tipo
      const installer = getInstaller(artifactData.type);

      // Monta o manifesto necessário para o instalador
      const installManifest: ArtifactManifest = {
        name: artifactData.name,
        scope: artifactData.scope,
        version: resolvedVersion,
        type: artifactData.type,
        description: artifactData.description,
        keywords: artifactData.keywords,
        categories: artifactData.categories,
        license: artifactData.license,
        repository: artifactData.repository,
        toolTargets: artifactData.toolTargets,
        files: [],
        install: {},
      };

      // Executa a instalação
      const projectRoot = process.cwd();
      const result = await installer.install(installManifest, extractDir, projectRoot, tool);

      if (!result.success) {
        spinner3.fail(
          `${logger.stepIndicator(3, totalSteps)} Falha na instalação`,
        );
        if (result.message) {
          logger.error(result.message);
        }
        logger.blank();
        return;
      }

      spinner3.succeed(
        `${logger.stepIndicator(3, totalSteps)} Arquivos instalados em ${chalk.gray(result.installedPath)}`,
      );

      // ── Passo 4: Atualizar manifesto do projeto ───────────────────
      const spinner4 = ora({
        text: `${logger.stepIndicator(4, totalSteps)} Atualizando aitk.json...`,
        color: 'cyan',
      }).start();

      // Lê ou cria o manifesto do projeto
      let projectManifest = readManifest();
      if (!projectManifest) {
        projectManifest = createDefaultManifest(tool);
      }

      // Adiciona o artefato ao manifesto
      const artifactSlug = `${scope}/${name}`;
      const versionRange = `^${resolvedVersion}`;
      projectManifest = addArtifactToManifest(
        projectManifest,
        artifactSlug,
        versionRange,
        options.saveDev || false,
      );

      // Salva o manifesto atualizado
      writeManifest(projectManifest);

      spinner4.succeed(
        `${logger.stepIndicator(4, totalSteps)} Manifesto atualizado ${chalk.gray(`(${options.saveDev ? 'devArtifacts' : 'artifacts'})`)}`,
      );

      // ── Passo 5: Verificação final ────────────────────────────────
      const spinner5 = ora({
        text: `${logger.stepIndicator(5, totalSteps)} Verificando instalação...`,
        color: 'cyan',
      }).start();

      // Verifica se os arquivos foram instalados corretamente
      if (existsSync(result.installedPath)) {
        spinner5.succeed(
          `${logger.stepIndicator(5, totalSteps)} Instalação verificada`,
        );
      } else {
        spinner5.warn(
          `${logger.stepIndicator(5, totalSteps)} Diretório de instalação não encontrado`,
        );
      }

      // ── Árvore de arquivos instalados ─────────────────────────────
      logger.blank();
      const treeFiles = result.filesInstalled.length > 0
        ? result.filesInstalled
        : ['(nenhum arquivo listado)'];
      const tree = logger.fileTree(
        treeFiles,
        `  ${chalk.gray('Arquivos instalados:')}`,
      );
      logger.print('  ' + tree.split('\n').join('\n  '));

      // ── Mensagem de sucesso ───────────────────────────────────────
      logger.blank();
      const successBox = logger.box([
        chalk.green.bold('Instalação concluída!'),
        '',
        `${chalk.gray('Artefato:')}   ${chalk.cyan.bold(fullName)}@${resolvedVersion}`,
        `${chalk.gray('Tipo:')}       ${logger.typeBadge(artifactData.type)}`,
        `${chalk.gray('Ferramenta:')} ${chalk.white(tool)}`,
        `${chalk.gray('Local:')}      ${chalk.gray(result.installedPath)}`,
        '',
        chalk.gray(`Use ${chalk.cyan('aitk list')} para ver artefatos instalados.`),
      ]);
      logger.print(successBox);
      logger.blank();
    } catch (error) {
      logger.blank();
      logger.error('Erro ao instalar artefato');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    } finally {
      // Limpa arquivos temporários
      cleanup(...tmpFiles);
    }
  });
