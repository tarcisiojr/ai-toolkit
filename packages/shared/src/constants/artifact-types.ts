import type { ArtifactType } from '../types/artifact.js';

/** Descrições amigáveis dos tipos de artefato */
export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  skill: 'Skill',
  mcp: 'MCP Server',
  template: 'Template',
  config: 'Configuração',
  hook: 'Hook',
};

/** Descrições dos tipos de artefato */
export const ARTIFACT_TYPE_DESCRIPTIONS: Record<ArtifactType, string> = {
  skill: 'Arquivo SKILL.md com instruções para assistentes de IA',
  mcp: 'Configuração de servidor MCP (Model Context Protocol)',
  template: 'Template de projeto com conjunto de artefatos pré-configurados',
  config: 'Arquivo de configuração para ferramentas de IA',
  hook: 'Hook de pré/pós execução para ferramentas de IA',
};
