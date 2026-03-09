import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { ToolTarget, ArtifactManifest } from '@ai-toolkit/shared';
import { TOOL_TARGET_INFO } from '@ai-toolkit/shared';
import { createApiClient } from '../core/api-client.js';
import { readManifest, writeManifest, createDefaultManifest } from '../core/manifest.js';
import { SkillInstaller } from '../installers/skill-installer.js';
import { McpInstaller } from '../installers/mcp-installer.js';
import { ConfigInstaller } from '../installers/config-installer.js';
import { HookInstaller } from '../installers/hook-installer.js';
import { TemplateInstaller } from '../installers/template-installer.js';
import { BaseInstaller } from '../installers/base-installer.js';
import { logger } from '../utils/logger.js';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

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

/** Detecta automaticamente a ferramenta de AI no diretório */
function detectTool(projectRoot: string): ToolTarget {
  // Verifica por diretórios de configuração conhecidos
  const detectionOrder: Array<{ dir: string; tool: ToolTarget }> = [
    { dir: '.claude', tool: 'claude-code' },
    { dir: '.opencode', tool: 'opencode' },
    { dir: '.gemini', tool: 'gemini-cli' },
    { dir: '.cursor', tool: 'cursor' },
    { dir: '.aider', tool: 'aider' },
    { dir: '.github/copilot', tool: 'copilot-cli' },
  ];

  for (const { dir, tool } of detectionOrder) {
    if (existsSync(join(projectRoot, dir))) {
      return tool;
    }
  }

  return 'claude-code';
}

export const initCommand = new Command('init')
  .description('Inicializar projeto ou aplicar um template')
  .argument('[template]', 'Template para aplicar (scope/nome[@versão])')
  .option('--tool <tool>', 'Ferramenta alvo (auto-detectado se não especificado)')
  .option('--force', 'Sobrescrever manifesto existente')
  .action(async (templateArg?: string, options?: { tool?: string; force?: boolean }) => {
    const projectRoot = process.cwd();
    const projectName = basename(projectRoot);

    // Verificar se já existe manifesto
    const existing = readManifest();
    if (existing && !options?.force && !templateArg) {
      logger.blank();
      logger.warn('Projeto já inicializado (aitk.json encontrado)');
      logger.print(chalk.gray('  Use --force para reinicializar'));
      logger.blank();
      return;
    }

    // Detectar ou usar ferramenta especificada
    const tool = (options?.tool || detectTool(projectRoot)) as ToolTarget;
    const toolInfo = TOOL_TARGET_INFO[tool];

    logger.blank();

    // ── Modo 1: Inicialização simples (sem template) ──────────────────
    if (!templateArg) {
      const spinner = ora({
        text: '  Inicializando projeto...',
        color: 'cyan',
      }).start();

      // Criar manifesto
      const manifest = createDefaultManifest(tool);
      writeManifest(manifest);

      // Criar diretório de configuração da ferramenta
      const configDir = join(projectRoot, toolInfo.configDir);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }

      spinner.succeed('  Projeto inicializado');

      // Exibir resultado
      logger.blank();
      const box = logger.box([
        chalk.green.bold('Projeto inicializado!'),
        '',
        `${chalk.gray('Projeto:')}    ${chalk.white.bold(projectName)}`,
        `${chalk.gray('Ferramenta:')} ${chalk.cyan(toolInfo.label)}`,
        `${chalk.gray('Config dir:')} ${chalk.gray(toolInfo.configDir + '/')}`,
        `${chalk.gray('Manifesto:')}  ${chalk.gray('aitk.json')}`,
        '',
        chalk.gray('Próximos passos:'),
        `  ${chalk.gray('$')} ${chalk.cyan('aitk search')} ${chalk.white('"memory"')}     ${chalk.gray('# Buscar artefatos')}`,
        `  ${chalk.gray('$')} ${chalk.cyan('aitk install')} ${chalk.white('scope/nome')}   ${chalk.gray('# Instalar artefato')}`,
        `  ${chalk.gray('$')} ${chalk.cyan('aitk list')}                    ${chalk.gray('# Ver instalados')}`,
      ]);
      logger.print(box);
      logger.blank();
      return;
    }

    // ── Modo 2: Inicialização com template ────────────────────────────
    const match = templateArg.match(/^([^/]+)\/([^@]+)(?:@(.+))?$/);
    if (!match) {
      logger.error('Formato de template inválido. Use: scope/nome[@versão]');
      logger.print(chalk.gray(`  Exemplo: ${chalk.cyan('aitk init official/starter-kit')}`));
      logger.blank();
      return;
    }

    const [, scope, name, requestedVersion] = match;
    const fullName = `${scope}/${name}`;

    logger.print(`  ${chalk.white.bold('Inicializando com template')} ${chalk.cyan.bold(fullName)}`);
    logger.print(chalk.gray(`  Ferramenta alvo: ${toolInfo.label}`));
    logger.blank();

    const tmpFiles: string[] = [];

    try {
      // Passo 1: Resolver template
      const spinner1 = ora({
        text: `  ${chalk.gray('[1/4]')} Resolvendo template...`,
        color: 'cyan',
      }).start();

      const client = createApiClient();
      const artifactResponse = await client.getArtifact(scope, name);
      const artifactData = artifactResponse.data;

      if (artifactData.type !== 'template') {
        spinner1.warn(`  ${chalk.gray('[1/4]')} ${chalk.yellow(`"${fullName}" não é um template (tipo: ${artifactData.type})`)}`);
        logger.print(chalk.gray('  Dica: Use "aitk install" para artefatos individuais.'));
        logger.blank();
        return;
      }

      const resolvedVersion = requestedVersion || artifactData.latestVersion || '';
      if (!resolvedVersion) {
        spinner1.fail(`  ${chalk.gray('[1/4]')} Template sem versão disponível`);
        logger.blank();
        return;
      }

      spinner1.succeed(`  ${chalk.gray('[1/4]')} Template encontrado: ${chalk.green(`v${resolvedVersion}`)}`);

      // Passo 2: Baixar template
      const spinner2 = ora({
        text: `  ${chalk.gray('[2/4]')} Baixando template...`,
        color: 'cyan',
      }).start();

      const { buffer } = await client.downloadVersion(scope, name, resolvedVersion);

      const tmpDir = join(tmpdir(), `aitk-init-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      tmpFiles.push(tmpDir);

      const tarballPath = join(tmpDir, `${scope}-${name}-${resolvedVersion}.tgz`);
      writeFileSync(tarballPath, Buffer.from(buffer));

      // Extrair
      const extractDir = join(tmpdir(), `aitk-init-extract-${Date.now()}`);
      mkdirSync(extractDir, { recursive: true });
      tmpFiles.push(extractDir);
      execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`, { stdio: 'pipe' });

      spinner2.succeed(`  ${chalk.gray('[2/4]')} Template baixado`);

      // Passo 3: Instalar artefatos do template
      const spinner3 = ora({
        text: `  ${chalk.gray('[3/4]')} Instalando artefatos do template...`,
        color: 'cyan',
      }).start();

      const installer = getInstaller('template');
      const installManifest: ArtifactManifest = {
        name: artifactData.name,
        scope: artifactData.scope,
        version: resolvedVersion,
        type: 'template',
        description: artifactData.description,
        keywords: artifactData.keywords,
        categories: artifactData.categories,
        license: artifactData.license,
        repository: artifactData.repository,
        toolTargets: artifactData.toolTargets,
        files: [],
        install: {},
      };

      const result = await installer.install(installManifest, extractDir, projectRoot, tool);

      if (result.success) {
        spinner3.succeed(`  ${chalk.gray('[3/4]')} ${chalk.green(`${result.filesInstalled.length} arquivo(s) instalado(s)`)}`);
      } else {
        spinner3.warn(`  ${chalk.gray('[3/4]')} Template instalado parcialmente`);
      }

      // Passo 4: Criar/atualizar manifesto
      const spinner4 = ora({
        text: `  ${chalk.gray('[4/4]')} Criando manifesto do projeto...`,
        color: 'cyan',
      }).start();

      const manifest = existing || createDefaultManifest(tool);
      writeManifest(manifest);

      spinner4.succeed(`  ${chalk.gray('[4/4]')} Manifesto criado`);

      // Mensagem de sucesso
      logger.blank();
      const box = logger.box([
        chalk.green.bold('Projeto inicializado com template!'),
        '',
        `${chalk.gray('Template:')}   ${chalk.cyan.bold(fullName)}@${resolvedVersion}`,
        `${chalk.gray('Projeto:')}    ${chalk.white.bold(projectName)}`,
        `${chalk.gray('Ferramenta:')} ${chalk.cyan(toolInfo.label)}`,
        `${chalk.gray('Arquivos:')}   ${chalk.white(String(result.filesInstalled.length))} instalados`,
        '',
        ...(result.message ? [chalk.gray(result.message), ''] : []),
        chalk.gray('Próximos passos:'),
        `  ${chalk.gray('$')} ${chalk.cyan('aitk list')}    ${chalk.gray('# Ver artefatos instalados')}`,
        `  ${chalk.gray('$')} ${chalk.cyan('aitk sync')}    ${chalk.gray('# Sincronizar com registry')}`,
      ]);
      logger.print(box);
      logger.blank();
    } catch (error) {
      logger.blank();
      logger.error('Erro ao inicializar com template');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    } finally {
      cleanup(...tmpFiles);
    }
  });
