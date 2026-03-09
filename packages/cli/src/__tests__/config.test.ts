/**
 * Testes do gerenciador de configuração.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do sistema de arquivos antes de importar o módulo
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/tmp/test-home'),
}));

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getConfig, saveConfig } from '../core/config.js';

describe('getConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna configuração padrão quando arquivo não existe', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const config = getConfig();

    expect(config.registry).toBe('https://aitk.dev');
    expect(config.defaultTool).toBe('claude-code');
    expect(config.cacheMaxSize).toBe('500MB');
  });

  it('lê configuração do arquivo quando existe', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      registry: 'https://custom-registry.dev',
      defaultTool: 'opencode',
    }));

    const config = getConfig();

    expect(config.registry).toBe('https://custom-registry.dev');
    expect(config.defaultTool).toBe('opencode');
    // Mantém defaults para campos não definidos
    expect(config.cacheMaxSize).toBe('500MB');
  });

  it('retorna padrão quando arquivo é JSON inválido', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('invalid json');

    const config = getConfig();

    expect(config.registry).toBe('https://aitk.dev');
    expect(config.defaultTool).toBe('claude-code');
  });
});

describe('saveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('salva configuração parcial mesclando com existente', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      registry: 'https://aitk.dev',
      defaultTool: 'claude-code',
      cacheMaxSize: '500MB',
    }));

    saveConfig({ defaultTool: 'opencode' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const savedContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
    const saved = JSON.parse(savedContent);
    expect(saved.defaultTool).toBe('opencode');
    expect(saved.registry).toBe('https://aitk.dev');
  });
});
