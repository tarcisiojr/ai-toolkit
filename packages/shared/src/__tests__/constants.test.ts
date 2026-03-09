import { describe, it, expect } from 'vitest';
import {
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_TYPE_DESCRIPTIONS,
} from '../constants/artifact-types.js';
import { TOOL_TARGET_INFO } from '../constants/tool-targets.js';

// ----- Testes das constantes de tipos de artefato -----
describe('ARTIFACT_TYPE_LABELS', () => {
  it('deve ter labels para todos os tipos de artefato', () => {
    const tiposEsperados = ['skill', 'mcp', 'template', 'config', 'hook'] as const;
    for (const tipo of tiposEsperados) {
      expect(ARTIFACT_TYPE_LABELS[tipo]).toBeDefined();
      expect(typeof ARTIFACT_TYPE_LABELS[tipo]).toBe('string');
      expect(ARTIFACT_TYPE_LABELS[tipo].length).toBeGreaterThan(0);
    }
  });

  it('deve retornar os labels corretos', () => {
    expect(ARTIFACT_TYPE_LABELS.skill).toBe('Skill');
    expect(ARTIFACT_TYPE_LABELS.mcp).toBe('MCP Server');
    expect(ARTIFACT_TYPE_LABELS.template).toBe('Template');
    expect(ARTIFACT_TYPE_LABELS.config).toBe('Configuração');
    expect(ARTIFACT_TYPE_LABELS.hook).toBe('Hook');
  });

  it('deve ter exatamente 5 tipos', () => {
    expect(Object.keys(ARTIFACT_TYPE_LABELS)).toHaveLength(5);
  });
});

describe('ARTIFACT_TYPE_DESCRIPTIONS', () => {
  it('deve ter descrições para todos os tipos de artefato', () => {
    const tiposEsperados = ['skill', 'mcp', 'template', 'config', 'hook'] as const;
    for (const tipo of tiposEsperados) {
      expect(ARTIFACT_TYPE_DESCRIPTIONS[tipo]).toBeDefined();
      expect(typeof ARTIFACT_TYPE_DESCRIPTIONS[tipo]).toBe('string');
      expect(ARTIFACT_TYPE_DESCRIPTIONS[tipo].length).toBeGreaterThan(10);
    }
  });

  it('deve ter as mesmas chaves que ARTIFACT_TYPE_LABELS', () => {
    const labelsKeys = Object.keys(ARTIFACT_TYPE_LABELS).sort();
    const descriptionsKeys = Object.keys(ARTIFACT_TYPE_DESCRIPTIONS).sort();
    expect(labelsKeys).toEqual(descriptionsKeys);
  });
});

// ----- Testes das constantes de ferramentas -----
describe('TOOL_TARGET_INFO', () => {
  const ferramentasEsperadas = [
    'claude-code',
    'opencode',
    'gemini-cli',
    'copilot-cli',
    'aider',
    'cursor',
  ] as const;

  it('deve ter informações para todas as ferramentas suportadas', () => {
    for (const ferramenta of ferramentasEsperadas) {
      expect(TOOL_TARGET_INFO[ferramenta]).toBeDefined();
    }
  });

  it('deve ter exatamente 6 ferramentas', () => {
    expect(Object.keys(TOOL_TARGET_INFO)).toHaveLength(6);
  });

  it('cada ferramenta deve ter label e configDir', () => {
    for (const ferramenta of ferramentasEsperadas) {
      const info = TOOL_TARGET_INFO[ferramenta];
      expect(info.label).toBeDefined();
      expect(typeof info.label).toBe('string');
      expect(info.label.length).toBeGreaterThan(0);

      expect(info.configDir).toBeDefined();
      expect(typeof info.configDir).toBe('string');
      expect(info.configDir.length).toBeGreaterThan(0);
    }
  });

  it('deve retornar os diretórios de configuração corretos', () => {
    expect(TOOL_TARGET_INFO['claude-code'].configDir).toBe('.claude');
    expect(TOOL_TARGET_INFO.opencode.configDir).toBe('.opencode');
    expect(TOOL_TARGET_INFO['gemini-cli'].configDir).toBe('.gemini');
    expect(TOOL_TARGET_INFO['copilot-cli'].configDir).toBe('.github/copilot');
    expect(TOOL_TARGET_INFO.aider.configDir).toBe('.aider');
    expect(TOOL_TARGET_INFO.cursor.configDir).toBe('.cursor');
  });

  it('deve retornar os labels corretos', () => {
    expect(TOOL_TARGET_INFO['claude-code'].label).toBe('Claude Code');
    expect(TOOL_TARGET_INFO.opencode.label).toBe('OpenCode');
    expect(TOOL_TARGET_INFO['gemini-cli'].label).toBe('Gemini CLI');
    expect(TOOL_TARGET_INFO['copilot-cli'].label).toBe('GitHub Copilot CLI');
    expect(TOOL_TARGET_INFO.aider.label).toBe('Aider');
    expect(TOOL_TARGET_INFO.cursor.label).toBe('Cursor');
  });
});
