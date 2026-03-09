/**
 * Testes do gerenciador de manifesto do projeto.
 */

import { describe, it, expect } from 'vitest';
import {
  createDefaultManifest,
  addArtifactToManifest,
  removeArtifactFromManifest,
} from '../core/manifest.js';

describe('createDefaultManifest', () => {
  it('cria manifesto com valores padrão', () => {
    const manifest = createDefaultManifest();

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.tool).toBe('claude-code');
    expect(manifest.artifacts).toEqual({});
    expect(manifest.devArtifacts).toEqual({});
  });

  it('aceita ferramenta personalizada', () => {
    const manifest = createDefaultManifest('opencode');

    expect(manifest.tool).toBe('opencode');
  });
});

describe('addArtifactToManifest', () => {
  it('adiciona artefato em artifacts', () => {
    const manifest = createDefaultManifest();
    const updated = addArtifactToManifest(manifest, 'user/skill', '^1.0.0');

    expect(updated.artifacts['user/skill']).toBe('^1.0.0');
    expect(updated.devArtifacts).toEqual({});
  });

  it('adiciona artefato em devArtifacts quando isDev=true', () => {
    const manifest = createDefaultManifest();
    const updated = addArtifactToManifest(manifest, 'user/skill', '^1.0.0', true);

    expect(updated.devArtifacts?.['user/skill']).toBe('^1.0.0');
    expect(updated.artifacts).toEqual({});
  });

  it('preserva artefatos existentes ao adicionar novo', () => {
    let manifest = createDefaultManifest();
    manifest = addArtifactToManifest(manifest, 'a/first', '^1.0.0');
    manifest = addArtifactToManifest(manifest, 'b/second', '~2.0.0');

    expect(manifest.artifacts['a/first']).toBe('^1.0.0');
    expect(manifest.artifacts['b/second']).toBe('~2.0.0');
  });

  it('sobrescreve versão de artefato existente', () => {
    let manifest = createDefaultManifest();
    manifest = addArtifactToManifest(manifest, 'user/skill', '^1.0.0');
    manifest = addArtifactToManifest(manifest, 'user/skill', '^2.0.0');

    expect(manifest.artifacts['user/skill']).toBe('^2.0.0');
  });
});

describe('removeArtifactFromManifest', () => {
  it('remove artefato de artifacts', () => {
    let manifest = createDefaultManifest();
    manifest = addArtifactToManifest(manifest, 'user/skill', '^1.0.0');
    manifest = removeArtifactFromManifest(manifest, 'user/skill');

    expect(manifest.artifacts['user/skill']).toBeUndefined();
  });

  it('remove artefato de devArtifacts', () => {
    let manifest = createDefaultManifest();
    manifest = addArtifactToManifest(manifest, 'user/skill', '^1.0.0', true);
    manifest = removeArtifactFromManifest(manifest, 'user/skill');

    expect(manifest.devArtifacts?.['user/skill']).toBeUndefined();
  });

  it('preserva outros artefatos ao remover', () => {
    let manifest = createDefaultManifest();
    manifest = addArtifactToManifest(manifest, 'a/first', '^1.0.0');
    manifest = addArtifactToManifest(manifest, 'b/second', '~2.0.0');
    manifest = removeArtifactFromManifest(manifest, 'a/first');

    expect(manifest.artifacts['a/first']).toBeUndefined();
    expect(manifest.artifacts['b/second']).toBe('~2.0.0');
  });

  it('não falha ao remover artefato inexistente', () => {
    const manifest = createDefaultManifest();
    const result = removeArtifactFromManifest(manifest, 'nao/existe');

    expect(result.artifacts).toEqual({});
  });
});
