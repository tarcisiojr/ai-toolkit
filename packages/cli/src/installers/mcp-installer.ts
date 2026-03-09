import { join } from 'node:path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  cpSync,
  rmSync,
} from 'node:fs';
import type { ArtifactManifest, ToolTarget } from '@ai-toolkit/shared';
import { TOOL_TARGET_INFO } from '@ai-toolkit/shared';
import { BaseInstaller, type InstallResult } from './base-installer.js';

/** Estrutura esperada de uma configuracao MCP */
interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  [key: string]: unknown;
}

/** Estrutura do arquivo de configuracoes da ferramenta */
interface ToolSettingsFile {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

/** Retorna o nome do arquivo de configuracoes por ferramenta */
function getSettingsFilename(toolTarget: ToolTarget): string {
  // Cada ferramenta pode ter seu proprio arquivo de configuracao
  const settingsMap: Record<ToolTarget, string> = {
    'claude-code': 'settings.json',
    opencode: 'settings.json',
    'gemini-cli': 'settings.json',
    'copilot-cli': 'settings.json',
    aider: 'settings.json',
    cursor: 'settings.json',
  };

  return settingsMap[toolTarget];
}

/** Instalador de servidores MCP */
export class McpInstaller extends BaseInstaller {
  readonly type = 'mcp';

  getInstallPath(manifest: ArtifactManifest, projectRoot: string, toolTarget: ToolTarget): string {
    const toolInfo = TOOL_TARGET_INFO[toolTarget];
    const installConfig = manifest.install[toolTarget];

    if (installConfig?.target) {
      return join(projectRoot, installConfig.target);
    }

    // Caminho padrao: <configDir>/settings.json (onde o MCP sera registrado)
    return join(projectRoot, toolInfo.configDir, getSettingsFilename(toolTarget));
  }

  /** Le a configuracao MCP dos arquivos extraidos */
  private readMcpConfig(extractedPath: string): Record<string, McpServerConfig> | null {
    // Procura por config.json ou mcp.json nos arquivos extraidos
    const possibleFiles = ['config.json', 'mcp.json', 'mcp-config.json'];

    for (const filename of possibleFiles) {
      const configPath = join(extractedPath, filename);
      if (existsSync(configPath)) {
        try {
          const content = JSON.parse(readFileSync(configPath, 'utf-8'));

          // Suporta formato { "mcpServers": { ... } } ou diretamente { "server-name": { ... } }
          if (content.mcpServers) {
            return content.mcpServers as Record<string, McpServerConfig>;
          }

          return content as Record<string, McpServerConfig>;
        } catch {
          // Ignora arquivos com JSON invalido
        }
      }
    }

    return null;
  }

  /** Le o arquivo de configuracoes existente da ferramenta */
  private readToolSettings(settingsPath: string): ToolSettingsFile {
    if (existsSync(settingsPath)) {
      try {
        return JSON.parse(readFileSync(settingsPath, 'utf-8')) as ToolSettingsFile;
      } catch {
        // Arquivo corrompido, inicia do zero
        return {};
      }
    }

    return {};
  }

  async install(
    manifest: ArtifactManifest,
    extractedPath: string,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<InstallResult> {
    const toolInfo = TOOL_TARGET_INFO[toolTarget];
    const settingsPath = this.getInstallPath(manifest, projectRoot, toolTarget);
    const configDir = join(projectRoot, toolInfo.configDir);

    // Cria diretorio de configuracao se nao existir
    mkdirSync(configDir, { recursive: true });

    // Le a configuracao MCP do artefato extraido
    const mcpConfig = this.readMcpConfig(extractedPath);

    if (!mcpConfig) {
      return {
        success: false,
        installedPath: settingsPath,
        filesInstalled: [],
        message: 'Nenhum arquivo de configuracao MCP encontrado (config.json, mcp.json ou mcp-config.json)',
      };
    }

    // Diretorio para armazenar arquivos auxiliares do MCP (scripts, etc.)
    const mcpAssetsDir = join(configDir, 'mcp', manifest.name);
    mkdirSync(mcpAssetsDir, { recursive: true });

    // Copia todos os arquivos extraidos (exceto configs) para o diretorio de assets
    const configFiles = ['config.json', 'mcp.json', 'mcp-config.json'];
    const extractedFiles = readdirSync(extractedPath, { recursive: true }).map(String);

    for (const file of extractedFiles) {
      if (!configFiles.includes(file)) {
        cpSync(join(extractedPath, file), join(mcpAssetsDir, file), { recursive: true });
      }
    }

    // Le as configuracoes existentes da ferramenta
    const settings = this.readToolSettings(settingsPath);

    // Inicializa mcpServers se nao existir
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    // Faz merge das configuracoes MCP no arquivo de settings
    const serverNames: string[] = [];
    for (const [serverName, serverConfig] of Object.entries(mcpConfig)) {
      settings.mcpServers[serverName] = serverConfig;
      serverNames.push(serverName);
    }

    // Salva o arquivo de configuracoes atualizado
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

    // Lista todos os arquivos envolvidos na instalacao
    const filesInstalled = [
      getSettingsFilename(toolTarget),
      ...readdirSync(mcpAssetsDir, { recursive: true })
        .map(String)
        .filter((f) => !f.startsWith('.')),
    ];

    return {
      success: true,
      installedPath: configDir,
      filesInstalled,
      message: `MCP server(s) registrado(s): ${serverNames.join(', ')}`,
    };
  }

  async uninstall(
    manifest: ArtifactManifest,
    projectRoot: string,
    toolTarget: ToolTarget,
  ): Promise<void> {
    const toolInfo = TOOL_TARGET_INFO[toolTarget];
    const settingsPath = this.getInstallPath(manifest, projectRoot, toolTarget);
    const mcpAssetsDir = join(projectRoot, toolInfo.configDir, 'mcp', manifest.name);

    // Remove diretorio de assets do MCP
    if (existsSync(mcpAssetsDir)) {
      rmSync(mcpAssetsDir, { recursive: true, force: true });
    }

    // Remove entradas do mcpServers no arquivo de settings
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as ToolSettingsFile;

        if (settings.mcpServers) {
          // Le config original para saber quais servidores remover
          // Usa o nome do manifesto como prefixo/identificador
          const keysToRemove = Object.keys(settings.mcpServers).filter(
            (key) => key === manifest.name || key.startsWith(`${manifest.name}-`),
          );

          for (const key of keysToRemove) {
            delete settings.mcpServers[key];
          }

          // Remove mcpServers se ficou vazio
          if (Object.keys(settings.mcpServers).length === 0) {
            delete settings.mcpServers;
          }

          writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
        }
      } catch {
        // Ignora erros ao manipular o arquivo de settings
      }
    }
  }
}
