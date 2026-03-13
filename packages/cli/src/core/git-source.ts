/**
 * Gerenciador de fontes Git para artefatos.
 * Responsável por sparse checkout, fetch, cache local e TTL.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import type { Source, SourceConfig, SourcesManifest, SourceAdapterType } from '@tarcisiojunior/shared';
import { MarketplaceAdapter, SkillMdAdapter, AitkAdapter } from './adapters/index.js';
import type { SourceAdapter } from './adapters/source-adapter.js';
import { getConfig } from './config.js';

/** Diretório base para cache de fontes Git */
const SOURCES_DIR = join(homedir(), '.aitk', 'sources');
const SOURCES_FILE = join(SOURCES_DIR, 'sources.json');

/** TTL padrão em segundos (1 hora) */
const DEFAULT_TTL = 3600;

/** Adapters disponíveis em ordem de prioridade */
const ADAPTERS: SourceAdapter[] = [
  new MarketplaceAdapter(),
  new AitkAdapter(),
  new SkillMdAdapter(),
];

/** Verifica se o Git CLI está disponível no sistema */
export function isGitAvailable(): boolean {
  try {
    execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Garante que o Git está instalado, lançando erro se não estiver */
export function requireGit(): void {
  if (!isGitAvailable()) {
    throw new Error(
      'Git não está instalado ou não foi encontrado no PATH.\n' +
      'Instale o Git para usar fontes Git:\n' +
      '  macOS: brew install git\n' +
      '  Ubuntu/Debian: sudo apt install git\n' +
      '  Windows: https://git-scm.com/download/win',
    );
  }
}

/** Resolve URL ou shorthand GitHub para URL completa */
export function resolveGitUrl(urlOrShorthand: string): { url: string; name: string } {
  // URL completa
  if (urlOrShorthand.startsWith('https://') || urlOrShorthand.startsWith('git@')) {
    const name = urlOrShorthand
      .replace(/\.git$/, '')
      .split('/')
      .slice(-2)
      .join('/');
    return { url: urlOrShorthand, name };
  }

  // Shorthand: user/repo
  const parts = urlOrShorthand.split('/');
  if (parts.length === 2) {
    return {
      url: `https://github.com/${parts[0]}/${parts[1]}.git`,
      name: `${parts[0]}/${parts[1]}`,
    };
  }

  throw new Error(
    `Formato de URL/shorthand inválido: "${urlOrShorthand}"\n` +
    'Use: user/repo ou https://github.com/user/repo.git',
  );
}

/** Normaliza nome da fonte para uso como diretório */
function normalizeSourceDirName(name: string): string {
  return name.replace(/\//g, '-');
}

/** Retorna o caminho do diretório de cache para uma fonte */
export function getSourceCacheDir(sourceName: string): string {
  return join(SOURCES_DIR, normalizeSourceDirName(sourceName));
}

/** Garante que o diretório de fontes existe */
function ensureSourcesDir(): void {
  if (!existsSync(SOURCES_DIR)) {
    mkdirSync(SOURCES_DIR, { recursive: true });
  }
}

/** Lê o manifesto de fontes */
export function readSourcesManifest(): SourcesManifest {
  ensureSourcesDir();

  if (!existsSync(SOURCES_FILE)) {
    return { sources: [] };
  }

  try {
    const content = readFileSync(SOURCES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { sources: [] };
  }
}

/** Salva o manifesto de fontes */
export function writeSourcesManifest(manifest: SourcesManifest): void {
  ensureSourcesDir();
  writeFileSync(SOURCES_FILE, JSON.stringify(manifest, null, 2));
}

/** Executa clone parcial com sparse checkout */
export function sparseClone(url: string, targetDir: string, branch: string = 'main'): void {
  requireGit();

  // Clone parcial com filtro de blob (não baixa conteúdo dos arquivos)
  execSync(
    `git clone --filter=blob:none --no-checkout --depth 1 --branch ${branch} "${url}" "${targetDir}"`,
    { stdio: 'pipe' },
  );

  // Configura sparse checkout
  execSync('git sparse-checkout init --cone', {
    cwd: targetDir,
    stdio: 'pipe',
  });

  // Checkout dos arquivos de índice (marketplace.json, SKILL.md na raiz)
  execSync('git sparse-checkout set .claude-plugin SKILL.md marketplace.json', {
    cwd: targetDir,
    stdio: 'pipe',
  });

  // Faz o checkout
  execSync('git checkout', {
    cwd: targetDir,
    stdio: 'pipe',
  });
}

/** Faz checkout sob demanda de um diretório específico */
export function checkoutDirectory(cacheDir: string, dirPath: string): void {
  requireGit();

  // Adiciona o diretório ao sparse checkout
  execSync(`git sparse-checkout add ${dirPath}`, {
    cwd: cacheDir,
    stdio: 'pipe',
  });
}

/** Sincroniza uma fonte (git fetch + atualiza sparse checkout) */
export function syncSource(cacheDir: string): void {
  requireGit();

  execSync('git fetch origin', {
    cwd: cacheDir,
    stdio: 'pipe',
  });

  // Reset para o HEAD remoto
  execSync('git reset --hard origin/HEAD', {
    cwd: cacheDir,
    stdio: 'pipe',
  });
}

/** Detecta o tipo de adapter mais adequado para um repositório */
export function detectAdapter(repoPath: string): SourceAdapter | null {
  for (const adapter of ADAPTERS) {
    if (adapter.canHandle(repoPath)) {
      return adapter;
    }
  }
  return null;
}

/** Retorna o adapter pelo tipo */
export function getAdapterByType(type: SourceAdapterType): SourceAdapter {
  const map: Record<SourceAdapterType, SourceAdapter> = {
    marketplace: ADAPTERS[0],
    aitk: ADAPTERS[1],
    'skill-md': ADAPTERS[2],
  };
  return map[type];
}

/** Verifica se uma fonte precisa de sincronização (TTL expirado) */
export function needsSync(source: Source): boolean {
  if (!source.lastSync) return true;

  const config = getConfig();
  const ttl = ((config as unknown) as Record<string, unknown>)['source.ttl'] as number || DEFAULT_TTL;
  const lastSync = new Date(source.lastSync).getTime();
  const now = Date.now();

  return (now - lastSync) / 1000 > ttl;
}

/** Adiciona uma nova fonte */
export function addSource(config: SourceConfig): Source {
  requireGit();

  const { url, name: resolvedUrl } = resolveGitUrl(config.url);
  const name = config.name || resolvedUrl;
  const branch = config.branch || 'main';

  // Verifica se já existe
  const manifest = readSourcesManifest();
  const existing = manifest.sources.find((s: Source) => s.name === name);
  if (existing) {
    throw new Error(
      `Fonte "${name}" já está registrada.\n` +
      'Use "aitk source sync" para atualizar.',
    );
  }

  // Executa sparse checkout
  const cacheDir = getSourceCacheDir(name);
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }

  sparseClone(url, cacheDir, branch);

  // Detecta adapter
  const adapter = detectAdapter(cacheDir);
  const adapterType = adapter ? adapter.type as SourceAdapterType : null;

  // Conta artefatos
  let artifactCount = 0;
  if (adapter) {
    const artifacts = adapter.listArtifacts(cacheDir, name);
    artifactCount = artifacts.length;
  }

  // Registra a fonte
  const source: Source = {
    name,
    type: 'github',
    url,
    branch,
    lastSync: new Date().toISOString(),
    adapterType,
    artifactCount,
  };

  manifest.sources.push(source);
  writeSourcesManifest(manifest);

  return source;
}

/** Remove uma fonte registrada */
export function removeSource(name: string): void {
  const manifest = readSourcesManifest();
  const index = manifest.sources.findIndex((s: Source) => s.name === name);

  if (index === -1) {
    const available = manifest.sources.map((s: Source) => s.name).join(', ');
    throw new Error(
      `Fonte "${name}" não encontrada.\n` +
      (available ? `Fontes disponíveis: ${available}` : 'Nenhuma fonte registrada.'),
    );
  }

  // Remove diretório de cache
  const cacheDir = getSourceCacheDir(name);
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }

  // Remove da lista
  manifest.sources.splice(index, 1);
  writeSourcesManifest(manifest);
}

/** Sincroniza uma ou todas as fontes */
export function syncSources(sourceName?: string): Source[] {
  requireGit();

  const manifest = readSourcesManifest();
  const toSync = sourceName
    ? manifest.sources.filter((s: Source) => s.name === sourceName)
    : manifest.sources;

  if (sourceName && toSync.length === 0) {
    throw new Error(`Fonte "${sourceName}" não encontrada.`);
  }

  const synced: Source[] = [];

  for (const source of toSync) {
    const cacheDir = getSourceCacheDir(source.name);

    if (!existsSync(cacheDir)) {
      // Re-clone se o cache foi perdido
      sparseClone(source.url, cacheDir, source.branch);
    } else {
      syncSource(cacheDir);
    }

    // Atualiza contagem de artefatos
    const adapter = source.adapterType
      ? getAdapterByType(source.adapterType)
      : detectAdapter(cacheDir);

    if (adapter) {
      const artifacts = adapter.listArtifacts(cacheDir, source.name);
      source.artifactCount = artifacts.length;
      source.adapterType = adapter.type as SourceAdapterType;
    }

    source.lastSync = new Date().toISOString();
    synced.push(source);
  }

  writeSourcesManifest(manifest);
  return synced;
}

/** Faz checkout temporário de um repo Git (para instalação pontual) */
export function temporaryCheckout(
  url: string,
  branch: string = 'main',
): { path: string; cleanup: () => void } {
  requireGit();

  const tmpDir = join(SOURCES_DIR, `_tmp_${Date.now()}`);
  sparseClone(url, tmpDir, branch);

  return {
    path: tmpDir,
    cleanup: () => {
      if (existsSync(tmpDir)) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  };
}
