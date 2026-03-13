/**
 * Adapter para o formato marketplace.json usado por repositórios
 * como anthropics/skills e microsoft/skills.
 * Lê marketplace.json e resolve plugins/skills aninhados.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import type { ArtifactManifest, MarketplaceManifest } from '@tarcisiojunior/shared';
import type { SourceAdapter } from './source-adapter.js';

/** Parseia frontmatter YAML simples de um arquivo SKILL.md */
function parseSkillMdFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kvMatch = line.match(/^(\w+):\s*(.+)$/);
    if (kvMatch) {
      frontmatter[kvMatch[1]] = kvMatch[2].replace(/^["']|["']$/g, '');
    }
  }
  return frontmatter;
}

/** Lê metadados de uma skill a partir do seu diretório */
function readSkillFromDir(
  skillPath: string,
  fallbackName: string,
  scope: string,
): ArtifactManifest | null {
  const skillMdPath = join(skillPath, 'SKILL.md');
  let name = fallbackName;
  let description = `Skill ${fallbackName}`;

  if (existsSync(skillMdPath)) {
    const content = readFileSync(skillMdPath, 'utf-8');
    const fm = parseSkillMdFrontmatter(content);
    if (fm.name) name = fm.name;
    if (fm.description) description = fm.description;
  }

  // Listar arquivos do diretório da skill
  const files = listFilesRecursive(skillPath, skillPath);

  return {
    name: normalizeName(name),
    scope,
    version: '0.0.0',
    type: 'skill',
    description,
    toolTargets: ['claude-code'],
    files,
    install: {
      'claude-code': {
        target: '.claude/skills',
        entrypoint: 'SKILL.md',
      },
    },
  };
}

/** Lista arquivos recursivamente relativo a um caminho base */
function listFilesRecursive(dir: string, base: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...listFilesRecursive(fullPath, base));
      } else {
        const relativePath = fullPath.slice(base.length + 1);
        results.push(relativePath);
      }
    }
  } catch {
    // Ignora erros de leitura
  }
  return results;
}

/** Normaliza nome para formato válido de artefato */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 64);
}

export class MarketplaceAdapter implements SourceAdapter {
  readonly type = 'marketplace';

  canHandle(repoPath: string): boolean {
    // Verifica marketplace.json na raiz ou em .claude-plugin/
    return (
      existsSync(join(repoPath, 'marketplace.json')) ||
      existsSync(join(repoPath, '.claude-plugin', 'marketplace.json')) ||
      existsSync(join(repoPath, '.claude-plugin', 'plugin.json'))
    );
  }

  listArtifacts(repoPath: string, sourceName: string): ArtifactManifest[] {
    const scope = sourceName.split('/')[0] || sourceName;
    const artifacts: ArtifactManifest[] = [];

    // Tenta ler marketplace.json de diferentes locais
    const marketplacePaths = [
      join(repoPath, '.claude-plugin', 'marketplace.json'),
      join(repoPath, 'marketplace.json'),
    ];

    for (const mpPath of marketplacePaths) {
      if (!existsSync(mpPath)) continue;

      try {
        const content = readFileSync(mpPath, 'utf-8');
        const manifest: MarketplaceManifest = JSON.parse(content);
        const baseDir = dirname(mpPath) === join(repoPath, '.claude-plugin')
          ? repoPath
          : dirname(mpPath);

        // Processar plugins referenciados
        if (manifest.plugins) {
          for (const plugin of manifest.plugins) {
            const pluginDir = join(baseDir, plugin.path);
            const pluginArtifacts = this.resolvePlugin(pluginDir, scope);
            artifacts.push(...pluginArtifacts);
          }
        }

        // Processar skills diretamente listadas
        if (manifest.skills) {
          for (const skill of manifest.skills) {
            const skillDir = join(baseDir, skill.path);
            if (existsSync(skillDir)) {
              const artifact = readSkillFromDir(skillDir, skill.name, scope);
              if (artifact) {
                if (skill.description) artifact.description = skill.description;
                artifacts.push(artifact);
              }
            }
          }
        }

        break; // Usa o primeiro marketplace.json encontrado
      } catch {
        // Arquivo inválido, tenta o próximo
      }
    }

    // Se não encontrou marketplace.json mas tem plugin.json
    if (artifacts.length === 0) {
      const pluginJsonPath = join(repoPath, '.claude-plugin', 'plugin.json');
      if (existsSync(pluginJsonPath)) {
        const pluginArtifacts = this.resolvePlugin(repoPath, scope);
        artifacts.push(...pluginArtifacts);
      }
    }

    return artifacts;
  }

  getArtifact(repoPath: string, name: string, sourceName: string): ArtifactManifest | null {
    const all = this.listArtifacts(repoPath, sourceName);
    return all.find((a) => a.name === name) || null;
  }

  /** Resolve um plugin, buscando skills dentro dele */
  private resolvePlugin(pluginDir: string, scope: string): ArtifactManifest[] {
    const artifacts: ArtifactManifest[] = [];

    if (!existsSync(pluginDir)) return artifacts;

    // Verifica se o plugin tem seu próprio plugin.json com skills
    const pluginJsonPath = join(pluginDir, '.claude-plugin', 'plugin.json');
    if (existsSync(pluginJsonPath)) {
      try {
        const content = readFileSync(pluginJsonPath, 'utf-8');
        const pluginManifest = JSON.parse(content);

        if (pluginManifest.skills) {
          for (const skill of pluginManifest.skills) {
            const skillDir = join(pluginDir, skill.path || skill.name);
            if (existsSync(skillDir)) {
              const artifact = readSkillFromDir(skillDir, skill.name, scope);
              if (artifact) artifacts.push(artifact);
            }
          }
          return artifacts;
        }
      } catch {
        // Arquivo inválido
      }
    }

    // Fallback: buscar subdiretórios com SKILL.md
    try {
      const entries = readdirSync(pluginDir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const entryPath = join(pluginDir, entry);
        if (statSync(entryPath).isDirectory()) {
          const skillMd = join(entryPath, 'SKILL.md');
          if (existsSync(skillMd)) {
            const artifact = readSkillFromDir(entryPath, basename(entryPath), scope);
            if (artifact) artifacts.push(artifact);
          }
        }
      }
    } catch {
      // Ignora erros de leitura
    }

    return artifacts;
  }
}
