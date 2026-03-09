import { Command } from 'commander';
import chalk from 'chalk';
import { clearAuth } from '../core/auth.js';

export const logoutCommand = new Command('logout')
  .description('Remover credenciais locais')
  .action(async () => {
    clearAuth();
    console.log(chalk.green('Logout realizado com sucesso.'));
  });
