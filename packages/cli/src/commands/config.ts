import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, saveConfig, type CliConfig } from '../core/config.js';
import { logger } from '../utils/logger.js';

/** Chaves configuráveis e suas descrições */
const CONFIG_KEYS: Record<string, string> = {
  registry: 'URL do registry (ex: https://ai-toolkit-henna.vercel.app)',
  defaultScope: 'Scope padrão para publicação',
  defaultTool: 'Ferramenta alvo padrão (claude-code, opencode, gemini-cli)',
  cacheDir: 'Diretório do cache local',
  cacheMaxSize: 'Tamanho máximo do cache (ex: 500MB)',
  'source.ttl': 'TTL em segundos para sincronização automática de fontes Git (padrão: 3600)',
};

export const configCommand = new Command('config')
  .description('Gerenciar configuração do CLI');

// ── config list ───────────────────────────────────────────────────────────
configCommand
  .command('list')
  .alias('ls')
  .description('Listar todas as configurações')
  .action(() => {
    const config = getConfig();

    logger.blank();
    logger.print(`  ${chalk.white.bold('Configuração do AITK')}`);
    logger.blank();

    const rows: string[][] = [];
    for (const [key, desc] of Object.entries(CONFIG_KEYS)) {
      const value = config[key as keyof CliConfig];
      rows.push([
        chalk.cyan.bold(key),
        chalk.white(String(value || '—')),
        chalk.gray(desc),
      ]);
    }

    logger.print(logger.table({
      columns: [
        { header: 'Chave', width: 16 },
        { header: 'Valor', width: 35 },
        { header: 'Descrição', width: 40 },
      ],
      rows,
    }));

    logger.blank();
  });

// ── config get ────────────────────────────────────────────────────────────
configCommand
  .command('get')
  .description('Obter valor de uma configuração')
  .argument('<key>', 'Chave da configuração')
  .action((key: string) => {
    if (!(key in CONFIG_KEYS)) {
      logger.error(`Chave desconhecida: ${chalk.white(key)}`);
      logger.print(chalk.gray(`  Chaves disponíveis: ${Object.keys(CONFIG_KEYS).join(', ')}`));
      return;
    }

    const config = getConfig();
    const value = ((config as unknown) as Record<string, unknown>)[key];
    logger.print(String(value || ''));
  });

// ── config set ────────────────────────────────────────────────────────────
configCommand
  .command('set')
  .description('Definir valor de uma configuração')
  .argument('<key>', 'Chave da configuração')
  .argument('<value>', 'Novo valor')
  .action((key: string, value: string) => {
    if (!(key in CONFIG_KEYS)) {
      logger.error(`Chave desconhecida: ${chalk.white(key)}`);
      logger.print(chalk.gray(`  Chaves disponíveis: ${Object.keys(CONFIG_KEYS).join(', ')}`));
      return;
    }

    const config = getConfig();
    const oldValue = ((config as unknown) as Record<string, unknown>)[key];

    saveConfig({ [key]: value } as Partial<CliConfig>);

    logger.blank();
    logger.success(`${chalk.cyan(key)} atualizado`);
    logger.print(`  ${chalk.gray('Anterior:')} ${chalk.gray(String(oldValue || '—'))}`);
    logger.print(`  ${chalk.gray('Novo:')}     ${chalk.white(value)}`);
    logger.blank();
  });

// ── config reset ──────────────────────────────────────────────────────────
configCommand
  .command('reset')
  .description('Restaurar configuração padrão')
  .argument('[key]', 'Chave específica para resetar (opcional, reseta todas se omitido)')
  .action((key?: string) => {
    // Importar default config
    const defaults: CliConfig = {
      registry: 'https://ai-toolkit-henna.vercel.app',
      defaultTool: 'claude-code',
      cacheDir: '',
      cacheMaxSize: '500MB',
    };

    if (key) {
      if (!(key in CONFIG_KEYS)) {
        logger.error(`Chave desconhecida: ${chalk.white(key)}`);
        return;
      }

      const defaultValue = defaults[key as keyof CliConfig];
      saveConfig({ [key]: defaultValue });
      logger.success(`${chalk.cyan(key)} restaurado para: ${chalk.white(String(defaultValue || '—'))}`);
    } else {
      saveConfig(defaults);
      logger.success('Todas as configurações restauradas para o padrão');
    }

    logger.blank();
  });
