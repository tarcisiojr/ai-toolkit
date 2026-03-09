/**
 * Gerenciador do lock file (aitk-lock.json).
 * Garante instalações determinísticas com versões resolvidas e checksums.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LockFile, LockEntry } from '@ai-toolkit/shared';

const LOCK_FILE = 'aitk-lock.json';
const LOCKFILE_VERSION = 1;

/** Lê o lock file do projeto */
export function readLockFile(dir?: string): LockFile | null {
  const filePath = join(dir || process.cwd(), LOCK_FILE);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as LockFile;
  } catch {
    return null;
  }
}

/** Salva o lock file */
export function writeLockFile(lockFile: LockFile, dir?: string): void {
  const filePath = join(dir || process.cwd(), LOCK_FILE);
  writeFileSync(filePath, JSON.stringify(lockFile, null, 2) + '\n');
}

/** Cria um lock file vazio */
export function createLockFile(): LockFile {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    artifacts: {},
  };
}

/** Adiciona ou atualiza uma entrada no lock file */
export function addLockEntry(
  lockFile: LockFile,
  artifactSlug: string,
  entry: LockEntry,
): LockFile {
  return {
    ...lockFile,
    artifacts: {
      ...lockFile.artifacts,
      [artifactSlug]: entry,
    },
  };
}

/** Remove uma entrada do lock file */
export function removeLockEntry(
  lockFile: LockFile,
  artifactSlug: string,
): LockFile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [artifactSlug]: _, ...remaining } = lockFile.artifacts;
  return {
    ...lockFile,
    artifacts: remaining,
  };
}

/** Cria uma entrada de lock a partir dos dados de download */
export function createLockEntry(
  resolvedVersion: string,
  checksum: string,
  dependencies: Record<string, string> = {},
): LockEntry {
  return {
    resolved: resolvedVersion,
    integrity: `sha256-${checksum}`,
    dependencies,
  };
}

/** Verifica se a versão no lock file é a mesma que seria resolvida */
export function isLocked(
  lockFile: LockFile,
  artifactSlug: string,
  version: string,
): boolean {
  const entry = lockFile.artifacts[artifactSlug];
  if (!entry) {
    return false;
  }
  return entry.resolved === version;
}

/** Obtém a versão resolvida do lock file */
export function getLockedVersion(
  lockFile: LockFile,
  artifactSlug: string,
): string | null {
  const entry = lockFile.artifacts[artifactSlug];
  return entry?.resolved || null;
}
