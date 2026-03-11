/**
 * Testes do TemplateInstaller.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ArtifactManifest } from '@tarcisiojr/shared';
import { TemplateInstaller } from '../installers/template-installer.js';

describe('TemplateInstaller', () => {
  let installer: TemplateInstaller;
  let testDir: string;
  let extractDir: string;

  const baseManifest: ArtifactManifest = {
    name: 'test-template',
    scope: 'test',
    version: '1.0.0',
    type: 'template',
    description: 'Template de teste',
    toolTargets: ['claude-code'],
    files: [],
    install: {},
  };

  beforeEach(() => {
    installer = new TemplateInstaller();
    testDir = join(tmpdir(), `aitk-test-template-${Date.now()}`);
    extractDir = join(tmpdir(), `aitk-test-extract-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(extractDir, { recursive: true });
  });

  afterEach(() => {
    // Limpar diretórios temporários
    try {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
      if (existsSync(extractDir)) rmSync(extractDir, { recursive: true, force: true });
    } catch {
      // Ignora erros de limpeza
    }
  });

  it('tipo é template', () => {
    expect(installer.type).toBe('template');
  });

  it('getInstallPath retorna projectRoot', () => {
    const path = installer.getInstallPath(baseManifest, testDir, 'claude-code');
    expect(path).toBe(testDir);
  });

  it('instala artefatos guiados por template.json', async () => {
    // Criar estrutura de template com template.json
    const templateConfig = {
      entries: [
        {
          type: 'skill',
          name: 'my-skill',
          path: 'skills/my-skill',
          description: 'Uma skill de teste',
        },
      ],
      postInstallHints: ['Execute aitk list para verificar'],
    };

    writeFileSync(join(extractDir, 'template.json'), JSON.stringify(templateConfig));

    // Criar diretório de skill
    const skillDir = join(extractDir, 'skills', 'my-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Minha skill de teste');

    const result = await installer.install(baseManifest, extractDir, testDir, 'claude-code');

    expect(result.success).toBe(true);
    expect(result.filesInstalled.length).toBeGreaterThan(0);
    expect(result.message).toContain('aitk list');
  });

  it('instala por convenção de diretórios quando template.json não existe', async () => {
    // Criar estrutura por convenção (diretório "skills")
    const skillDir = join(extractDir, 'skills');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Skill via convenção');

    const result = await installer.install(baseManifest, extractDir, testDir, 'claude-code');

    expect(result.success).toBe(true);
    expect(result.filesInstalled.length).toBeGreaterThan(0);
  });

  it('retorna falha quando não há artefatos para instalar', async () => {
    // Diretório vazio sem template.json nem diretórios convencionais
    const result = await installer.install(baseManifest, extractDir, testDir, 'claude-code');

    expect(result.success).toBe(false);
    expect(result.filesInstalled.length).toBe(0);
  });

  it('ignora entradas do template.json com path inexistente', async () => {
    const templateConfig = {
      entries: [
        {
          type: 'skill',
          name: 'skill-inexistente',
          path: 'nao-existe',
        },
      ],
    };

    writeFileSync(join(extractDir, 'template.json'), JSON.stringify(templateConfig));

    const result = await installer.install(baseManifest, extractDir, testDir, 'claude-code');

    expect(result.success).toBe(false);
  });

  it('instala múltiplos artefatos de diferentes tipos', async () => {
    const templateConfig = {
      entries: [
        { type: 'skill', name: 'review', path: 'skills/review' },
        { type: 'hook', name: 'pre-commit', path: 'hooks/pre-commit' },
      ],
    };

    writeFileSync(join(extractDir, 'template.json'), JSON.stringify(templateConfig));

    // Criar diretórios
    const skillDir = join(extractDir, 'skills', 'review');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Code Review Skill');

    const hookDir = join(extractDir, 'hooks', 'pre-commit');
    mkdirSync(hookDir, { recursive: true });
    writeFileSync(join(hookDir, 'hook.sh'), '#!/bin/bash\necho "hook"');

    const result = await installer.install(baseManifest, extractDir, testDir, 'claude-code');

    expect(result.success).toBe(true);
    expect(result.filesInstalled.length).toBeGreaterThan(1);
  });
});
