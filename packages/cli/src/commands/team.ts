import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../core/api-client.js';
import { getAuth } from '../core/auth.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse, Team, TeamMember } from '@tarcisiojunior/shared';

/** Resposta do endpoint de teams do usuário */
interface TeamMembershipResponse {
  role: string;
  joined_at: string;
  teams: Team;
}

/** Resposta detalhada da equipe */
interface TeamDetailResponse extends Team {
  members: Array<TeamMember & { profiles: { username: string; display_name?: string; avatar_url?: string } }>;
  artifacts: Array<{ id: string; scope: string; name: string; type: string; description: string; total_downloads: number; latest_version: string }>;
}

/** Badge de role colorido */
function roleBadge(role: string): string {
  switch (role) {
    case 'owner': return chalk.bgYellow.black.bold(' OWNER ');
    case 'admin': return chalk.bgCyan.black.bold(' ADMIN ');
    case 'member': return chalk.bgGray.white(' MEMBER ');
    default: return chalk.gray(role);
  }
}

export const teamCommand = new Command('team')
  .description('Gerenciar equipes');

// ── team list ─────────────────────────────────────────────────────────────
teamCommand
  .command('list')
  .description('Listar suas equipes')
  .action(async () => {
    const auth = getAuth();
    if (!auth) {
      logger.error('Voce precisa estar autenticado. Execute: aitk login');
      return;
    }

    const spinner = ora({ text: 'Buscando equipes...', color: 'cyan' }).start();

    try {
      const client = createApiClient();
      const response = await client.request<ApiResponse<TeamMembershipResponse[]>>('/teams');
      const teams = response.data;

      spinner.stop();
      logger.blank();

      if (!teams || teams.length === 0) {
        logger.print(`  ${chalk.gray('Voce nao participa de nenhuma equipe.')}`);
        logger.blank();
        logger.print(`  ${chalk.gray('Crie uma com:')} ${chalk.cyan('aitk team create <slug> <nome>')}`);
        logger.blank();
        return;
      }

      logger.print(`  ${chalk.white.bold('Suas equipes')} ${chalk.gray(`(${teams.length})`)}`);
      logger.blank();

      const rows = teams.map((t) => [
        chalk.cyan.bold(t.teams.slug),
        chalk.white(t.teams.name),
        roleBadge(t.role),
        chalk.gray(new Date(t.joined_at).toLocaleDateString('pt-BR')),
      ]);

      logger.print(logger.table({
        columns: [
          { header: 'Slug', width: 20 },
          { header: 'Nome', width: 25 },
          { header: 'Role', width: 10 },
          { header: 'Desde', width: 12 },
        ],
        rows,
      }));

      logger.blank();
    } catch (error) {
      spinner.fail('Erro ao buscar equipes');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

// ── team create ───────────────────────────────────────────────────────────
teamCommand
  .command('create')
  .description('Criar nova equipe')
  .argument('<slug>', 'Identificador unico (ex: minha-equipe)')
  .argument('<name>', 'Nome da equipe')
  .option('-d, --description <desc>', 'Descricao da equipe')
  .action(async (slug: string, name: string, options: { description?: string }) => {
    const auth = getAuth();
    if (!auth) {
      logger.error('Voce precisa estar autenticado. Execute: aitk login');
      return;
    }

    const spinner = ora({ text: 'Criando equipe...', color: 'cyan' }).start();

    try {
      const client = createApiClient();
      const response = await client.request<ApiResponse<Team>>('/teams', {
        method: 'POST',
        body: JSON.stringify({
          slug,
          name,
          description: options.description || null,
        }),
      });

      spinner.succeed(`Equipe ${chalk.cyan.bold(slug)} criada com sucesso!`);
      logger.blank();

      const team = response.data;
      const infoBox = logger.box([
        chalk.green.bold('Equipe criada!'),
        '',
        `${chalk.gray('Slug:')}      ${chalk.cyan.bold(team.slug)}`,
        `${chalk.gray('Nome:')}      ${chalk.white(team.name)}`,
        `${chalk.gray('Descricao:')} ${chalk.gray(team.description || '—')}`,
        '',
        chalk.gray(`Use ${chalk.cyan(`aitk team invite ${slug} <username>`)} para convidar membros.`),
      ]);
      logger.print(infoBox);
      logger.blank();
    } catch (error) {
      spinner.fail('Erro ao criar equipe');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

// ── team info ─────────────────────────────────────────────────────────────
teamCommand
  .command('info')
  .description('Ver detalhes de uma equipe')
  .argument('<slug>', 'Slug da equipe')
  .action(async (slug: string) => {
    const spinner = ora({ text: 'Buscando detalhes...', color: 'cyan' }).start();

    try {
      const client = createApiClient();
      const response = await client.request<ApiResponse<TeamDetailResponse>>(`/teams/${slug}`);
      const team = response.data;

      spinner.stop();
      logger.blank();

      // Informacoes basicas
      logger.print(`  ${chalk.white.bold(team.name)} ${chalk.gray(`(${team.slug})`)}`);
      if (team.description) {
        logger.print(`  ${chalk.gray(team.description)}`);
      }
      logger.blank();

      // Membros
      logger.print(`  ${chalk.yellow.bold('MEMBROS')} ${chalk.gray(`(${team.members.length})`)}`);
      for (const member of team.members) {
        const profile = member.profiles;
        const name = profile?.display_name || profile?.username || 'desconhecido';
        logger.print(`    ${roleBadge(member.role)} ${chalk.white(name)} ${chalk.gray(`@${profile?.username}`)}`);
      }
      logger.blank();

      // Artefatos
      if (team.artifacts.length > 0) {
        logger.print(`  ${chalk.yellow.bold('ARTEFATOS')} ${chalk.gray(`(${team.artifacts.length})`)}`);
        for (const art of team.artifacts) {
          logger.print(
            `    ${logger.typeBadge(art.type)} ${chalk.cyan.bold(`${art.scope}/${art.name}`)} ` +
            `${chalk.gray(`v${art.latest_version || '?'}`)} ` +
            `${logger.downloadsBadge(art.total_downloads)}`,
          );
        }
        logger.blank();
      }
    } catch (error) {
      spinner.fail('Erro ao buscar detalhes');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

// ── team invite ───────────────────────────────────────────────────────────
teamCommand
  .command('invite')
  .description('Convidar membro para equipe')
  .argument('<slug>', 'Slug da equipe')
  .argument('<username>', 'Username do usuario')
  .option('-r, --role <role>', 'Role do membro (member, admin)', 'member')
  .action(async (slug: string, username: string, options: { role: string }) => {
    const auth = getAuth();
    if (!auth) {
      logger.error('Voce precisa estar autenticado. Execute: aitk login');
      return;
    }

    const spinner = ora({ text: `Adicionando ${username}...`, color: 'cyan' }).start();

    try {
      const client = createApiClient();
      await client.request(`/teams/${slug}/members`, {
        method: 'POST',
        body: JSON.stringify({
          username,
          role: options.role,
        }),
      });

      spinner.succeed(`${chalk.white.bold(username)} adicionado como ${roleBadge(options.role)} na equipe ${chalk.cyan.bold(slug)}`);
      logger.blank();
    } catch (error) {
      spinner.fail('Erro ao adicionar membro');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

// ── team kick ─────────────────────────────────────────────────────────────
teamCommand
  .command('kick')
  .description('Remover membro da equipe')
  .argument('<slug>', 'Slug da equipe')
  .argument('<username>', 'Username do usuario')
  .action(async (slug: string, username: string) => {
    const auth = getAuth();
    if (!auth) {
      logger.error('Voce precisa estar autenticado. Execute: aitk login');
      return;
    }

    const spinner = ora({ text: `Removendo ${username}...`, color: 'cyan' }).start();

    try {
      const client = createApiClient();
      await client.request(`/teams/${slug}/members`, {
        method: 'DELETE',
        body: JSON.stringify({ username }),
      });

      spinner.succeed(`${chalk.white.bold(username)} removido da equipe ${chalk.cyan.bold(slug)}`);
      logger.blank();
    } catch (error) {
      spinner.fail('Erro ao remover membro');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });

// ── team delete ───────────────────────────────────────────────────────────
teamCommand
  .command('delete')
  .description('Deletar equipe')
  .argument('<slug>', 'Slug da equipe')
  .action(async (slug: string) => {
    const auth = getAuth();
    if (!auth) {
      logger.error('Voce precisa estar autenticado. Execute: aitk login');
      return;
    }

    const spinner = ora({ text: 'Deletando equipe...', color: 'cyan' }).start();

    try {
      const client = createApiClient();
      await client.request(`/teams/${slug}`, {
        method: 'DELETE',
      });

      spinner.succeed(`Equipe ${chalk.cyan.bold(slug)} deletada`);
      logger.blank();
    } catch (error) {
      spinner.fail('Erro ao deletar equipe');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  });
