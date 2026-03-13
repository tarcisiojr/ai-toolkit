/**
 * Adapter para o formato nativo aitk-artifact.json.
 * Busca e valida manifestos aitk-artifact.json em subdiretórios do repositório.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { ArtifactManifest } from '@tarcisiojunior/shared';
import { artifactManifestSchema } from '@tarcisiojunior/shared';
import type { SourceAdapter } from './source-adapter.js';

/** Diretórios ignorados durante a busca */
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.claude-plugin', '.github', 'dist', 'build']);

/** Profundidade máxima de busca */
const MAX_DEPTH = 3;

/** Busca aitk-artifact.json recursivamente */
function findAitkManifests(dir: string, depth = 0): string[] {
  if (depth > MAX_DEPTH) return [];

  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (entry === 'aitk-artifact.json') {
        results.push(fullPath);
      } else if (!IGNORED_DIRS.has(entry) && statSync(fullPath).isDirectory()) {
        results.push(...findAitkManifests(fullPath, depth + 1));
      }
    }
  } catch {
    // Ignora erros de leitura
  }
  return results;
}

export class AitkAdapter implements SourceAdapter {
  readonly type = 'aitk';

  canHandle(repoPath: string): boolean {
    const manifests = findAitkManifests(repoPath);
    return manifests.length > 0;
  }

  listArtifacts(repoPath: string, _sourceName: string): ArtifactManifest[] {
    const manifestPaths = findAitkManifests(repoPath);
    const artifacts: ArtifactManifest[] = [];

    for (const manifestPath of manifestPaths) {
      const artifact = this.readAndValidate(manifestPath);
      if (artifact) artifacts.push(artifact);
    }

    return artifacts;
  }

  getArtifact(repoPath: string, name: string, sourceName: string): ArtifactManifest | null {
    const all = this.listArtifacts(repoPath, sourceName);
    return all.find((a) => a.name === name) || null;
  }

  /** Lê e valida um aitk-artifact.json */
  private readAndValidate(manifestPath: string): ArtifactManifest | null {
    try {
      const content = readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);
      const result = artifactManifestSchema.safeParse(parsed);

      if (result.success) {
        return result.data as ArtifactManifest;
      }

      // Se a validação falhar, tenta usar os dados como estão (formato parcial)
      if (parsed.name && parsed.type) {
        return {
          name: parsed.name,
          scope: parsed.scope || basename(manifestPath),
          version: parsed.version || '0.0.0',
          type: parsed.type,
          description: parsed.description || `Artefato ${parsed.name}`,
          toolTargets: parsed.toolTargets || ['claude-code'],
          files: parsed.files || [],
          install: parsed.install || {},
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
