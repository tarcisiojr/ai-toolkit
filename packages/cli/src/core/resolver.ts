/**
 * Resolvedor de versões com suporte a semver ranges.
 * Resolve a melhor versão disponível que satisfaz um range semver.
 */

import * as semver from 'semver';
import type { ArtifactVersion } from '@ai-toolkit/shared';

/** Resultado da resolução de versão */
export interface ResolvedVersion {
  /** Versão resolvida (ex: "1.2.3") */
  version: string;
  /** Range original solicitado (ex: "^1.0.0") */
  requestedRange: string;
  /** Se é a latest version */
  isLatest: boolean;
}

/**
 * Resolve a melhor versão que satisfaz o range semver.
 * Segue as mesmas regras do npm:
 * - "1.0.0" → exata
 * - "^1.0.0" → compatível (>=1.0.0 <2.0.0)
 * - "~1.0.0" → patch (>=1.0.0 <1.1.0)
 * - ">=1.0.0" → maior ou igual
 * - "*" ou "latest" → última versão
 */
export function resolveVersion(
  versions: ArtifactVersion[],
  range: string,
): ResolvedVersion | null {
  // Filtra versões yanked (retiradas)
  const availableVersions = versions
    .filter((v) => !v.isYanked)
    .map((v) => v.version)
    .filter((v) => semver.valid(v));

  if (availableVersions.length === 0) {
    return null;
  }

  // Ordena em ordem decrescente (mais recente primeiro)
  const sorted = availableVersions.sort((a, b) => semver.rcompare(a, b));

  // Para "latest" e "*", usa apenas versões estáveis (sem prerelease)
  if (range === 'latest' || range === '*') {
    const stableVersions = sorted.filter((v) => !semver.prerelease(v));
    const latestStable = stableVersions.length > 0 ? stableVersions[0] : sorted[0];
    return {
      version: latestStable,
      requestedRange: range,
      isLatest: true,
    };
  }

  // Determina a latest version estável para comparação
  const latestStable = sorted.find((v) => !semver.prerelease(v)) || sorted[0];

  // Tenta resolver como range semver
  const resolved = semver.maxSatisfying(sorted, range);

  if (!resolved) {
    return null;
  }

  return {
    version: resolved,
    requestedRange: range,
    isLatest: resolved === latestStable,
  };
}

/**
 * Verifica se uma versão satisfaz um range semver.
 */
export function satisfiesRange(version: string, range: string): boolean {
  if (range === 'latest' || range === '*') {
    return true;
  }

  return semver.satisfies(version, range);
}

/**
 * Verifica se há uma versão mais recente disponível.
 * Retorna null se já está na última versão, ou a nova versão disponível.
 */
export function checkUpdate(
  currentVersion: string,
  versions: ArtifactVersion[],
  range: string,
): string | null {
  const resolved = resolveVersion(versions, range);

  if (!resolved) {
    return null;
  }

  // Verifica se a versão resolvida é mais recente que a atual
  if (semver.gt(resolved.version, currentVersion)) {
    return resolved.version;
  }

  return null;
}

/**
 * Converte uma versão exata para um range compatível (^).
 * Ex: "1.2.3" → "^1.2.3"
 */
export function toCompatibleRange(version: string): string {
  if (!semver.valid(version)) {
    return version;
  }

  return `^${version}`;
}

/**
 * Valida se uma string é uma versão semver válida.
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

/**
 * Valida se uma string é um range semver válido.
 */
export function isValidRange(range: string): boolean {
  if (!range || range.trim() === '') {
    return false;
  }

  if (range === 'latest' || range === '*') {
    return true;
  }

  return semver.validRange(range) !== null;
}

/**
 * Compara duas versões.
 * Retorna: -1 se a < b, 0 se a === b, 1 se a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  return semver.compare(a, b);
}
