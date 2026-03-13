import { describe, it, expect } from 'vitest';
import { resolveGitUrl, isGitAvailable } from '../core/git-source.js';

describe('Git Source', () => {
  describe('isGitAvailable', () => {
    it('deve retornar true quando git está instalado', () => {
      expect(isGitAvailable()).toBe(true);
    });
  });

  describe('resolveGitUrl', () => {
    it('deve resolver shorthand GitHub user/repo', () => {
      const result = resolveGitUrl('anthropics/skills');
      expect(result.url).toBe('https://github.com/anthropics/skills.git');
      expect(result.name).toBe('anthropics/skills');
    });

    it('deve resolver URL HTTPS completa', () => {
      const result = resolveGitUrl('https://github.com/user/repo.git');
      expect(result.url).toBe('https://github.com/user/repo.git');
      expect(result.name).toBe('user/repo');
    });

    it('deve resolver URL HTTPS sem .git', () => {
      const result = resolveGitUrl('https://github.com/user/repo');
      expect(result.url).toBe('https://github.com/user/repo');
      expect(result.name).toBe('user/repo');
    });

    it('deve lançar erro para formato inválido', () => {
      expect(() => resolveGitUrl('invalid')).toThrow('Formato de URL/shorthand inválido');
    });

    it('deve lançar erro para shorthand com 3 partes', () => {
      expect(() => resolveGitUrl('a/b/c')).toThrow('Formato de URL/shorthand inválido');
    });
  });
});
