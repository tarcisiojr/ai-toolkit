import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import type { ArtifactManifest, ToolTarget } from '@ai-toolkit/shared';
import { createApiClient } from '../core/api-client.js';
import { readManifest } from '../core/manifest.js';
import {
  readLockFile,
  writeLockFile,
  createLockFile,
  addLockEntry,
  createLockEntry,
  isLocked,
} from '../core/lockfile.js';
import { SkillInstaller } from '../installers/skill-installer.js';
import { McpInstaller } from '../installers/mcp-installer.js';
import { ConfigInstaller } from '../installers/config-installer.js';
import { HookInstaller } from '../installers/hook-installer.js';
import { TemplateInstaller } from '../installers/template-installer.js';
import { BaseInstaller } from '../installers/base-installer.js';
import { logger } from '../utils/logger.js';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

/** Retorna o instalador adequado para o tipo do artefato */
function getInstaller(type: string): BaseInstaller {
  const installers: Record<string, BaseInstaller> = {
    skill: new SkillInstaller(),
    mcp: new McpInstaller(),
    config: new ConfigInstaller(),
    hook: new HookInstaller(),
    template: new TemplateInstaller(),
  };

  return installers[type] || new SkillInstaller();
}

/** Extrai um tarball para um diretório temporário */
function extractTarball(tarballPath: string): string {
  const extractDir = join(tmpdir(), `aitk-sync-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });
  execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`, { stdio: 'pipe' });
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

export const syncCommand = new Command('sync')
  .description('Sincronizar artefatos do projeto com o registry')
  .option('--force', 'Forçar reinstalação mesmo se versão já está no lock file')
  .option('--tool <tool>', 'Ferramenta alvo (padrão: claude-code)')
  .action(async (options: { force?: boolean; tool?: string }) => {
    const manifest = readManifest();
    if (!manifest) {
      logger.blank();
      logger.error('Nenhum manifesto encontrado (aitk.json)');
      logger.print(chalk.gray('  Execute aitk install <artefato> para iniciar.'));
      logger.blank();
      return;
    }

    const tool = (options.tool || manifest.tool || 'claude-code') as ToolTarget;
    const allArtifacts = {
      ...manifest.artifacts,
      ...(manifest.devArtifacts || {}),
    };

    const slugs = Object.keys(allArtifacts);

    if (slugs.length === 0) {
      logger.blank();
      logger.info('Nenhum artefato no manifesto para sincronizar.');
      logger.blank();
      return;
    }

    logger.blank();
    logger.print(`  ${chalk.white.bold('Sincronizando')} ${chalk.gray(`${slugs.length} artefato(s)`)}`);
    logger.print(chalk.gray(`  Ferramenta alvo: ${tool}`));
    logger.blank();

    let lockFile = readLockFile() || createLockFile();
    const client = createApiClient();
    let installed = 0;
    let skipped = 0;
    let failed = 0;
    const tmpFiles: string[] = [];

    for (const slug of slugs) {
      const [scope, name] = slug.split('/');
      const versionRange = allArtifacts[slug];

      // Verificar se já está no lock file com a mesma versão
      if (!options.force && isLocked(lockFile, slug, lockFile.artifacts[slug]?.resolved || '')) {
        logger.print(`  ${chalk.gray('⏭')} ${chalk.gray(slug)} ${chalk.gray('(já instalado)')}`);
        skipped++;
        continue;
      }

      const spinner = ora({
        text: `  Sincronizando ${chalk.cyan(slug)}...`,
        color: 'cyan',
      }).start();

      try {
        // Buscar detalhes e resolver versão
        const artifactResponse = await client.getArtifact(scope, name);
        const artifactData = artifactResponse.data;

        // Determinar versão a instalar
        let resolvedVersion: string;
        if (versionRange.startsWith('^') || versionRange.startsWith('~') || versionRange === 'latest' || versionRange === '*') {
          resolvedVersion = artifactData.latestVersion || '';
        } else {
          resolvedVersion = versionRange;
        }

        if (!resolvedVersion) {
          spinner.warn(`  ${chalk.yellow(slug)} — sem versão disponível`);
          failed++;
          continue;
        }

        // Verificar se lock file já tem essa versão exata
        if (!options.force && isLocked(lockFile, slug, resolvedVersion)) {
          spinner.info(`  ${chalk.gray(slug)} ${chalk.gray(`v${resolvedVersion} (já sincronizado)`)}`);
          skipped++;
          continue;
        }

        // Baixar e instalar
        const { buffer } = await client.downloadVersion(scope, name, resolvedVersion);

        const tmpDir = join(tmpdir(), `aitk-sync-dl-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tmpFiles.push(tmpDir);

        const tarballPath = join(tmpDir, `${scope}-${name}-${resolvedVersion}.tgz`);
        writeFileSync(tarballPath, Buffer.from(buffer));

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
          spinner.fail(`  ${chalk.red(slug)} — falha na instalação`);
          failed++;
          continue;
        }

        // Atualizar lock file
        // Gerar checksum simples (em produção usaria SHA256 do tarball)
        const checksum = Buffer.from(buffer).length.toString(16);
        lockFile = addLockEntry(lockFile, slug, createLockEntry(resolvedVersion, checksum));

        spinner.succeed(`  ${chalk.green(slug)} ${chalk.gray(`v${resolvedVersion}`)}`);
        installed++;
      } catch (error) {
        spinner.fail(`  ${chalk.red(slug)} — ${error instanceof Error ? error.message : 'erro'}`);
        failed++;
      }
    }

    // Salvar lock file atualizado
    writeLockFile(lockFile);

    // Relatório final
    logger.blank();
    const summaryBox = logger.box([
      chalk.white.bold('Sincronização concluída'),
      '',
      `${chalk.green('✓')} Instalados: ${chalk.green.bold(String(installed))}`,
      `${chalk.gray('⏭')} Pulados:    ${chalk.gray(String(skipped))}`,
      ...(failed > 0 ? [`${chalk.red('✗')} Falhas:     ${chalk.red.bold(String(failed))}`] : []),
    ]);
    logger.print(summaryBox);
    logger.blank();

    // Limpeza
    cleanup(...tmpFiles);
  });
