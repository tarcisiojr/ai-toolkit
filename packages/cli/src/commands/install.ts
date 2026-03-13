import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
import { SourceResolver } from '../core/source-resolver.js';
import { getSourceCacheDir, checkoutDirectory, readSourcesManifest } from '../core/git-source.js';
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

/** Verifica se é referência a repo Git (prefixo github:) */
function isGithubPrefix(artifact: string): boolean {
  return artifact.startsWith('github:');
}

/** Retorna o instalador adequado para o tipo do artefato */
function getInstaller(type: string): BaseInstaller {
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

/** Copia arquivos de um diretório para outro recursivamente */
function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    if (entry.startsWith('.git')) continue;
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
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

/** Instala artefato de fonte Git (local, do cache sparse checkout) */
async function installFromGitSource(
  manifest: ArtifactManifest,
  sourcePath: string,
  skillName: string,
  tool: ToolTarget,
  saveDev: boolean,
  cleanupFn?: () => void,
): Promise<void> {
  const totalSteps = 3;
  let activeSpinner: ReturnType<typeof ora> | null = null;

  try {
    // ── Passo 1: Preparar arquivos ─────────────────────────────────
    const spinner1 = ora({
      text: `${logger.stepIndicator(1, totalSteps)} Preparando arquivos da fonte Git...`,
      color: 'cyan',
    }).start();
    activeSpinner = spinner1;

    // Tenta fazer checkout do diretório da skill
    try {
      checkoutDirectory(sourcePath, skillName);
    } catch {
      // Pode já estar no checkout ou ser checkout completo
    }

    // Copia para diretório temporário para o instalador
    const tmpExtractDir = join(tmpdir(), `aitk-git-install-${Date.now()}`);

    // Encontra o diretório da skill dentro do repo
    const possibleDirs = [
      join(sourcePath, skillName),
      join(sourcePath, 'skills', skillName),
      sourcePath,
    ];

    let skillDir = sourcePath;
    for (const dir of possibleDirs) {
      if (existsSync(dir) && existsSync(join(dir, 'SKILL.md'))) {
        skillDir = dir;
        break;
      }
    }

    copyDirRecursive(skillDir, tmpExtractDir);

    spinner1.succeed(
      `${logger.stepIndicator(1, totalSteps)} Arquivos preparados`,
    );
    activeSpinner = null;

    // ── Passo 2: Instalar ──────────────────────────────────────────
    const spinner2 = ora({
      text: `${logger.stepIndicator(2, totalSteps)} Instalando arquivos...`,
      color: 'cyan',
    }).start();
    activeSpinner = spinner2;

    const installer = getInstaller(manifest.type);
    const projectRoot = process.cwd();
    const result = await installer.install(manifest, tmpExtractDir, projectRoot, tool);

    if (!result.success) {
      spinner2.fail(`${logger.stepIndicator(2, totalSteps)} Falha na instalação`);
      if (result.message) logger.error(result.message);
      cleanup(tmpExtractDir);
      return;
    }

    spinner2.succeed(
      `${logger.stepIndicator(2, totalSteps)} Arquivos instalados em ${chalk.gray(result.installedPath)}`,
    );
    activeSpinner = null;

    // ── Passo 3: Atualizar manifesto ───────────────────────────────
    const spinner3 = ora({
      text: `${logger.stepIndicator(3, totalSteps)} Atualizando aitk.json...`,
      color: 'cyan',
    }).start();
    activeSpinner = spinner3;

    let projectManifest = readManifest();
    if (!projectManifest) {
      projectManifest = createDefaultManifest(tool);
    }

    const artifactSlug = `${manifest.scope}/${manifest.name}`;
    const versionRange = manifest.version !== '0.0.0' ? `^${manifest.version}` : '*';
    projectManifest = addArtifactToManifest(projectManifest, artifactSlug, versionRange, saveDev);
    writeManifest(projectManifest);

    spinner3.succeed(
      `${logger.stepIndicator(3, totalSteps)} Manifesto atualizado`,
    );
    activeSpinner = null;

    // ── Mensagem de sucesso ────────────────────────────────────────
    logger.blank();
    const treeFiles = result.filesInstalled.length > 0
      ? result.filesInstalled
      : ['(nenhum arquivo listado)'];
    const tree = logger.fileTree(treeFiles, `  ${chalk.gray('Arquivos instalados:')}`);
    logger.print('  ' + tree.split('\n').join('\n  '));

    logger.blank();
    const successBox = logger.box([
      chalk.green.bold('Instalação concluída!'),
      '',
      `${chalk.gray('Artefato:')}   ${chalk.cyan.bold(artifactSlug)}`,
      `${chalk.gray('Tipo:')}       ${logger.typeBadge(manifest.type)}`,
      `${chalk.gray('Fonte:')}      ${chalk.magenta('Git')}`,
      `${chalk.gray('Ferramenta:')} ${chalk.white(tool)}`,
      `${chalk.gray('Local:')}      ${chalk.gray(result.installedPath)}`,
    ]);
    logger.print(successBox);
    logger.blank();

    cleanup(tmpExtractDir);
  } catch (error) {
    if (activeSpinner) activeSpinner.fail();
    logger.blank();
    logger.error('Erro ao instalar artefato de fonte Git');
    logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    logger.blank();
    process.exitCode = 1;
  } finally {
    if (cleanupFn) cleanupFn();
  }
}

export const installCommand = new Command('install')
  .description('Instalar um artefato')
  .argument('<artifact>', 'Artefato no formato scope/nome[@versao] ou github:user/repo/skill')
  .option('--save-dev', 'Salvar como dependencia de desenvolvimento')
  .option('--tool <tool>', 'Ferramenta alvo (padrao: claude-code)')
  .option('--source <source>', 'Forçar instalação de uma fonte Git específica')
  .action(async (artifact: string, options: { saveDev?: boolean; tool?: string; source?: string }) => {
    const tool = (options.tool || 'claude-code') as ToolTarget;

    // ── Instalação via prefixo github: ─────────────────────────────
    if (isGithubPrefix(artifact)) {
      logger.blank();
      logger.print(`  ${chalk.white.bold('Instalando de')} ${chalk.magenta.bold(artifact)}`);
      logger.print(chalk.gray(`  Ferramenta alvo: ${tool}`));
      logger.blank();

      const resolver = new SourceResolver();
      const result = await resolver.resolveFromGithubPrefix(artifact);

      if (!result) {
        logger.error(`Artefato não encontrado: ${artifact}`);
        logger.print(chalk.gray('  Verifique o formato: github:user/repo/skill-name'));
        logger.blank();
        return;
      }

      await installFromGitSource(
        result.artifact.manifest,
        '', // Não é necessário aqui, os arquivos já estão no tmpPath
        result.artifact.manifest.name,
        tool,
        options.saveDev || false,
        result.cleanup,
      );
      return;
    }

    // ── Parsear scope/name@version ─────────────────────────────────
    const parsed = parseArtifactArg(artifact);
    if (!parsed) {
      logger.blank();
      logger.error('Formato invalido. Use: scope/nome[@versao] ou github:user/repo/skill');
      logger.print(chalk.gray(`  Exemplo: ${chalk.cyan('aitk install official/code-review@1.0.0')}`));
      logger.print(chalk.gray(`  Exemplo: ${chalk.cyan('aitk install github:anthropics/skills/xlsx')}`));
      logger.blank();
      return;
    }

    const { scope, name, version: requestedVersion } = parsed;
    const fullName = `${scope}/${name}`;
    const versionTag = requestedVersion || 'latest';

    // ── Se --source especificado, instalar de fonte Git ────────────
    if (options.source) {
      logger.blank();
      logger.print(`  ${chalk.white.bold('Instalando')} ${chalk.cyan.bold(fullName)} ${chalk.gray(`de ${options.source}`)}`);
      logger.print(chalk.gray(`  Ferramenta alvo: ${tool}`));
      logger.blank();

      const resolver = new SourceResolver();
      const gitResult = await resolver.resolveFromGitSources(name, options.source);

      if (!gitResult) {
        logger.error(`Artefato "${name}" não encontrado na fonte "${options.source}".`);
        logger.blank();
        return;
      }

      const cacheDir = getSourceCacheDir(gitResult.source);
      await installFromGitSource(gitResult.manifest, cacheDir, name, tool, options.saveDev || false);
      return;
    }

    logger.blank();
    logger.print(`  ${chalk.white.bold('Instalando')} ${chalk.cyan.bold(fullName)}${chalk.gray(`@${versionTag}`)}`);
    logger.print(chalk.gray(`  Ferramenta alvo: ${tool}`));
    logger.blank();

    const totalSteps = 5;
    const tmpFiles: string[] = [];
    let activeSpinner: ReturnType<typeof ora> | null = null;

    try {
      // ── Passo 1: Buscar artefato e resolver versão ────────────────
      const spinner1 = ora({
        text: `${logger.stepIndicator(1, totalSteps)} Resolvendo versao...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner1;

      const client = createApiClient();

      // Busca detalhes do artefato
      let artifactData;
      try {
        const artifactResponse = await client.getArtifact(scope, name);
        artifactData = artifactResponse.data;
      } catch {
        // Registry falhou, tenta fontes Git
        spinner1.text = `${logger.stepIndicator(1, totalSteps)} Registry indisponível, buscando em fontes Git...`;

        const sourcesManifest = readSourcesManifest();
        if (sourcesManifest.sources.length > 0) {
          const resolver = new SourceResolver();
          const gitResult = await resolver.resolveFromGitSources(name);

          if (gitResult) {
            spinner1.succeed(
              `${logger.stepIndicator(1, totalSteps)} Encontrado em fonte Git: ${chalk.magenta(gitResult.source)}`,
            );
            activeSpinner = null;

            const cacheDir = getSourceCacheDir(gitResult.source);
            await installFromGitSource(gitResult.manifest, cacheDir, name, tool, options.saveDev || false);
            return;
          }
        }

        throw new Error(`Artefato "${fullName}" não encontrado no registry nem em fontes Git.`);
      }

      // Resolve a versão (latest ou específica)
      let resolvedVersion: string;

      if (requestedVersion) {
        const versionsResponse = await client.getVersions(scope, name);
        const found = versionsResponse.data.find((v) => v.version === requestedVersion);
        if (!found) {
          spinner1.fail(
            `${logger.stepIndicator(1, totalSteps)} Versão ${chalk.red(requestedVersion)} não encontrada`,
          );
          logger.blank();

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
        if (!artifactData.latestVersion) {
          const versionsResponse = await client.getVersions(scope, name);
          if (versionsResponse.data.length > 0) {
            resolvedVersion = versionsResponse.data[0].version;
          } else {
            spinner1.fail(
              `${logger.stepIndicator(1, totalSteps)} Artefato não possui nenhuma versão publicada`,
            );
            logger.blank();
            return;
          }
        } else {
          resolvedVersion = artifactData.latestVersion;
        }
      }

      spinner1.succeed(
        `${logger.stepIndicator(1, totalSteps)} Versão resolvida: ${chalk.green.bold(`v${resolvedVersion}`)} ${chalk.gray(`(${artifactData.type})`)}`,
      );
      activeSpinner = null;

      // ── Passo 2: Baixar artefato ──────────────────────────────────
      const spinner2 = ora({
        text: `${logger.stepIndicator(2, totalSteps)} Baixando artefato...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner2;

      const { buffer, size } = await client.downloadVersion(scope, name, resolvedVersion);

      const tmpDir = join(tmpdir(), `aitk-dl-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      tmpFiles.push(tmpDir);

      const tarballPath = join(tmpDir, `${scope}-${name}-${resolvedVersion}.tgz`);
      writeFileSync(tarballPath, Buffer.from(buffer));

      spinner2.succeed(
        `${logger.stepIndicator(2, totalSteps)} Download completo ${chalk.gray(`(${formatBytes(size)})`)}`,
      );
      activeSpinner = null;

      // ── Passo 3: Extrair e instalar arquivos ──────────────────────
      const spinner3 = ora({
        text: `${logger.stepIndicator(3, totalSteps)} Instalando arquivos...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner3;

      const extractDir = extractTarball(tarballPath);
      tmpFiles.push(extractDir);

      const installer = getInstaller(artifactData.type);

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
      activeSpinner = null;

      // ── Passo 4: Atualizar manifesto do projeto ───────────────────
      const spinner4 = ora({
        text: `${logger.stepIndicator(4, totalSteps)} Atualizando aitk.json...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner4;

      let projectManifest = readManifest();
      if (!projectManifest) {
        projectManifest = createDefaultManifest(tool);
      }

      const artifactSlug = `${scope}/${name}`;
      const versionRange = `^${resolvedVersion}`;
      projectManifest = addArtifactToManifest(
        projectManifest,
        artifactSlug,
        versionRange,
        options.saveDev || false,
      );

      writeManifest(projectManifest);

      spinner4.succeed(
        `${logger.stepIndicator(4, totalSteps)} Manifesto atualizado ${chalk.gray(`(${options.saveDev ? 'devArtifacts' : 'artifacts'})`)}`,
      );
      activeSpinner = null;

      // ── Passo 5: Verificação final ────────────────────────────────
      const spinner5 = ora({
        text: `${logger.stepIndicator(5, totalSteps)} Verificando instalação...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner5;

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
      if (activeSpinner) {
        activeSpinner.fail();
      }
      logger.blank();
      logger.error('Erro ao instalar artefato');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    } finally {
      cleanup(...tmpFiles);
    }
  });
