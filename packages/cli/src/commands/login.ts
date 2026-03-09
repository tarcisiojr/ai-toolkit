import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig } from '../core/config.js';
import { logger } from '../utils/logger.js';

export const loginCommand = new Command('login')
  .description('Autenticar com o AI Toolkit registry')
  .action(async () => {
    const config = getConfig();

    logger.blank();
    logger.print(`  ${chalk.white.bold('Autenticacao — AI Toolkit Registry')}`);
    logger.blank();

    // ── Passo 1: Informar URL ─────────────────────────────────────────
    logger.print(`  ${logger.stepIndicator(1, 3)} ${chalk.gray('Conectando ao registry...')}`);
    logger.blank();

    // URL em destaque
    const urlBox = logger.box([
      chalk.gray('Abra o link abaixo no navegador para autenticar:'),
      '',
      chalk.cyan.bold.underline(`${config.registry}/auth/cli`),
      '',
      chalk.gray('O codigo de verificacao sera exibido no navegador.'),
    ]);
    logger.print(urlBox);
    logger.blank();

    // ── Passo 2: Aguardando ───────────────────────────────────────────
    logger.print(`  ${logger.stepIndicator(2, 3)} ${chalk.gray('Aguardando autenticacao...')}`);
    logger.print(chalk.yellow('  TODO: Implementar fluxo OAuth com servidor local'));
    logger.blank();

    // ── Passo 3: Sucesso (placeholder) ────────────────────────────────
    logger.print(`  ${logger.stepIndicator(3, 3)} ${chalk.gray('Finalizando...')}`);
    logger.blank();

    // Mensagem de sucesso (sera ativada quando o fluxo OAuth funcionar)
    const successBox = logger.box([
      chalk.green.bold('Login realizado com sucesso!'),
      '',
      `${chalk.gray('Usuario:')} ${chalk.white.bold('TODO')}`,
      `${chalk.gray('Registry:')} ${chalk.cyan(config.registry)}`,
      '',
      chalk.gray('Voce ja pode publicar e instalar artefatos privados.'),
    ]);
    logger.print(successBox);
    logger.blank();
  });
