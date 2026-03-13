/**
 * Adapter para auto-detecção de skills via SKILL.md.
 * Busca arquivos SKILL.md recursivamente no repositório e
 * parseia o frontmatter YAML para gerar ArtifactManifest.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import type { ArtifactManifest, SkillMdFrontmatter } from '@tarcisiojunior/shared';
import type { SourceAdapter } from './source-adapter.js';

/** Diretórios ignorados durante a busca recursiva */
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.claude-plugin', '.github', 'dist', 'build']);

/** Profundidade máxima de busca recursiva */
const MAX_DEPTH = 5;

/** Parseia frontmatter YAML simples de um SKILL.md */
function parseFrontmatter(content: string): SkillMdFrontmatter {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const kvMatch = line.match(/^(\w+):\s*(.+)$/);
    if (kvMatch) {
      const value = kvMatch[2].replace(/^["']|["']$/g, '').trim();
      // Detectar arrays simples inline [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        result[kvMatch[1]] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/^["']|["']$/g, ''));
      } else {
        result[kvMatch[1]] = value;
      }
    }
  }
  return result as SkillMdFrontmatter;
}

/** Extrai descrição das primeiras linhas do conteúdo (fora do frontmatter) */
function extractDescription(content: string): string {
  // Remove frontmatter
  const withoutFm = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
  // Pega primeira linha não vazia
  const lines = withoutFm.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';

  // Remove heading markers
  let desc = lines[0].replace(/^#+\s*/, '').trim();
  if (desc.length > 280) desc = desc.slice(0, 277) + '...';
  return desc;
}

/** Normaliza nome para formato válido de artefato */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 64);
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
        results.push(fullPath.slice(base.length + 1));
      }
    }
  } catch {
    // Ignora erros de leitura
  }
  return results;
}

/** Busca SKILL.md recursivamente no repositório */
function findSkillMdFiles(dir: string, depth = 0): string[] {
  if (depth > MAX_DEPTH) return [];

  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (entry === 'SKILL.md') {
        results.push(fullPath);
      } else if (!IGNORED_DIRS.has(entry) && statSync(fullPath).isDirectory()) {
        results.push(...findSkillMdFiles(fullPath, depth + 1));
      }
    }
  } catch {
    // Ignora erros de leitura
  }
  return results;
}

export class SkillMdAdapter implements SourceAdapter {
  readonly type = 'skill-md';

  canHandle(repoPath: string): boolean {
    // Aceita se encontrar pelo menos um SKILL.md
    const files = findSkillMdFiles(repoPath);
    return files.length > 0;
  }

  listArtifacts(repoPath: string, sourceName: string): ArtifactManifest[] {
    const scope = sourceName.split('/')[0] || sourceName;
    const skillMdFiles = findSkillMdFiles(repoPath);
    const artifacts: ArtifactManifest[] = [];

    for (const skillMdPath of skillMdFiles) {
      const artifact = this.skillMdToManifest(skillMdPath, scope);
      if (artifact) artifacts.push(artifact);
    }

    return artifacts;
  }

  getArtifact(repoPath: string, name: string, sourceName: string): ArtifactManifest | null {
    const all = this.listArtifacts(repoPath, sourceName);
    return all.find((a) => a.name === name) || null;
  }

  /** Converte um arquivo SKILL.md em ArtifactManifest */
  private skillMdToManifest(skillMdPath: string, scope: string): ArtifactManifest | null {
    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const skillDir = dirname(skillMdPath);
      const dirName = basename(skillDir);

      const name = normalizeName(frontmatter.name || dirName);
      const description = frontmatter.description || extractDescription(content) || `Skill ${name}`;
      const files = listFilesRecursive(skillDir, skillDir);

      return {
        name,
        scope,
        version: '0.0.0',
        type: 'skill',
        description,
        keywords: frontmatter.tags,
        license: frontmatter.license,
        toolTargets: ['claude-code'],
        files,
        install: {
          'claude-code': {
            target: '.claude/skills',
            entrypoint: 'SKILL.md',
          },
        },
      };
    } catch {
      return null;
    }
  }
}
