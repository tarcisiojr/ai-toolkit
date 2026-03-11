import { join } from 'node:path';
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import type { ArtifactManifest, ToolTarget } from '@tarcisiojunior/shared';
import { TOOL_TARGET_INFO } from '@tarcisiojunior/shared';
import { BaseInstaller, type InstallResult } from './base-installer.js';

/** Instalador de hooks (scripts de automacao) */
export class HookInstaller extends BaseInstaller {
  readonly type = 'hook';

  getInstallPath(manifest: ArtifactManifest, projectRoot: string, toolTarget: ToolTarget): string {
    const toolInfo = TOOL_TARGET_INFO[toolTarget];
    const installConfig = manifest.install[toolTarget];

    if (installConfig?.target) {
      return join(projectRoot, installConfig.target);
    }

    // Caminho padrao: <configDir>/hooks/<name>/
    return join(projectRoot, toolInfo.configDir, 'hooks', manifest.name);
  }

  async install(
    manifest: ArtifactManifest,
    extractedPath: string,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<InstallResult> {
    const installPath = this.getInstallPath(manifest, projectRoot, toolTarget);

    // Cria diretorio de destino
    mkdirSync(installPath, { recursive: true });

    // Copia arquivos do hook
    cpSync(extractedPath, installPath, { recursive: true });

    // Lista arquivos instalados
    const filesInstalled = readdirSync(installPath, { recursive: true })
      .map(String)
      .filter((f) => !f.startsWith('.'));

    return {
      success: true,
      installedPath: installPath,
      filesInstalled,
      message: `Hook instalado em ${installPath}`,
    };
  }

  async uninstall(
    manifest: ArtifactManifest,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<void> {
    const installPath = this.getInstallPath(manifest, projectRoot, toolTarget);

    if (existsSync(installPath)) {
      rmSync(installPath, { recursive: true, force: true });
    }
  }
}
