import { join, basename } from 'node:path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  cpSync,
  rmSync,
} from 'node:fs';
import type { ArtifactManifest, ToolTarget } from '@tarcisiojr/shared';
import { TOOL_TARGET_INFO } from '@tarcisiojr/shared';
import { BaseInstaller, type InstallResult } from './base-installer.js';

/** Verifica se um arquivo e JSON pelo conteudo */
function isJsonFile(filePath: string): boolean {
  return filePath.endsWith('.json');
}

/** Faz merge profundo de dois objetos JSON */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = result[key];
    const sourceValue = source[key];

    // Se ambos sao objetos (nao arrays), faz merge recursivo
    if (
      targetValue &&
      sourceValue &&
      typeof targetValue === 'object' &&
      typeof sourceValue === 'object' &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      // Caso contrario, sobrescreve com o valor da fonte
      result[key] = sourceValue;
    }
  }

  return result;
}

/** Instalador de arquivos de configuracao */
export class ConfigInstaller extends BaseInstaller {
  readonly type = 'config';

  getInstallPath(manifest: ArtifactManifest, projectRoot: string, toolTarget: ToolTarget): string {
    const toolInfo = TOOL_TARGET_INFO[toolTarget];
    const installConfig = manifest.install[toolTarget];

    if (installConfig?.target) {
      return join(projectRoot, installConfig.target);
    }

    // Caminho padrao: <configDir>/ (diretorio raiz de configuracao da ferramenta)
    return join(projectRoot, toolInfo.configDir);
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

    const filesInstalled: string[] = [];
    const extractedFiles = readdirSync(extractedPath, { recursive: true }).map(String);

    for (const file of extractedFiles) {
      const sourcePath = join(extractedPath, file);
      const destPath = join(installPath, file);

      // Pula diretorios (serao criados automaticamente)
      if (file.endsWith('/')) {
        continue;
      }

      // Para arquivos JSON, faz merge com o arquivo existente
      if (isJsonFile(file) && existsSync(destPath)) {
        try {
          const existingContent = JSON.parse(readFileSync(destPath, 'utf-8')) as Record<string, unknown>;
          const newContent = JSON.parse(readFileSync(sourcePath, 'utf-8')) as Record<string, unknown>;

          // Faz merge profundo para preservar configuracoes existentes
          const merged = deepMerge(existingContent, newContent);
          writeFileSync(destPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
          filesInstalled.push(file);
          continue;
        } catch {
          // Se falhar o parse, copia normalmente (sobrescreve)
        }
      }

      // Para arquivos nao-JSON ou JSON sem conflito, copia diretamente
      const destDir = join(installPath, file.substring(0, file.lastIndexOf('/')));
      if (destDir !== installPath) {
        mkdirSync(destDir, { recursive: true });
      }

      cpSync(sourcePath, destPath);
      filesInstalled.push(file);
    }

    return {
      success: true,
      installedPath: installPath,
      filesInstalled,
      message: `Configuracao instalada em ${installPath}`,
    };
  }

  async uninstall(
    manifest: ArtifactManifest,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<void> {
    const installPath = this.getInstallPath(manifest, projectRoot, toolTarget);

    // Para configs, removemos apenas os arquivos que foram instalados
    // Nao removemos o diretorio inteiro pois pode conter outras configuracoes

    // Se o manifesto especifica arquivos, remove apenas esses
    if (manifest.files && manifest.files.length > 0) {
      for (const file of manifest.files) {
        const filePath = join(installPath, basename(file));
        if (existsSync(filePath)) {
          rmSync(filePath, { force: true });
        }
      }
    } else {
      // Sem lista de arquivos, tenta remover um subdiretorio nomeado
      const namedDir = join(installPath, manifest.name);
      if (existsSync(namedDir)) {
        rmSync(namedDir, { recursive: true, force: true });
      }
    }
  }
}
