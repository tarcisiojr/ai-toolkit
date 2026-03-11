import { join } from 'node:path';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import type { ArtifactManifest, ToolTarget } from '@tarcisiojunior/shared';
import { BaseInstaller, type InstallResult } from './base-installer.js';
import { SkillInstaller } from './skill-installer.js';
import { McpInstaller } from './mcp-installer.js';
import { ConfigInstaller } from './config-installer.js';
import { HookInstaller } from './hook-installer.js';

/** Definição de um artefato dentro do template */
interface TemplateEntry {
  type: 'skill' | 'mcp' | 'config' | 'hook';
  name: string;
  /** Subdiretório dentro do template extraído */
  path: string;
  /** Descrição do artefato incluído */
  description?: string;
}

/** Configuração do template (template.json) */
interface TemplateConfig {
  /** Artefatos incluídos no template */
  entries: TemplateEntry[];
  /** Descrição do template */
  description?: string;
  /** Pós-instalação: comandos a serem exibidos ao usuário */
  postInstallHints?: string[];
}

/**
 * Instalador de templates.
 * Um template é um pacote que contém múltiplos artefatos (skills, MCPs, configs, hooks)
 * organizados em subdiretórios. O template.json define a estrutura.
 */
export class TemplateInstaller extends BaseInstaller {
  readonly type = 'template';

  /** Mapa de instaladores por tipo */
  private getSubInstaller(type: string): BaseInstaller {
    const installers: Record<string, BaseInstaller> = {
      skill: new SkillInstaller(),
      mcp: new McpInstaller(),
      config: new ConfigInstaller(),
      hook: new HookInstaller(),
    };
    return installers[type] || new SkillInstaller();
  }

  getInstallPath(manifest: ArtifactManifest, projectRoot: string, _toolTarget: ToolTarget): string {
    // Templates não têm um único caminho — instalam em múltiplos locais
    return projectRoot;
  }

  async install(
    manifest: ArtifactManifest,
    extractedPath: string,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<InstallResult> {
    const allInstalled: string[] = [];
    const installPaths: string[] = [];

    // Tentar ler template.json do pacote extraído
    const templateConfigPath = join(extractedPath, 'template.json');
    let templateConfig: TemplateConfig | null = null;

    if (existsSync(templateConfigPath)) {
      try {
        const raw = readFileSync(templateConfigPath, 'utf-8');
        templateConfig = JSON.parse(raw) as TemplateConfig;
      } catch {
        // Se falhar, tenta instalar cada subdiretório como skill
      }
    }

    if (templateConfig?.entries && templateConfig.entries.length > 0) {
      // Instalação guiada pelo template.json
      for (const entry of templateConfig.entries) {
        const entryPath = join(extractedPath, entry.path);

        if (!existsSync(entryPath)) {
          continue;
        }

        const subInstaller = this.getSubInstaller(entry.type);
        const subManifest: ArtifactManifest = {
          ...manifest,
          name: entry.name,
          type: entry.type as ArtifactManifest['type'],
          description: entry.description || manifest.description,
        };

        const result = await subInstaller.install(
          subManifest,
          entryPath,
          projectRoot,
          toolTarget,
        );

        if (result.success) {
          allInstalled.push(...result.filesInstalled);
          installPaths.push(result.installedPath);
        }
      }
    } else {
      // Fallback: tenta detectar artefatos por convenção de diretórios
      const conventionDirs: Record<string, string> = {
        skills: 'skill',
        hooks: 'hook',
        configs: 'config',
        mcp: 'mcp',
      };

      for (const [dir, type] of Object.entries(conventionDirs)) {
        const dirPath = join(extractedPath, dir);
        if (!existsSync(dirPath)) continue;

        const subInstaller = this.getSubInstaller(type);
        const subManifest: ArtifactManifest = {
          ...manifest,
          type: type as ArtifactManifest['type'],
        };

        const result = await subInstaller.install(
          subManifest,
          dirPath,
          projectRoot,
          toolTarget,
        );

        if (result.success) {
          allInstalled.push(...result.filesInstalled);
          installPaths.push(result.installedPath);
        }
      }
    }

    // Criar diretório base do projeto se não existir
    mkdirSync(projectRoot, { recursive: true });

    return {
      success: allInstalled.length > 0,
      installedPath: installPaths.join(', '),
      filesInstalled: allInstalled,
      message: templateConfig?.postInstallHints
        ? `Dicas pós-instalação:\n${templateConfig.postInstallHints.map(h => `  • ${h}`).join('\n')}`
        : `Template instalado com ${allInstalled.length} arquivo(s)`,
    };
  }

  async uninstall(
    manifest: ArtifactManifest,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<void> {
    // Templates instalam múltiplos artefatos — desinstala cada um
    const templateConfigPath = join(projectRoot, '.aitk-templates', manifest.name, 'template.json');

    if (existsSync(templateConfigPath)) {
      try {
        const raw = readFileSync(templateConfigPath, 'utf-8');
        const config = JSON.parse(raw) as TemplateConfig;

        for (const entry of config.entries) {
          const subInstaller = this.getSubInstaller(entry.type);
          const subManifest: ArtifactManifest = {
            ...manifest,
            name: entry.name,
            type: entry.type as ArtifactManifest['type'],
          };
          await subInstaller.uninstall(subManifest, projectRoot, toolTarget);
        }
      } catch {
        // Ignora erros de parsing
      }
    }
  }
}
