import { describe, it, expect } from 'vitest';
import { getTemplateFiles } from '../templates/index.js';
import type { CreateOptions } from '@tarcisiojunior/shared';

describe('Templates', () => {
  const baseOptions: CreateOptions = {
    type: 'skill',
    name: 'test-skill',
    scope: 'my-user',
    description: 'Skill de teste para validação',
    toolTarget: 'claude-code',
    format: 'dual',
  };

  describe('getTemplateFiles', () => {
    it('deve gerar template de skill com formato dual', () => {
      const files = getTemplateFiles(baseOptions);
      expect(files['aitk-artifact.json']).toBeDefined();
      expect(files['SKILL.md']).toBeDefined();
      expect(files['README.md']).toBeDefined();
    });

    it('deve gerar template de skill com formato aitk (sem SKILL.md)', () => {
      const files = getTemplateFiles({ ...baseOptions, format: 'aitk' });
      expect(files['aitk-artifact.json']).toBeDefined();
      expect(files['SKILL.md']).toBeUndefined();
      expect(files['README.md']).toBeDefined();
    });

    it('deve gerar template de skill com formato marketplace (sem aitk-artifact.json)', () => {
      const files = getTemplateFiles({ ...baseOptions, format: 'marketplace' });
      expect(files['aitk-artifact.json']).toBeUndefined();
      expect(files['SKILL.md']).toBeDefined();
      expect(files['README.md']).toBeDefined();
    });

    it('deve gerar template de MCP', () => {
      const files = getTemplateFiles({ ...baseOptions, type: 'mcp' });
      expect(files['aitk-artifact.json']).toBeDefined();
      expect(files['src/index.ts']).toBeDefined();
      expect(files['config.json']).toBeDefined();
      expect(files['package.json']).toBeDefined();
      expect(files['README.md']).toBeDefined();
    });

    it('deve gerar template de config', () => {
      const files = getTemplateFiles({ ...baseOptions, type: 'config' });
      expect(files['aitk-artifact.json']).toBeDefined();
      expect(files['README.md']).toBeDefined();
      // Deve ter arquivo de configuração para claude-code (CLAUDE.md)
      expect(files['CLAUDE.md']).toBeDefined();
    });

    it('deve gerar template de hook', () => {
      const files = getTemplateFiles({ ...baseOptions, type: 'hook' });
      expect(files['aitk-artifact.json']).toBeDefined();
      expect(files['hook.sh']).toBeDefined();
      expect(files['README.md']).toBeDefined();
    });

    it('deve gerar template de template', () => {
      const files = getTemplateFiles({ ...baseOptions, type: 'template' });
      expect(files['aitk-artifact.json']).toBeDefined();
      expect(files['template.json']).toBeDefined();
      expect(files['skills/.gitkeep']).toBeDefined();
      expect(files['hooks/.gitkeep']).toBeDefined();
      expect(files['configs/.gitkeep']).toBeDefined();
    });

    it('deve incluir nome e descrição no aitk-artifact.json', () => {
      const files = getTemplateFiles(baseOptions);
      const manifest = JSON.parse(files['aitk-artifact.json']);
      expect(manifest.name).toBe('test-skill');
      expect(manifest.scope).toBe('my-user');
      expect(manifest.description).toBe('Skill de teste para validação');
      expect(manifest.type).toBe('skill');
      expect(manifest.version).toBe('0.1.0');
    });

    it('deve incluir frontmatter no SKILL.md', () => {
      const files = getTemplateFiles(baseOptions);
      expect(files['SKILL.md']).toContain('name: "test-skill"');
      expect(files['SKILL.md']).toContain('description: "Skill de teste para validação"');
    });
  });
});
