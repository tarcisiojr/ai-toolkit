import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MarketplaceAdapter } from '../core/adapters/marketplace-adapter.js';
import { SkillMdAdapter } from '../core/adapters/skill-md-adapter.js';
import { AitkAdapter } from '../core/adapters/aitk-adapter.js';

describe('Source Adapters', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `aitk-adapter-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('MarketplaceAdapter', () => {
    const adapter = new MarketplaceAdapter();

    it('deve detectar repositório com marketplace.json', () => {
      mkdirSync(join(testDir, '.claude-plugin'), { recursive: true });
      writeFileSync(
        join(testDir, '.claude-plugin', 'marketplace.json'),
        JSON.stringify({ skills: [{ name: 'test-skill', path: 'skills/test', description: 'Teste' }] }),
      );
      mkdirSync(join(testDir, 'skills', 'test'), { recursive: true });
      writeFileSync(join(testDir, 'skills', 'test', 'SKILL.md'), '---\nname: test-skill\ndescription: Skill de teste\n---\n# Teste');

      expect(adapter.canHandle(testDir)).toBe(true);
    });

    it('deve retornar false para repositório sem marketplace.json', () => {
      expect(adapter.canHandle(testDir)).toBe(false);
    });

    it('deve listar artefatos do marketplace.json', () => {
      mkdirSync(join(testDir, '.claude-plugin'), { recursive: true });
      writeFileSync(
        join(testDir, '.claude-plugin', 'marketplace.json'),
        JSON.stringify({
          skills: [
            { name: 'skill-a', path: 'skills/a', description: 'Skill A' },
            { name: 'skill-b', path: 'skills/b', description: 'Skill B' },
          ],
        }),
      );
      mkdirSync(join(testDir, 'skills', 'a'), { recursive: true });
      mkdirSync(join(testDir, 'skills', 'b'), { recursive: true });
      writeFileSync(join(testDir, 'skills', 'a', 'SKILL.md'), '---\nname: skill-a\ndescription: Skill A\n---\n# A');
      writeFileSync(join(testDir, 'skills', 'b', 'SKILL.md'), '---\nname: skill-b\ndescription: Skill B\n---\n# B');

      const artifacts = adapter.listArtifacts(testDir, 'test/repo');
      expect(artifacts.length).toBe(2);
      expect(artifacts[0].name).toBe('skill-a');
      expect(artifacts[1].name).toBe('skill-b');
      expect(artifacts[0].type).toBe('skill');
    });

    it('deve encontrar artefato específico por nome', () => {
      mkdirSync(join(testDir, '.claude-plugin'), { recursive: true });
      writeFileSync(
        join(testDir, '.claude-plugin', 'marketplace.json'),
        JSON.stringify({ skills: [{ name: 'my-skill', path: 'skills/my', description: 'My' }] }),
      );
      mkdirSync(join(testDir, 'skills', 'my'), { recursive: true });
      writeFileSync(join(testDir, 'skills', 'my', 'SKILL.md'), '---\nname: my-skill\ndescription: Minha skill\n---\n');

      const artifact = adapter.getArtifact(testDir, 'my-skill', 'test/repo');
      expect(artifact).not.toBeNull();
      expect(artifact!.name).toBe('my-skill');
    });
  });

  describe('SkillMdAdapter', () => {
    const adapter = new SkillMdAdapter();

    it('deve detectar repositório com SKILL.md', () => {
      mkdirSync(join(testDir, 'my-skill'), { recursive: true });
      writeFileSync(
        join(testDir, 'my-skill', 'SKILL.md'),
        '---\nname: my-skill\ndescription: Teste\n---\n# Teste',
      );

      expect(adapter.canHandle(testDir)).toBe(true);
    });

    it('deve retornar false para repositório sem SKILL.md', () => {
      writeFileSync(join(testDir, 'README.md'), '# Repo sem skills');
      expect(adapter.canHandle(testDir)).toBe(false);
    });

    it('deve listar skills encontradas recursivamente', () => {
      mkdirSync(join(testDir, 'skills', 'a'), { recursive: true });
      mkdirSync(join(testDir, 'skills', 'b'), { recursive: true });
      writeFileSync(
        join(testDir, 'skills', 'a', 'SKILL.md'),
        '---\nname: skill-a\ndescription: A\n---\n',
      );
      writeFileSync(
        join(testDir, 'skills', 'b', 'SKILL.md'),
        '---\nname: skill-b\ndescription: B\n---\n',
      );

      const artifacts = adapter.listArtifacts(testDir, 'user/repo');
      expect(artifacts.length).toBe(2);
      expect(artifacts.map((a) => a.name).sort()).toEqual(['skill-a', 'skill-b']);
    });

    it('deve usar nome do diretório quando SKILL.md não tem frontmatter', () => {
      mkdirSync(join(testDir, 'my-cool-skill'), { recursive: true });
      writeFileSync(
        join(testDir, 'my-cool-skill', 'SKILL.md'),
        '# Minha skill legal\n\nFaz coisas legais.',
      );

      const artifacts = adapter.listArtifacts(testDir, 'user/repo');
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].name).toBe('my-cool-skill');
    });
  });

  describe('AitkAdapter', () => {
    const adapter = new AitkAdapter();

    it('deve detectar repositório com aitk-artifact.json', () => {
      mkdirSync(join(testDir, 'my-artifact'), { recursive: true });
      writeFileSync(
        join(testDir, 'my-artifact', 'aitk-artifact.json'),
        JSON.stringify({
          name: 'test',
          scope: 'user',
          version: '1.0.0',
          type: 'skill',
          description: 'Teste de artefato para validação',
          toolTargets: ['claude-code'],
          files: ['SKILL.md'],
          install: { 'claude-code': { target: '.claude/skills', entrypoint: 'SKILL.md' } },
        }),
      );

      expect(adapter.canHandle(testDir)).toBe(true);
    });

    it('deve retornar false para repositório sem aitk-artifact.json', () => {
      expect(adapter.canHandle(testDir)).toBe(false);
    });

    it('deve ler e validar aitk-artifact.json', () => {
      mkdirSync(join(testDir, 'pkg'), { recursive: true });
      writeFileSync(
        join(testDir, 'pkg', 'aitk-artifact.json'),
        JSON.stringify({
          name: 'my-pkg',
          scope: 'user',
          version: '1.2.0',
          type: 'skill',
          description: 'Artefato de teste para validação do adapter',
          toolTargets: ['claude-code'],
          files: ['SKILL.md'],
          install: { 'claude-code': { target: '.claude/skills', entrypoint: 'SKILL.md' } },
        }),
      );

      const artifacts = adapter.listArtifacts(testDir, 'user/repo');
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].name).toBe('my-pkg');
      expect(artifacts[0].version).toBe('1.2.0');
    });
  });
});
