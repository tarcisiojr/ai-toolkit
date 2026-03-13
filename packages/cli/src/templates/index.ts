/**
 * Templates embutidos para criação de artefatos via `aitk create`.
 * Cada template gera os arquivos necessários para um tipo de artefato.
 */

import type { ArtifactType, CreateOptions } from '@tarcisiojunior/shared';

/** Gera conteúdo do aitk-artifact.json */
function generateAitkManifest(options: CreateOptions): string {
  const manifest: Record<string, unknown> = {
    name: options.name,
    scope: options.scope,
    version: '0.1.0',
    type: options.type,
    description: options.description,
    toolTargets: [options.toolTarget || 'claude-code'],
    files: getDefaultFiles(options.type),
    install: {
      [options.toolTarget || 'claude-code']: getDefaultInstallConfig(options.type, options.name),
    },
  };

  return JSON.stringify(manifest, null, 2);
}

/** Retorna a lista padrão de arquivos por tipo */
function getDefaultFiles(type: ArtifactType): string[] {
  switch (type) {
    case 'skill':
      return ['SKILL.md'];
    case 'mcp':
      return ['src/index.ts', 'config.json', 'package.json'];
    case 'config':
      return ['config.json'];
    case 'hook':
      return ['hook.sh'];
    case 'template':
      return ['template.json'];
  }
}

/** Retorna a configuração de instalação padrão */
function getDefaultInstallConfig(type: ArtifactType, _name: string): { target: string; entrypoint: string } {
  switch (type) {
    case 'skill':
      return { target: '.claude/skills', entrypoint: 'SKILL.md' };
    case 'mcp':
      return { target: '.claude/mcp', entrypoint: 'config.json' };
    case 'config':
      return { target: '.claude', entrypoint: 'config.json' };
    case 'hook':
      return { target: '.claude/hooks', entrypoint: 'hook.sh' };
    case 'template':
      return { target: '.', entrypoint: 'template.json' };
  }
}

/** Gera SKILL.md com frontmatter YAML */
function generateSkillMd(options: CreateOptions): string {
  return `---
name: "${options.name}"
description: "${options.description}"
license: "MIT"
---

# ${options.name}

${options.description}

## Instruções

<!-- Adicione as instruções da skill aqui -->
<!-- Este arquivo será carregado como contexto pela ferramenta de AI -->

## Exemplos

<!-- Adicione exemplos de uso aqui -->
`;
}

/** Gera README.md */
function generateReadme(options: CreateOptions): string {
  return `# ${options.name}

${options.description}

## Instalação

\`\`\`bash
aitk install ${options.scope}/${options.name}
\`\`\`

## Uso

<!-- Descreva como usar este artefato -->

## Licença

MIT
`;
}

/** Template de skill */
function skillTemplate(options: CreateOptions, format: string): Record<string, string> {
  const files: Record<string, string> = {};

  if (format === 'aitk' || format === 'dual') {
    files['aitk-artifact.json'] = generateAitkManifest(options);
  }

  if (format === 'marketplace' || format === 'dual') {
    files['SKILL.md'] = generateSkillMd(options);
  }

  files['README.md'] = generateReadme(options);
  return files;
}

/** Template de MCP */
function mcpTemplate(options: CreateOptions): Record<string, string> {
  return {
    'aitk-artifact.json': generateAitkManifest(options),
    'src/index.ts': `/**
 * Servidor MCP: ${options.name}
 * ${options.description}
 */

// Importe o SDK do MCP
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

console.log('Servidor MCP "${options.name}" iniciado');

// Implemente seu servidor MCP aqui
// Consulte: https://modelcontextprotocol.io/docs
`,
    'config.json': JSON.stringify({
      mcpServers: {
        [options.name]: {
          command: 'node',
          args: ['src/index.ts'],
        },
      },
    }, null, 2),
    'package.json': JSON.stringify({
      name: options.name,
      version: '0.1.0',
      description: options.description,
      type: 'module',
      main: 'src/index.ts',
      scripts: {
        start: 'node src/index.ts',
        build: 'tsc',
      },
    }, null, 2),
    'README.md': generateReadme(options),
  };
}

/** Template de config */
function configTemplate(options: CreateOptions): Record<string, string> {
  const toolTarget = options.toolTarget || 'claude-code';

  // Gerar arquivo de configuração apropriado para a ferramenta
  const configFiles: Record<string, string> = {
    'claude-code': 'CLAUDE.md',
    'cursor': '.cursorrules',
    'aider': '.aider.conf.yml',
  };

  const configFile = configFiles[toolTarget] || 'config.json';
  const files: Record<string, string> = {
    'aitk-artifact.json': generateAitkManifest({
      ...options,
      type: 'config',
    }),
    'README.md': generateReadme(options),
  };

  if (configFile === 'CLAUDE.md') {
    files[configFile] = `# ${options.name}\n\n${options.description}\n\n<!-- Adicione configurações aqui -->\n`;
  } else if (configFile.endsWith('.json')) {
    files[configFile] = JSON.stringify({}, null, 2);
  } else {
    files[configFile] = `# ${options.name}\n# ${options.description}\n`;
  }

  return files;
}

/** Template de hook */
function hookTemplate(options: CreateOptions): Record<string, string> {
  return {
    'aitk-artifact.json': generateAitkManifest(options),
    'hook.sh': `#!/bin/bash
# Hook: ${options.name}
# ${options.description}
#
# Este hook é executado automaticamente pela ferramenta de AI.
# Variáveis de ambiente disponíveis:
#   $HOOK_EVENT - Evento que disparou o hook
#   $HOOK_DATA  - Dados do evento (JSON)

set -e

echo "Hook ${options.name} executado"

# Implemente a lógica do hook aqui
`,
    'README.md': generateReadme(options),
  };
}

/** Template de template (meta-template) */
function templateTemplate(options: CreateOptions): Record<string, string> {
  return {
    'aitk-artifact.json': generateAitkManifest({
      ...options,
      type: 'template',
    }),
    'template.json': JSON.stringify({
      name: options.name,
      description: options.description,
      artifacts: [],
    }, null, 2),
    'skills/.gitkeep': '',
    'hooks/.gitkeep': '',
    'configs/.gitkeep': '',
    'README.md': generateReadme(options),
  };
}

/** Retorna os arquivos do template para um tipo de artefato */
export function getTemplateFiles(options: CreateOptions): Record<string, string> {
  const format = options.format || 'dual';

  switch (options.type) {
    case 'skill':
      return skillTemplate(options, format);
    case 'mcp':
      return mcpTemplate(options);
    case 'config':
      return configTemplate(options);
    case 'hook':
      return hookTemplate(options);
    case 'template':
      return templateTemplate(options);
    default:
      return skillTemplate(options, format);
  }
}
