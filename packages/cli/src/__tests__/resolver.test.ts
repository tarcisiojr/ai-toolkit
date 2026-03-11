/**
 * Testes do resolvedor de versões semver.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveVersion,
  satisfiesRange,
  checkUpdate,
  toCompatibleRange,
  isValidVersion,
  isValidRange,
  compareVersions,
} from '../core/resolver.js';
import type { ArtifactVersion } from '@tarcisiojunior/shared';

/** Cria uma versão mock para testes */
function mockVersion(version: string, isYanked = false): ArtifactVersion {
  return {
    id: `v-${version}`,
    artifactId: 'test-artifact',
    version,
    storagePath: `/storage/${version}`,
    fileSize: 1024,
    checksum: 'abc123',
    metadata: {},
    dependencies: [],
    toolConfigs: {},
    minToolVersion: {},
    publishedAt: new Date().toISOString(),
    isYanked,
  };
}

describe('resolveVersion', () => {
  const versions = [
    mockVersion('1.0.0'),
    mockVersion('1.1.0'),
    mockVersion('1.2.0'),
    mockVersion('1.2.1'),
    mockVersion('2.0.0'),
    mockVersion('2.1.0'),
    mockVersion('3.0.0-beta.1'),
  ];

  it('resolve versão exata', () => {
    const result = resolveVersion(versions, '1.2.0');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.0');
  });

  it('resolve range compatível (^)', () => {
    const result = resolveVersion(versions, '^1.0.0');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.1');
  });

  it('resolve range de patch (~)', () => {
    const result = resolveVersion(versions, '~1.2.0');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.1');
  });

  it('resolve "latest" como última versão estável', () => {
    const result = resolveVersion(versions, 'latest');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('2.1.0');
    expect(result!.isLatest).toBe(true);
  });

  it('resolve "*" como última versão', () => {
    const result = resolveVersion(versions, '*');
    expect(result).not.toBeNull();
    expect(result!.isLatest).toBe(true);
  });

  it('resolve range >=2.0.0', () => {
    const result = resolveVersion(versions, '>=2.0.0');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('2.1.0');
  });

  it('retorna null para range impossível', () => {
    const result = resolveVersion(versions, '>=5.0.0');
    expect(result).toBeNull();
  });

  it('ignora versões yanked', () => {
    const versionsWithYanked = [
      mockVersion('1.0.0'),
      mockVersion('1.1.0', true), // yanked
      mockVersion('1.2.0'),
    ];
    const result = resolveVersion(versionsWithYanked, '^1.0.0');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.0');
  });

  it('retorna null para lista vazia', () => {
    const result = resolveVersion([], '^1.0.0');
    expect(result).toBeNull();
  });
});

describe('satisfiesRange', () => {
  it('verifica versão exata', () => {
    expect(satisfiesRange('1.0.0', '1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.1', '1.0.0')).toBe(false);
  });

  it('verifica range compatível (^)', () => {
    expect(satisfiesRange('1.2.3', '^1.0.0')).toBe(true);
    expect(satisfiesRange('2.0.0', '^1.0.0')).toBe(false);
  });

  it('verifica range de patch (~)', () => {
    expect(satisfiesRange('1.0.5', '~1.0.0')).toBe(true);
    expect(satisfiesRange('1.1.0', '~1.0.0')).toBe(false);
  });

  it('"latest" e "*" satisfazem qualquer versão', () => {
    expect(satisfiesRange('999.999.999', 'latest')).toBe(true);
    expect(satisfiesRange('0.0.1', '*')).toBe(true);
  });
});

describe('checkUpdate', () => {
  const versions = [
    mockVersion('1.0.0'),
    mockVersion('1.1.0'),
    mockVersion('1.2.0'),
    mockVersion('2.0.0'),
  ];

  it('detecta atualização disponível', () => {
    const update = checkUpdate('1.0.0', versions, '^1.0.0');
    expect(update).toBe('1.2.0');
  });

  it('retorna null quando já está atualizado', () => {
    const update = checkUpdate('1.2.0', versions, '^1.0.0');
    expect(update).toBeNull();
  });

  it('detecta major update com range amplo', () => {
    const update = checkUpdate('1.0.0', versions, '>=1.0.0');
    expect(update).toBe('2.0.0');
  });
});

describe('toCompatibleRange', () => {
  it('converte versão exata para range compatível', () => {
    expect(toCompatibleRange('1.2.3')).toBe('^1.2.3');
  });

  it('retorna input inválido sem modificar', () => {
    expect(toCompatibleRange('invalid')).toBe('invalid');
  });
});

describe('isValidVersion', () => {
  it('valida versões corretas', () => {
    expect(isValidVersion('1.0.0')).toBe(true);
    expect(isValidVersion('0.0.1')).toBe(true);
    expect(isValidVersion('10.20.30')).toBe(true);
    expect(isValidVersion('1.0.0-beta.1')).toBe(true);
  });

  it('rejeita versões inválidas', () => {
    expect(isValidVersion('abc')).toBe(false);
    expect(isValidVersion('1.0')).toBe(false);
    expect(isValidVersion('')).toBe(false);
  });
});

describe('isValidRange', () => {
  it('valida ranges corretos', () => {
    expect(isValidRange('^1.0.0')).toBe(true);
    expect(isValidRange('~1.0.0')).toBe(true);
    expect(isValidRange('>=1.0.0')).toBe(true);
    expect(isValidRange('1.0.0')).toBe(true);
    expect(isValidRange('latest')).toBe(true);
    expect(isValidRange('*')).toBe(true);
  });

  it('rejeita ranges inválidos', () => {
    expect(isValidRange('abc')).toBe(false);
    expect(isValidRange('')).toBe(false);
  });
});

describe('compareVersions', () => {
  it('compara versões corretamente', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('compara versões com patch', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.1.0', '1.0.9')).toBe(1);
  });
});
