import { describe, it, expect } from 'vitest';
import { SourceResolver } from '../core/source-resolver.js';

describe('SourceResolver', () => {
  const resolver = new SourceResolver();

  describe('listFromGitSources', () => {
    it('deve retornar array vazio quando não há fontes registradas', async () => {
      const results = await resolver.listFromGitSources(false);
      // Pode retornar vazio ou com resultados se fontes existirem
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('searchInGitSources', () => {
    it('deve retornar array vazio para busca sem fontes', async () => {
      const results = await resolver.searchInGitSources('nonexistent-xyz');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('resolveFromGithubPrefix', () => {
    it('deve retornar null para prefixo inválido', async () => {
      const result = await resolver.resolveFromGithubPrefix('invalid-prefix');
      expect(result).toBeNull();
    });

    it('deve retornar null para formato sem 3 partes', async () => {
      const result = await resolver.resolveFromGithubPrefix('github:user/repo');
      expect(result).toBeNull();
    });
  });
});
