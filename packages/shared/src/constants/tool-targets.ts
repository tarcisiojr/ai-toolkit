import type { ToolTarget } from '../types/artifact.js';

/** Informações sobre ferramentas de AI suportadas */
export const TOOL_TARGET_INFO: Record<ToolTarget, { label: string; configDir: string }> = {
  'claude-code': {
    label: 'Claude Code',
    configDir: '.claude',
  },
  opencode: {
    label: 'OpenCode',
    configDir: '.opencode',
  },
  'gemini-cli': {
    label: 'Gemini CLI',
    configDir: '.gemini',
  },
  'copilot-cli': {
    label: 'GitHub Copilot CLI',
    configDir: '.github/copilot',
  },
  aider: {
    label: 'Aider',
    configDir: '.aider',
  },
  cursor: {
    label: 'Cursor',
    configDir: '.cursor',
  },
};
