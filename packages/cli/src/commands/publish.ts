import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const publishCommand = new Command('publish')
  .description('Publicar artefato no registry')
  .option('--access <access>', 'Visibilidade: public, private, team', 'public')
  .option('--team <slug>', 'Slug da equipe (para acesso team)')
  .action(async (options: { access: string; team?: string }) => {
    const spinner = ora('Preparando publicação...').start();

    try {
      // TODO: Ler aitk-artifact.json, validar, criar tarball, upload
      spinner.info('TODO: Implementar fluxo de publicação');
      console.log(chalk.gray(`  Acesso: ${options.access}`));
      if (options.team) console.log(chalk.gray(`  Equipe: ${options.team}`));
    } catch (error) {
      spinner.fail('Erro ao publicar');
      console.error(chalk.red(error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  });
