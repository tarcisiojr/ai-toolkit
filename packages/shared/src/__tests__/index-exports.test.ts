import { describe, it, expect } from 'vitest';
import {
  // Validadores
  artifactTypeSchema,
  artifactVisibilitySchema,
  toolTargetSchema,
  installConfigSchema,
  dependencySchema,
  artifactManifestSchema,
  projectManifestSchema,
  semverSchema,
  // Constantes
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_TYPE_DESCRIPTIONS,
  TOOL_TARGET_INFO,
} from '../index.js';

// ----- Testes de exportação do módulo principal -----
describe('exports do módulo principal (index.ts)', () => {
  it('deve exportar todos os validadores Zod', () => {
    expect(artifactTypeSchema).toBeDefined();
    expect(artifactVisibilitySchema).toBeDefined();
    expect(toolTargetSchema).toBeDefined();
    expect(installConfigSchema).toBeDefined();
    expect(dependencySchema).toBeDefined();
    expect(artifactManifestSchema).toBeDefined();
    expect(projectManifestSchema).toBeDefined();
    expect(semverSchema).toBeDefined();
  });

  it('deve exportar todas as constantes', () => {
    expect(ARTIFACT_TYPE_LABELS).toBeDefined();
    expect(ARTIFACT_TYPE_DESCRIPTIONS).toBeDefined();
    expect(TOOL_TARGET_INFO).toBeDefined();
  });

  it('os validadores devem ser schemas Zod funcionais', () => {
    // Verifica que os schemas possuem o método safeParse do Zod
    expect(typeof artifactTypeSchema.safeParse).toBe('function');
    expect(typeof artifactManifestSchema.safeParse).toBe('function');
    expect(typeof semverSchema.safeParse).toBe('function');
    expect(typeof projectManifestSchema.safeParse).toBe('function');
  });

  it('as constantes devem ser objetos com conteúdo', () => {
    expect(Object.keys(ARTIFACT_TYPE_LABELS).length).toBeGreaterThan(0);
    expect(Object.keys(ARTIFACT_TYPE_DESCRIPTIONS).length).toBeGreaterThan(0);
    expect(Object.keys(TOOL_TARGET_INFO).length).toBeGreaterThan(0);
  });
});
