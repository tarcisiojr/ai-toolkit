/**
 * Testes do gerenciador de lock file.
 */

import { describe, it, expect } from 'vitest';
import {
  createLockFile,
  addLockEntry,
  removeLockEntry,
  createLockEntry,
  isLocked,
  getLockedVersion,
} from '../core/lockfile.js';

describe('createLockFile', () => {
  it('cria lock file com versão e artifacts vazio', () => {
    const lockFile = createLockFile();
    expect(lockFile.lockfileVersion).toBe(1);
    expect(lockFile.artifacts).toEqual({});
  });
});

describe('addLockEntry', () => {
  it('adiciona entrada ao lock file', () => {
    const lockFile = createLockFile();
    const entry = createLockEntry('1.0.0', 'abc123');

    const updated = addLockEntry(lockFile, 'user/my-skill', entry);
    expect(updated.artifacts['user/my-skill']).toBeDefined();
    expect(updated.artifacts['user/my-skill'].resolved).toBe('1.0.0');
  });

  it('sobrescreve entrada existente', () => {
    let lockFile = createLockFile();
    const entry1 = createLockEntry('1.0.0', 'abc123');
    const entry2 = createLockEntry('2.0.0', 'def456');

    lockFile = addLockEntry(lockFile, 'user/my-skill', entry1);
    lockFile = addLockEntry(lockFile, 'user/my-skill', entry2);

    expect(lockFile.artifacts['user/my-skill'].resolved).toBe('2.0.0');
  });

  it('preserva outras entradas ao adicionar nova', () => {
    let lockFile = createLockFile();
    lockFile = addLockEntry(lockFile, 'a/first', createLockEntry('1.0.0', 'aaa'));
    lockFile = addLockEntry(lockFile, 'b/second', createLockEntry('2.0.0', 'bbb'));

    expect(Object.keys(lockFile.artifacts)).toHaveLength(2);
    expect(lockFile.artifacts['a/first'].resolved).toBe('1.0.0');
    expect(lockFile.artifacts['b/second'].resolved).toBe('2.0.0');
  });
});

describe('removeLockEntry', () => {
  it('remove entrada do lock file', () => {
    let lockFile = createLockFile();
    lockFile = addLockEntry(lockFile, 'user/my-skill', createLockEntry('1.0.0', 'abc'));
    lockFile = removeLockEntry(lockFile, 'user/my-skill');

    expect(lockFile.artifacts['user/my-skill']).toBeUndefined();
  });

  it('preserva outras entradas ao remover', () => {
    let lockFile = createLockFile();
    lockFile = addLockEntry(lockFile, 'a/first', createLockEntry('1.0.0', 'aaa'));
    lockFile = addLockEntry(lockFile, 'b/second', createLockEntry('2.0.0', 'bbb'));
    lockFile = removeLockEntry(lockFile, 'a/first');

    expect(lockFile.artifacts['a/first']).toBeUndefined();
    expect(lockFile.artifacts['b/second']).toBeDefined();
  });
});

describe('createLockEntry', () => {
  it('cria entrada com integrity hash', () => {
    const entry = createLockEntry('1.2.3', 'sha256hash');
    expect(entry.resolved).toBe('1.2.3');
    expect(entry.integrity).toBe('sha256-sha256hash');
    expect(entry.dependencies).toEqual({});
  });

  it('cria entrada com dependências', () => {
    const deps = { 'scope/dep1': '^1.0.0', 'scope/dep2': '~2.0.0' };
    const entry = createLockEntry('1.0.0', 'hash', deps);
    expect(entry.dependencies).toEqual(deps);
  });
});

describe('isLocked', () => {
  it('retorna true quando versão é a mesma', () => {
    let lockFile = createLockFile();
    lockFile = addLockEntry(lockFile, 'user/skill', createLockEntry('1.0.0', 'hash'));

    expect(isLocked(lockFile, 'user/skill', '1.0.0')).toBe(true);
  });

  it('retorna false quando versão difere', () => {
    let lockFile = createLockFile();
    lockFile = addLockEntry(lockFile, 'user/skill', createLockEntry('1.0.0', 'hash'));

    expect(isLocked(lockFile, 'user/skill', '2.0.0')).toBe(false);
  });

  it('retorna false quando artefato não existe', () => {
    const lockFile = createLockFile();
    expect(isLocked(lockFile, 'user/skill', '1.0.0')).toBe(false);
  });
});

describe('getLockedVersion', () => {
  it('retorna versão resolvida', () => {
    let lockFile = createLockFile();
    lockFile = addLockEntry(lockFile, 'user/skill', createLockEntry('1.2.3', 'hash'));

    expect(getLockedVersion(lockFile, 'user/skill')).toBe('1.2.3');
  });

  it('retorna null para artefato não registrado', () => {
    const lockFile = createLockFile();
    expect(getLockedVersion(lockFile, 'inexistente')).toBeNull();
  });
});
