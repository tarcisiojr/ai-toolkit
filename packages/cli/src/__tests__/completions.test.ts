import { describe, it, expect } from 'vitest';
import { completionsCommand } from '../commands/completions.js';

describe('completions command', () => {
  it('deve estar registrado como comando "completions"', () => {
    expect(completionsCommand.name()).toBe('completions');
  });

  it('deve ter descricao em portugues', () => {
    expect(completionsCommand.description()).toContain('autocompletion');
  });

  it('deve aceitar argumento de shell', () => {
    const args = completionsCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe('shell');
  });

  it('deve ter acao definida', () => {
    // Verifica que o comando tem um action handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listeners = (completionsCommand as any)._actionHandler;
    expect(listeners).toBeDefined();
  });
});
