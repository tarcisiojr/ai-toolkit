/**
 * Tipos centrais para artefatos do AI-Toolkit.
 * Esses tipos são compartilhados entre web, CLI e API.
 */

/** Tipos de artefato suportados */
export type ArtifactType = 'skill' | 'mcp' | 'template' | 'config' | 'hook';

/** Níveis de visibilidade */
export type ArtifactVisibility = 'public' | 'private' | 'team';

/** Ferramentas de AI suportadas como alvo */
export type ToolTarget =
  | 'claude-code'
  | 'opencode'
  | 'gemini-cli'
  | 'copilot-cli'
  | 'aider'
  | 'cursor';

/** Artefato principal */
export interface Artifact {
  id: string;
  scope: string;
  name: string;
  slug: string;
  type: ArtifactType;
  visibility: ArtifactVisibility;
  description: string;
  longDescription?: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  categories: string[];
  toolTargets: ToolTarget[];
  totalDownloads: number;
  latestVersion?: string;
  isVerified: boolean;
  isDeprecated: boolean;
  deprecatedMessage?: string;
  ownerUserId?: string;
  ownerTeamId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Versão de um artefato */
export interface ArtifactVersion {
  id: string;
  artifactId: string;
  version: string;
  changelog?: string;
  readme?: string;
  storagePath: string;
  fileSize: number;
  checksum: string;
  metadata: Record<string, unknown>;
  dependencies: ArtifactDependency[];
  toolConfigs: Record<string, unknown>;
  minToolVersion: Record<string, string>;
  publishedBy?: string;
  publishedAt: string;
  isYanked: boolean;
  yankedReason?: string;
}

/** Dependência entre artefatos */
export interface ArtifactDependency {
  scope: string;
  name: string;
  versionRange: string;
  isOptional: boolean;
}

/** Configuração de instalação por ferramenta */
export interface InstallConfig {
  target: string;
  entrypoint: string;
}

/** Manifesto de publicação (aitk-artifact.json) */
export interface ArtifactManifest {
  name: string;
  scope: string;
  version: string;
  type: ArtifactType;
  description: string;
  keywords?: string[];
  categories?: string[];
  license?: string;
  repository?: string;
  toolTargets: ToolTarget[];
  files: string[];
  install: Record<string, InstallConfig>;
  dependencies?: Record<string, string>;
}

/** Manifesto do projeto (aitk.json) */
export interface ProjectManifest {
  version: string;
  tool: ToolTarget;
  artifacts: Record<string, string>;
  devArtifacts?: Record<string, string>;
}

/** Entrada no lock file (aitk-lock.json) */
export interface LockEntry {
  resolved: string;
  integrity: string;
  dependencies: Record<string, string>;
}

/** Lock file completo */
export interface LockFile {
  lockfileVersion: number;
  artifacts: Record<string, LockEntry>;
}
