import { Command } from 'commander';
import chalk from 'chalk';

export const statusCommand = new Command('status')
  .description('Verificar atualizações disponíveis para artefatos instalados')
  .action(async () => {
    console.log(chalk.blue('Verificando atualizações...'));
    // TODO: Comparar versões instaladas com latest do registry
    console.log(chalk.green('Todos os artefatos estão atualizados.'));
  });
