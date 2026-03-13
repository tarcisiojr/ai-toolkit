import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { artifactManifestSchema } from '@tarcisiojunior/shared';
import type { ArtifactManifest } from '@tarcisiojunior/shared';
import { createApiClient } from '../core/api-client.js';
import { requireAuth } from '../core/auth.js';
import { logger } from '../utils/logger.js';

/** Nome do arquivo de manifesto do artefato */
const ARTIFACT_MANIFEST_FILE = 'aitk-artifact.json';

/** Lê e valida o manifesto do artefato no diretório informado */
function readArtifactManifest(dir: string): ArtifactManifest {
  const filePath = join(dir, ARTIFACT_MANIFEST_FILE);

  if (!existsSync(filePath)) {
    throw new Error(
      `Arquivo "${ARTIFACT_MANIFEST_FILE}" não encontrado no diretório atual.\n` +
      `Execute este comando na raiz do artefato que deseja publicar.`,
    );
  }

  const content = readFileSync(filePath, 'utf-8');
  let raw: unknown;

  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error(`Erro ao parsear "${ARTIFACT_MANIFEST_FILE}": JSON inválido.`);
  }

  // Valida com Zod
  const result = artifactManifestSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Manifesto inválido:\n${errors}`);
  }

  return result.data;
}

/** Verifica se todos os arquivos listados no manifesto existem */
function validateFiles(manifest: ArtifactManifest, dir: string): void {
  const missing: string[] = [];
  for (const file of manifest.files) {
    const filePath = join(dir, file);
    if (!existsSync(filePath)) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Arquivos listados no manifesto não encontrados:\n` +
      missing.map((f) => `  - ${f}`).join('\n'),
    );
  }
}

/** Cria um tarball (.tgz) com os arquivos do artefato */
function createTarball(manifest: ArtifactManifest, dir: string): {
  tarballPath: string;
  size: number;
  checksum: string;
} {
  // Diretório temporário para o tarball
  const tmpDir = join(tmpdir(), `aitk-publish-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  const tarballName = `${manifest.scope}-${manifest.name}-${manifest.version}.tgz`;
  const tarballPath = join(tmpDir, tarballName);

  // Inclui o manifesto junto com os arquivos declarados
  const allFiles = [...manifest.files, ARTIFACT_MANIFEST_FILE];

  // Cria o tarball usando o comando tar do sistema
  const fileList = allFiles.join(' ');
  execSync(`tar -czf "${tarballPath}" ${fileList}`, {
    cwd: dir,
    stdio: 'pipe',
  });

  // Calcula checksum SHA-256
  const fileBuffer = readFileSync(tarballPath);
  const hash = createHash('sha256').update(fileBuffer).digest('hex');
  const size = statSync(tarballPath).size;

  return { tarballPath, size, checksum: `sha256-${hash}` };
}

/** Formata bytes para exibição legível */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Limpa arquivos temporários criados durante a publicação */
function cleanup(tarballPath: string): void {
  try {
    const tmpDir = join(tarballPath, '..');
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignora erros de limpeza
  }
}

export const publishCommand = new Command('publish')
  .description('Publicar artefato no registry')
  .option('--access <access>', 'Visibilidade: public, private, team', 'public')
  .option('--team <slug>', 'Slug da equipe (para acesso team)')
  .option('--dir <path>', 'Diretório do artefato (padrão: diretório atual)')
  .action(async (options: { access: string; team?: string; dir?: string }) => {
    const totalSteps = 5;
    let tarballPath: string | null = null;

    let activeSpinner: ReturnType<typeof ora> | null = null;

    try {
      // Verifica autenticação
      requireAuth();

      const dir = resolve(options.dir || process.cwd());

      logger.blank();
      logger.print(`  ${chalk.white.bold('Publicando artefato...')}`);
      logger.blank();

      // ── Passo 1: Ler e validar manifesto ────────────────────────────
      const spinner1 = ora({
        text: `${logger.stepIndicator(1, totalSteps)} Lendo manifesto...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner1;

      const manifest = readArtifactManifest(dir);
      validateFiles(manifest, dir);

      const slug = `${manifest.scope}/${manifest.name}`;

      spinner1.succeed(
        `${logger.stepIndicator(1, totalSteps)} Manifesto válido: ${chalk.cyan.bold(slug)}@${chalk.green(manifest.version)}`,
      );
      activeSpinner = null;

      // ── Passo 2: Empacotar arquivos ─────────────────────────────────
      const spinner2 = ora({
        text: `${logger.stepIndicator(2, totalSteps)} Empacotando arquivos...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner2;

      const { tarballPath: tPath, size, checksum } = createTarball(manifest, dir);
      tarballPath = tPath;

      spinner2.succeed(
        `${logger.stepIndicator(2, totalSteps)} Tarball criado ${chalk.gray(`(${formatBytes(size)}, ${checksum.slice(0, 15)}...)`)}`,
      );
      activeSpinner = null;

      // ── Passo 3: Registrar artefato (se necessário) ─────────────────
      const spinner3 = ora({
        text: `${logger.stepIndicator(3, totalSteps)} Verificando registro no registry...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner3;

      const client = createApiClient();

      try {
        // Tenta obter o artefato existente
        await client.getArtifact(manifest.scope, manifest.name);
        spinner3.succeed(
          `${logger.stepIndicator(3, totalSteps)} Artefato já registrado no registry`,
        );
      } catch {
        // Artefato não existe, cria um novo
        spinner3.text = `${logger.stepIndicator(3, totalSteps)} Criando artefato no registry...`;

        await client.createArtifact({
          scope: manifest.scope,
          name: manifest.name,
          type: manifest.type,
          description: manifest.description,
          visibility: options.access,
          keywords: manifest.keywords,
          categories: manifest.categories,
          toolTargets: manifest.toolTargets,
          repository: manifest.repository,
          license: manifest.license,
        });

        spinner3.succeed(
          `${logger.stepIndicator(3, totalSteps)} Artefato criado no registry ${chalk.gray(`(${options.access})`)}`,
        );
      }
      activeSpinner = null;

      // ── Passo 4: Enviar versão ──────────────────────────────────────
      const spinner4 = ora({
        text: `${logger.stepIndicator(4, totalSteps)} Enviando versão ${manifest.version}...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner4;

      // Monta o FormData para upload multipart
      const tarballBuffer = readFileSync(tarballPath);
      const tarballBlob = new Blob([tarballBuffer], { type: 'application/gzip' });

      const formData = new FormData();
      formData.append('version', manifest.version);
      formData.append('file', tarballBlob, `${manifest.scope}-${manifest.name}-${manifest.version}.tgz`);

      // Metadados opcionais
      const metadata = {
        type: manifest.type,
        toolTargets: manifest.toolTargets,
        files: manifest.files,
        install: manifest.install,
        keywords: manifest.keywords,
        categories: manifest.categories,
      };
      formData.append('metadata', JSON.stringify(metadata));

      // Dependências (se existirem)
      if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
        const deps = Object.entries(manifest.dependencies).map(([key, range]) => {
          const [depScope, depName] = key.split('/');
          return { scope: depScope, name: depName, versionRange: range, isOptional: false };
        });
        formData.append('dependencies', JSON.stringify(deps));
      }

      // Lê README.md se existir no diretório
      const readmePath = join(dir, 'README.md');
      if (existsSync(readmePath)) {
        const readmeContent = readFileSync(readmePath, 'utf-8');
        formData.append('readme', readmeContent);
      }

      // Lê CHANGELOG.md se existir no diretório
      const changelogPath = join(dir, 'CHANGELOG.md');
      if (existsSync(changelogPath)) {
        const changelogContent = readFileSync(changelogPath, 'utf-8');
        formData.append('changelog', changelogContent);
      }

      await client.publishVersion(manifest.scope, manifest.name, formData);

      spinner4.succeed(
        `${logger.stepIndicator(4, totalSteps)} Versão ${chalk.green.bold(manifest.version)} enviada com sucesso`,
      );
      activeSpinner = null;

      // ── Passo 5: Verificação final ──────────────────────────────────
      const spinner5 = ora({
        text: `${logger.stepIndicator(5, totalSteps)} Verificando publicação...`,
        color: 'cyan',
      }).start();
      activeSpinner = spinner5;

      // Confirma que a versão foi registrada
      const versions = await client.getVersions(manifest.scope, manifest.name);
      const published = versions.data.find((v) => v.version === manifest.version);

      if (!published) {
        spinner5.warn(
          `${logger.stepIndicator(5, totalSteps)} Versão enviada mas não confirmada na listagem`,
        );
      } else {
        spinner5.succeed(
          `${logger.stepIndicator(5, totalSteps)} Publicação verificada`,
        );
      }

      // ── Árvore de arquivos publicados ─────────────────────────────
      logger.blank();
      const tree = logger.fileTree(manifest.files, `  ${chalk.gray('Arquivos publicados:')}`);
      logger.print('  ' + tree.split('\n').join('\n  '));

      // ── Mensagem de sucesso ───────────────────────────────────────
      logger.blank();
      const successBox = logger.box([
        chalk.green.bold('Publicação concluída!'),
        '',
        `${chalk.gray('Artefato:')} ${chalk.cyan.bold(slug)}`,
        `${chalk.gray('Versão:')}   ${chalk.green.bold(manifest.version)}`,
        `${chalk.gray('Tipo:')}     ${logger.typeBadge(manifest.type)}`,
        `${chalk.gray('Tamanho:')}  ${chalk.white(formatBytes(size))}`,
        `${chalk.gray('Checksum:')} ${chalk.gray(checksum)}`,
        '',
        chalk.gray(`Instale com: ${chalk.cyan(`aitk install ${slug}@${manifest.version}`)}`),
      ]);
      logger.print(successBox);
      logger.blank();
    } catch (error) {
      // Para o spinner ativo para não poluir a saída
      if (activeSpinner) {
        activeSpinner.fail();
      }
      logger.blank();
      logger.error('Erro ao publicar artefato');
      logger.error(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.blank();
      process.exitCode = 1;
    } finally {
      // Limpa arquivos temporários
      if (tarballPath) {
        cleanup(tarballPath);
      }
    }
  });
