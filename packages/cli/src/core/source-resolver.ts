/**
 * Resolvedor multi-fonte de artefatos.
 * Unifica busca e resolução entre registry API e repositórios Git.
 */

import type { ArtifactManifest } from '@tarcisiojunior/shared';
import {
  readSourcesManifest,
  getSourceCacheDir,
  getAdapterByType,
  detectAdapter,
  needsSync,
  syncSources,
  temporaryCheckout,
  checkoutDirectory,
  resolveGitUrl,
} from './git-source.js';
import { existsSync } from 'node:fs';

/** Resultado de busca com informação da fonte */
export interface SourcedArtifact {
  /** Manifesto do artefato */
  manifest: ArtifactManifest;
  /** Nome da fonte de origem */
  source: string;
  /** Tipo da fonte ("registry" ou nome da source Git) */
  sourceType: 'registry' | 'git';
}

export class SourceResolver {
  /**
   * Lista artefatos de todas as fontes Git registradas.
   * Sincroniza automaticamente fontes com TTL expirado.
   */
  async listFromGitSources(autoSync: boolean = true): Promise<SourcedArtifact[]> {
    const manifest = readSourcesManifest();
    const results: SourcedArtifact[] = [];

    for (const source of manifest.sources) {
      // Sync automático por TTL
      if (autoSync && needsSync(source)) {
        try {
          syncSources(source.name);
        } catch {
          // Continua mesmo se sync falhar (usa cache)
        }
      }

      const cacheDir = getSourceCacheDir(source.name);
      if (!existsSync(cacheDir)) continue;

      const adapter = source.adapterType
        ? getAdapterByType(source.adapterType)
        : detectAdapter(cacheDir);

      if (!adapter) continue;

      const artifacts = adapter.listArtifacts(cacheDir, source.name);
      for (const art of artifacts) {
        results.push({
          manifest: art,
          source: source.name,
          sourceType: 'git',
        });
      }
    }

    return results;
  }

  /**
   * Busca artefatos por termo em todas as fontes Git.
   * @param query - Termo de busca
   * @param sourceName - Filtrar por fonte específica (opcional)
   */
  async searchInGitSources(query: string, sourceName?: string): Promise<SourcedArtifact[]> {
    const all = await this.listFromGitSources();
    const q = query.toLowerCase();

    return all.filter((item) => {
      // Filtrar por fonte se especificado
      if (sourceName && item.source !== sourceName) return false;

      // Buscar por nome, descrição ou keywords
      const m = item.manifest;
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.keywords || []).some((k) => k.toLowerCase().includes(q))
      );
    });
  }

  /**
   * Resolve um artefato pelo nome em fontes Git registradas.
   * @param name - Nome do artefato
   * @param sourceName - Fonte específica (opcional)
   */
  async resolveFromGitSources(
    name: string,
    sourceName?: string,
  ): Promise<SourcedArtifact | null> {
    const manifest = readSourcesManifest();
    const sources = sourceName
      ? manifest.sources.filter((s: { name: string }) => s.name === sourceName)
      : manifest.sources;

    for (const source of sources) {
      // Sync se necessário
      if (needsSync(source)) {
        try {
          syncSources(source.name);
        } catch {
          // Usa cache
        }
      }

      const cacheDir = getSourceCacheDir(source.name);
      if (!existsSync(cacheDir)) continue;

      const adapter = source.adapterType
        ? getAdapterByType(source.adapterType)
        : detectAdapter(cacheDir);

      if (!adapter) continue;

      const artifact = adapter.getArtifact(cacheDir, name, source.name);
      if (artifact) {
        // Faz checkout do diretório da skill para instalação
        try {
          checkoutDirectory(cacheDir, name);
        } catch {
          // Pode já estar no checkout
        }

        return {
          manifest: artifact,
          source: source.name,
          sourceType: 'git',
        };
      }
    }

    return null;
  }

  /**
   * Resolve um artefato via prefixo github:user/repo/skill.
   * Faz checkout temporário do repositório.
   */
  async resolveFromGithubPrefix(
    prefix: string,
  ): Promise<{ artifact: SourcedArtifact; cleanup: () => void } | null> {
    // Parseia github:user/repo/skill
    const match = prefix.match(/^github:([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) return null;

    const [, user, repo, skillName] = match;
    const { url } = resolveGitUrl(`${user}/${repo}`);

    const { path: tmpPath, cleanup } = temporaryCheckout(url);

    try {
      const adapter = detectAdapter(tmpPath);
      if (!adapter) {
        cleanup();
        return null;
      }

      const artifact = adapter.getArtifact(tmpPath, skillName, `${user}/${repo}`);
      if (!artifact) {
        // Tenta fazer checkout do diretório da skill
        try {
          checkoutDirectory(tmpPath, skillName);
          // Re-tenta detectar após checkout
          const retryAdapter = detectAdapter(tmpPath);
          if (retryAdapter) {
            const retryArtifact = retryAdapter.getArtifact(tmpPath, skillName, `${user}/${repo}`);
            if (retryArtifact) {
              return {
                artifact: {
                  manifest: retryArtifact,
                  source: `github:${user}/${repo}`,
                  sourceType: 'git',
                },
                cleanup,
              };
            }
          }
        } catch {
          // Ignora
        }

        cleanup();
        return null;
      }

      return {
        artifact: {
          manifest: artifact,
          source: `github:${user}/${repo}`,
          sourceType: 'git',
        },
        cleanup,
      };
    } catch {
      cleanup();
      return null;
    }
  }
}
