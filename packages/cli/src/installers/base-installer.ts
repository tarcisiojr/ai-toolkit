import type { ArtifactManifest, ToolTarget } from '@tarcisiojunior/shared';

/** Resultado de uma instalação */
export interface InstallResult {
  success: boolean;
  installedPath: string;
  filesInstalled: string[];
  message?: string;
}

/** Classe base para instaladores de artefatos */
export abstract class BaseInstaller {
  abstract readonly type: string;

  /** Instala o artefato no projeto */
  abstract install(
    manifest: ArtifactManifest,
    extractedPath: string,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<InstallResult>;

  /** Remove o artefato do projeto */
  abstract uninstall(
    manifest: ArtifactManifest,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<void>;

  /** Retorna o caminho de instalação */
  abstract getInstallPath(
    manifest: ArtifactManifest,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): string;
}
