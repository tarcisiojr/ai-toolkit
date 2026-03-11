// Configuração do commitlint para validar mensagens de commit convencionais
// Referência: https://www.conventionalcommits.org/pt-br/v1.0.0/
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos de commit
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação (sem mudança de lógica)
        'refactor', // Refatoração de código
        'perf',     // Melhoria de performance
        'test',     // Adição/correção de testes
        'build',    // Mudanças no sistema de build
        'ci',       // Mudanças no CI/CD
        'chore',    // Tarefas gerais (deps, configs)
        'revert',   // Reverter commit anterior
      ],
    ],
    // Escopos permitidos (pacotes do monorepo + utilitários)
    'scope-enum': [
      1, // warning — permite escopos não listados
      'always',
      [
        'shared',   // packages/shared
        'cli',      // packages/cli
        'web',      // packages/web
        'deps',     // Atualizações de dependências
        'ci',       // Configurações de CI
        'release',  // Releases automáticas
      ],
    ],
  },
};
