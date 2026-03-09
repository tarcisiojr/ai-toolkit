import { z } from 'zod';

/** Regex para nomes válidos (scope e name) */
const nameRegex = /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/;

/** Regex para semver */
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

/** Tipos de artefato válidos */
export const artifactTypeSchema = z.enum(['skill', 'mcp', 'template', 'config', 'hook']);

/** Visibilidade válida */
export const artifactVisibilitySchema = z.enum(['public', 'private', 'team']);

/** Ferramentas de AI suportadas */
export const toolTargetSchema = z.enum([
  'claude-code',
  'opencode',
  'gemini-cli',
  'copilot-cli',
  'aider',
  'cursor',
]);

/** Validador para configuração de instalação */
export const installConfigSchema = z.object({
  target: z.string().min(1),
  entrypoint: z.string().min(1),
});

/** Validador para dependência */
export const dependencySchema = z.object({
  scope: z.string().regex(nameRegex, 'Scope inválido'),
  name: z.string().regex(nameRegex, 'Nome inválido'),
  versionRange: z.string().min(1),
  isOptional: z.boolean().default(false),
});

/** Validador para manifesto de publicação (aitk-artifact.json) */
export const artifactManifestSchema = z.object({
  name: z.string().regex(nameRegex, 'Nome deve conter apenas letras minúsculas, números, pontos, hífens e underscores'),
  scope: z.string().regex(nameRegex, 'Scope deve conter apenas letras minúsculas, números e hífens'),
  version: z.string().regex(semverRegex, 'Versão deve seguir o formato semver (ex: 1.0.0)'),
  type: artifactTypeSchema,
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(280),
  keywords: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  license: z.string().optional().default('MIT'),
  repository: z.string().url().optional(),
  toolTargets: z.array(toolTargetSchema).min(1, 'Deve suportar pelo menos uma ferramenta'),
  files: z.array(z.string()).min(1, 'Deve incluir pelo menos um arquivo'),
  install: z.record(z.string(), installConfigSchema),
  dependencies: z.record(z.string(), z.string()).optional().default({}),
});

/** Validador para manifesto do projeto (aitk.json) */
export const projectManifestSchema = z.object({
  version: z.string().default('1.0.0'),
  tool: toolTargetSchema,
  artifacts: z.record(z.string(), z.string()).default({}),
  devArtifacts: z.record(z.string(), z.string()).optional().default({}),
});

/** Validador para versão semver */
export const semverSchema = z.string().regex(semverRegex, 'Versão semver inválida');
