/**
 * Comando `aitk create` — scaffolding para criação de artefatos.
 * Suporta modo interativo e via flags.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import type { ArtifactType, ToolTarget, CreateOptions } from '@tarcisiojunior/shared';
import { getTemplateFiles } from '../templates/index.js';
import { logger } from '../utils/logger.js';

/** Tipos válidos para criação */
const VALID_TYPES: ArtifactType[] = ['skill', 'mcp', 'config', 'hook', 'template'];
const VALID_FORMATS = ['aitk', 'marketplace', 'dual'];

/** Faz uma pergunta no terminal e retorna a resposta */
function askQuestion(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = defaultValue
    ? `  ${question} ${chalk.gray(`(${defaultValue})`)}: `
    : `  ${question}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/** Faz uma pergunta com opções numeradas */
async function askChoice(question: string, choices: string[]): Promise<string> {
  logger.print(`  ${question}`);
  for (let i = 0; i < choices.length; i++) {
    logger.print(`    ${chalk.cyan(`${i + 1})`)} ${choices[i]}`);
  }

  const answer = await askQuestion('Escolha');
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < choices.length) {
    return choices[index];
  }

  // Tenta match por nome
  const match = choices.find((c) => c.toLowerCase() === answer.toLowerCase());
  return match || choices[0];
}

/** Valida o nome do artefato */
function validateName(name: string): string | null {
  if (!name) return 'Nome é obrigatório';
  if (name.length < 2) return 'Nome deve ter pelo menos 2 caracteres';
  if (name.length > 64) return 'Nome deve ter no máximo 64 caracteres';
  if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(name)) {
    return 'Nome deve conter apenas letras minúsculas, números, pontos, hífens e underscores';
  }
  return null;
}

export const createCommand = new Command('create')
  .description('Criar um novo artefato com scaffolding')
  .argument('[type]', 'Tipo do artefato (skill, mcp, config, hook, template)')
  .option('--name <name>', 'Nome do artefato')
  .option('--scope <scope>', 'Escopo/autor do artefato')
  .option('--description <desc>', 'Descrição do artefato')
  .option('--tool <tool>', 'Ferramenta alvo (padrão: claude-code)')
  .option('--format <format>', 'Formato de saída: aitk, marketplace, dual (padrão: dual para skills)')
  .option('--dir <dir>', 'Diretório de saída customizado')
  .action(async (
    typeArg: string | undefined,
    options: {
      name?: string;
      scope?: string;
      description?: string;
      tool?: string;
      format?: string;
      dir?: string;
    },
  ) => {
    logger.blank();
    logger.print(chalk.white.bold('  Criar novo artefato'));
    logger.blank();

    try {
      // ── Resolver tipo ─────────────────────────────────────────────
      let type: ArtifactType;
      if (typeArg && VALID_TYPES.includes(typeArg as ArtifactType)) {
        type = typeArg as ArtifactType;
      } else if (typeArg) {
        logger.error(`Tipo inválido: "${typeArg}". Tipos válidos: ${VALID_TYPES.join(', ')}`);
        logger.blank();
        return;
      } else {
        const chosen = await askChoice('Tipo do artefato:', VALID_TYPES);
        type = chosen as ArtifactType;
      }

      // ── Resolver nome ─────────────────────────────────────────────
      let name = options.name;
      if (!name) {
        name = await askQuestion('Nome do artefato (ex: code-review)');
        if (!name) {
          logger.error('Nome é obrigatório.');
          return;
        }
      }

      const nameError = validateName(name);
      if (nameError) {
        logger.error(nameError);
        return;
      }

      // ── Resolver escopo ───────────────────────────────────────────
      let scope = options.scope;
      if (!scope) {
        scope = await askQuestion('Escopo/autor (ex: meu-user)');
        if (!scope) {
          logger.error('Escopo é obrigatório.');
          return;
        }
      }

      // ── Resolver descrição ────────────────────────────────────────
      let description = options.description;
      if (!description) {
        description = await askQuestion('Descrição', `Artefato ${name}`);
      }

      // ── Resolver ferramenta alvo ──────────────────────────────────
      const toolTarget = (options.tool || 'claude-code') as ToolTarget;

      // ── Resolver formato ──────────────────────────────────────────
      let format = options.format || (type === 'skill' ? 'dual' : 'aitk');
      if (!VALID_FORMATS.includes(format)) {
        logger.warn(`Formato inválido: "${format}". Usando "dual".`);
        format = 'dual';
      }

      // ── Resolver diretório de saída ───────────────────────────────
      const outputDir = options.dir
        ? resolve(options.dir)
        : resolve(process.cwd(), name);

      // Verificar se diretório já existe
      if (existsSync(outputDir)) {
        logger.error(`Diretório já existe: ${outputDir}`);
        logger.print(chalk.gray('  Use outro nome ou remova o diretório existente.'));
        logger.blank();
        return;
      }

      // ── Gerar arquivos ────────────────────────────────────────────
      const createOptions: CreateOptions = {
        type,
        name,
        scope,
        description,
        toolTarget,
        format: format as 'aitk' | 'marketplace' | 'dual',
      };

      const files = getTemplateFiles(createOptions);

      // Criar diretório e arquivos
      mkdirSync(outputDir, { recursive: true });

      const createdFiles: string[] = [];
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = join(outputDir, filePath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, 'utf-8');
        createdFiles.push(filePath);
      }

      // ── Exibir resultado ──────────────────────────────────────────
      const tree = logger.fileTree(createdFiles, `  ${chalk.gray('Arquivos criados:')}`);
      logger.print('  ' + tree.split('\n').join('\n  '));

      logger.blank();
      const successBox = logger.box([
        chalk.green.bold('Artefato criado com sucesso!'),
        '',
        `${chalk.gray('Nome:')}      ${chalk.cyan.bold(`${scope}/${name}`)}`,
        `${chalk.gray('Tipo:')}      ${logger.typeBadge(type)}`,
        `${chalk.gray('Formato:')}   ${chalk.white(format)}`,
        `${chalk.gray('Diretório:')} ${chalk.gray(outputDir)}`,
        '',
        chalk.gray('Próximos passos:'),
        chalk.gray(`  1. Edite os arquivos em ${chalk.cyan(name + '/')}`),
        chalk.gray(`  2. Publique com ${chalk.cyan(`aitk publish`)}`),
      ]);
      logger.print(successBox);
      logger.blank();
    } catch (error) {
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });
