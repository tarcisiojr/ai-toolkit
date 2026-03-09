import { describe, it, expect } from 'vitest';
import {
  artifactTypeSchema,
  artifactVisibilitySchema,
  toolTargetSchema,
  installConfigSchema,
  dependencySchema,
  artifactManifestSchema,
  projectManifestSchema,
  semverSchema,
} from '../validators/artifact.js';

// ----- Testes do schema de tipo de artefato -----
describe('artifactTypeSchema', () => {
  it('deve aceitar todos os tipos válidos', () => {
    const tiposValidos = ['skill', 'mcp', 'template', 'config', 'hook'];
    for (const tipo of tiposValidos) {
      const resultado = artifactTypeSchema.safeParse(tipo);
      expect(resultado.success).toBe(true);
    }
  });

  it('deve rejeitar tipos inválidos', () => {
    const resultado = artifactTypeSchema.safeParse('invalido');
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar valores vazios', () => {
    const resultado = artifactTypeSchema.safeParse('');
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar valores nulos e undefined', () => {
    expect(artifactTypeSchema.safeParse(null).success).toBe(false);
    expect(artifactTypeSchema.safeParse(undefined).success).toBe(false);
  });
});

// ----- Testes do schema de visibilidade -----
describe('artifactVisibilitySchema', () => {
  it('deve aceitar todas as visibilidades válidas', () => {
    const visibilidades = ['public', 'private', 'team'];
    for (const vis of visibilidades) {
      const resultado = artifactVisibilitySchema.safeParse(vis);
      expect(resultado.success).toBe(true);
    }
  });

  it('deve rejeitar visibilidades inválidas', () => {
    const resultado = artifactVisibilitySchema.safeParse('unlisted');
    expect(resultado.success).toBe(false);
  });
});

// ----- Testes do schema de tool target -----
describe('toolTargetSchema', () => {
  it('deve aceitar todas as ferramentas válidas', () => {
    const ferramentas = ['claude-code', 'opencode', 'gemini-cli', 'copilot-cli', 'aider', 'cursor'];
    for (const ferramenta of ferramentas) {
      const resultado = toolTargetSchema.safeParse(ferramenta);
      expect(resultado.success).toBe(true);
    }
  });

  it('deve rejeitar ferramentas não suportadas', () => {
    expect(toolTargetSchema.safeParse('vscode').success).toBe(false);
    expect(toolTargetSchema.safeParse('chatgpt').success).toBe(false);
  });
});

// ----- Testes do schema de configuração de instalação -----
describe('installConfigSchema', () => {
  it('deve aceitar configuração válida', () => {
    const config = { target: 'claude-code', entrypoint: 'SKILL.md' };
    const resultado = installConfigSchema.safeParse(config);
    expect(resultado.success).toBe(true);
  });

  it('deve rejeitar target vazio', () => {
    const config = { target: '', entrypoint: 'SKILL.md' };
    const resultado = installConfigSchema.safeParse(config);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar entrypoint vazio', () => {
    const config = { target: 'claude-code', entrypoint: '' };
    const resultado = installConfigSchema.safeParse(config);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar objeto sem campos obrigatórios', () => {
    expect(installConfigSchema.safeParse({}).success).toBe(false);
    expect(installConfigSchema.safeParse({ target: 'x' }).success).toBe(false);
    expect(installConfigSchema.safeParse({ entrypoint: 'x' }).success).toBe(false);
  });
});

// ----- Testes do schema de dependência -----
describe('dependencySchema', () => {
  it('deve aceitar dependência válida', () => {
    const dep = {
      scope: 'community',
      name: 'my-skill',
      versionRange: '^1.0.0',
      isOptional: false,
    };
    const resultado = dependencySchema.safeParse(dep);
    expect(resultado.success).toBe(true);
  });

  it('deve aplicar default false para isOptional quando omitido', () => {
    const dep = {
      scope: 'community',
      name: 'my-skill',
      versionRange: '^1.0.0',
    };
    const resultado = dependencySchema.safeParse(dep);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.isOptional).toBe(false);
    }
  });

  it('deve rejeitar scope com caracteres inválidos', () => {
    const dep = {
      scope: 'UPPERCASE',
      name: 'my-skill',
      versionRange: '^1.0.0',
    };
    const resultado = dependencySchema.safeParse(dep);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar name com caracteres inválidos', () => {
    const dep = {
      scope: 'community',
      name: 'My Skill!',
      versionRange: '^1.0.0',
    };
    const resultado = dependencySchema.safeParse(dep);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar versionRange vazio', () => {
    const dep = {
      scope: 'community',
      name: 'my-skill',
      versionRange: '',
    };
    const resultado = dependencySchema.safeParse(dep);
    expect(resultado.success).toBe(false);
  });

  it('deve aceitar nomes com pontos, hífens e underscores', () => {
    const dep = {
      scope: 'my-org',
      name: 'my.skill_v2',
      versionRange: '>=1.0.0',
    };
    const resultado = dependencySchema.safeParse(dep);
    expect(resultado.success).toBe(true);
  });
});

// ----- Testes do manifesto de artefato -----
describe('artifactManifestSchema', () => {
  // Manifesto válido base para reutilizar nos testes
  const manifestoValido = {
    name: 'my-skill',
    scope: 'community',
    version: '1.0.0',
    type: 'skill' as const,
    description: 'Uma skill de exemplo para testes unitários',
    toolTargets: ['claude-code' as const],
    files: ['SKILL.md'],
    install: {
      'claude-code': { target: 'claude-code', entrypoint: 'SKILL.md' },
    },
  };

  it('deve aceitar manifesto válido completo', () => {
    const resultado = artifactManifestSchema.safeParse(manifestoValido);
    expect(resultado.success).toBe(true);
  });

  it('deve aplicar defaults para campos opcionais', () => {
    const resultado = artifactManifestSchema.safeParse(manifestoValido);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.keywords).toEqual([]);
      expect(resultado.data.categories).toEqual([]);
      expect(resultado.data.license).toBe('MIT');
      expect(resultado.data.dependencies).toEqual({});
    }
  });

  it('deve aceitar manifesto com todos os campos opcionais preenchidos', () => {
    const completo = {
      ...manifestoValido,
      keywords: ['ai', 'skill'],
      categories: ['development'],
      license: 'Apache-2.0',
      repository: 'https://github.com/user/repo',
      dependencies: { 'community/base': '^1.0.0' },
    };
    const resultado = artifactManifestSchema.safeParse(completo);
    expect(resultado.success).toBe(true);
  });

  it('deve rejeitar nome com caracteres inválidos', () => {
    const invalido = { ...manifestoValido, name: 'My Skill!' };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar nome começando com caractere especial', () => {
    const invalido = { ...manifestoValido, name: '-my-skill' };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar nome terminando com caractere especial', () => {
    const invalido = { ...manifestoValido, name: 'my-skill-' };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve aceitar nome com apenas um caractere alfanumérico', () => {
    const valido = { ...manifestoValido, name: 'a' };
    const resultado = artifactManifestSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
  });

  it('deve rejeitar versão em formato inválido', () => {
    const invalido = { ...manifestoValido, version: 'v1.0' };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve aceitar versão com pre-release', () => {
    const valido = { ...manifestoValido, version: '1.0.0-beta.1' };
    const resultado = artifactManifestSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
  });

  it('deve rejeitar descrição muito curta', () => {
    const invalido = { ...manifestoValido, description: 'curta' };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar descrição com mais de 280 caracteres', () => {
    const invalido = { ...manifestoValido, description: 'a'.repeat(281) };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar toolTargets vazio', () => {
    const invalido = { ...manifestoValido, toolTargets: [] };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar files vazio', () => {
    const invalido = { ...manifestoValido, files: [] };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar repository com URL inválida', () => {
    const invalido = { ...manifestoValido, repository: 'nao-eh-url' };
    const resultado = artifactManifestSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar manifesto sem campos obrigatórios', () => {
    expect(artifactManifestSchema.safeParse({}).success).toBe(false);
    expect(artifactManifestSchema.safeParse({ name: 'test' }).success).toBe(false);
  });

  it('deve aceitar múltiplos toolTargets', () => {
    const valido = {
      ...manifestoValido,
      toolTargets: ['claude-code', 'cursor', 'aider'] as const,
    };
    const resultado = artifactManifestSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
  });

  it('deve aceitar múltiplas configurações de instalação', () => {
    const valido = {
      ...manifestoValido,
      install: {
        'claude-code': { target: 'claude-code', entrypoint: 'SKILL.md' },
        cursor: { target: 'cursor', entrypoint: '.cursorrules' },
      },
    };
    const resultado = artifactManifestSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
  });
});

// ----- Testes do manifesto de projeto -----
describe('projectManifestSchema', () => {
  it('deve aceitar manifesto de projeto válido', () => {
    const manifesto = {
      version: '1.0.0',
      tool: 'claude-code',
      artifacts: { 'community/my-skill': '^1.0.0' },
    };
    const resultado = projectManifestSchema.safeParse(manifesto);
    expect(resultado.success).toBe(true);
  });

  it('deve aplicar defaults quando campos são omitidos', () => {
    const manifesto = {
      tool: 'claude-code',
    };
    const resultado = projectManifestSchema.safeParse(manifesto);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.version).toBe('1.0.0');
      expect(resultado.data.artifacts).toEqual({});
      expect(resultado.data.devArtifacts).toEqual({});
    }
  });

  it('deve aceitar manifesto com devArtifacts', () => {
    const manifesto = {
      tool: 'cursor',
      artifacts: {},
      devArtifacts: { 'community/debug-helper': '^0.1.0' },
    };
    const resultado = projectManifestSchema.safeParse(manifesto);
    expect(resultado.success).toBe(true);
  });

  it('deve rejeitar tool inválida', () => {
    const manifesto = {
      tool: 'ferramenta-inexistente',
      artifacts: {},
    };
    const resultado = projectManifestSchema.safeParse(manifesto);
    expect(resultado.success).toBe(false);
  });

  it('deve rejeitar manifesto sem tool', () => {
    const manifesto = {
      artifacts: {},
    };
    const resultado = projectManifestSchema.safeParse(manifesto);
    expect(resultado.success).toBe(false);
  });
});

// ----- Testes do schema de versão semver -----
describe('semverSchema', () => {
  it('deve aceitar versões semver válidas', () => {
    const versoesValidas = ['0.0.1', '1.0.0', '1.2.3', '10.20.30', '999.999.999'];
    for (const versao of versoesValidas) {
      const resultado = semverSchema.safeParse(versao);
      expect(resultado.success).toBe(true);
    }
  });

  it('deve aceitar versões com pre-release', () => {
    const versoes = ['1.0.0-alpha', '1.0.0-beta.1', '1.0.0-rc.2', '2.0.0-SNAPSHOT'];
    for (const versao of versoes) {
      const resultado = semverSchema.safeParse(versao);
      expect(resultado.success).toBe(true);
    }
  });

  it('deve rejeitar versões em formato inválido', () => {
    const versoesInvalidas = [
      'v1.0.0',       // prefixo 'v' não permitido
      '1.0',          // faltando patch
      '1',            // apenas major
      '1.0.0.0',      // quatro segmentos
      'abc',          // texto
      '',             // vazio
      '1.0.0-',       // pre-release vazio
    ];
    for (const versao of versoesInvalidas) {
      const resultado = semverSchema.safeParse(versao);
      expect(resultado.success).toBe(false);
    }
  });

  it('deve rejeitar valores não string', () => {
    expect(semverSchema.safeParse(100).success).toBe(false);
    expect(semverSchema.safeParse(null).success).toBe(false);
    expect(semverSchema.safeParse(undefined).success).toBe(false);
  });
});
