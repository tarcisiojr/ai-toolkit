import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectManifest } from '@ai-toolkit/shared';
import { projectManifestSchema } from '@ai-toolkit/shared';

const MANIFEST_FILE = 'aitk.json';

/** Lê o manifesto do projeto (aitk.json) */
export function readManifest(dir?: string): ProjectManifest | null {
  const filePath = join(dir || process.cwd(), MANIFEST_FILE);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return projectManifestSchema.parse(data);
  } catch {
    return null;
  }
}

/** Salva o manifesto do projeto */
export function writeManifest(manifest: ProjectManifest, dir?: string): void {
  const filePath = join(dir || process.cwd(), MANIFEST_FILE);
  writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n');
}

/** Cria um manifesto padrão */
export function createDefaultManifest(tool: string = 'claude-code'): ProjectManifest {
  return {
    version: '1.0.0',
    tool: tool as ProjectManifest['tool'],
    artifacts: {},
    devArtifacts: {},
  };
}

/** Adiciona um artefato ao manifesto */
export function addArtifactToManifest(
  manifest: ProjectManifest,
  artifactSlug: string,
  versionRange: string,
  isDev: boolean = false,
): ProjectManifest {
  const target = isDev ? 'devArtifacts' : 'artifacts';
  return {
    ...manifest,
    [target]: {
      ...(manifest[target] || {}),
      [artifactSlug]: versionRange,
    },
  };
}

/** Remove um artefato do manifesto */
export function removeArtifactFromManifest(
  manifest: ProjectManifest,
  artifactSlug: string,
): ProjectManifest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [artifactSlug]: _removed, ...artifacts } = manifest.artifacts;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [artifactSlug]: _removedDev, ...devArtifacts } = manifest.devArtifacts || {};
  return {
    ...manifest,
    artifacts,
    devArtifacts,
  };
}
