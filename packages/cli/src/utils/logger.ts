import chalk from 'chalk';

// ── Banner ASCII art do AITK ───────────────────────────────────────────
const BANNER = `
${chalk.cyan.bold('   ___    ____  ______  __ __')}
${chalk.cyan.bold('  / _ |  /  _/ /_  __/ / //_/')}
${chalk.cyan.bold(' / __ | _/ /    / /   / ,<   ')}
${chalk.cyan.bold('/_/ |_|/___/   /_/   /_/|_|  ')}
`;

const BANNER_SUBTITLE = chalk.gray('  AI Toolkit — Gerenciador de artefatos para AI coding\n');

// ── Caracteres de box drawing ──────────────────────────────────────────
const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  teeLeft: '├',
  teeRight: '┤',
} as const;

// ── Prefixo estilizado para mensagens ──────────────────────────────────
const PREFIX = chalk.bold.cyan('aitk');

/** Repete um caractere N vezes */
function repeat(char: string, count: number): string {
  return char.repeat(Math.max(0, count));
}

/** Remove sequencias ANSI para calcular largura visivel */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B\[[0-9;]*m/g, '');
}

/** Calcula a largura visivel de uma string (sem codigos ANSI) */
function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Desenha uma caixa com borda ao redor de linhas de texto.
 * Suporta texto colorido (calcula largura sem codigos ANSI).
 */
function box(lines: string[], padding = 1): string {
  const maxLen = Math.max(...lines.map(visibleLength));
  const innerWidth = maxLen + padding * 2;
  const pad = repeat(' ', padding);

  const top = `${BOX.topLeft}${repeat(BOX.horizontal, innerWidth)}${BOX.topRight}`;
  const bottom = `${BOX.bottomLeft}${repeat(BOX.horizontal, innerWidth)}${BOX.bottomRight}`;

  const body = lines.map((line) => {
    const gap = innerWidth - visibleLength(line) - padding * 2;
    return `${BOX.vertical}${pad}${line}${repeat(' ', gap)}${pad}${BOX.vertical}`;
  });

  return [top, ...body, bottom].join('\n');
}

/**
 * Desenha uma linha divisoria horizontal.
 * Utiliza o caractere tee para separar secoes dentro de uma caixa.
 */
function divider(width: number): string {
  return `${BOX.teeLeft}${repeat(BOX.horizontal, width)}${BOX.teeRight}`;
}

// ── Cores por tipo de artefato ─────────────────────────────────────────
const TYPE_COLORS: Record<string, (text: string) => string> = {
  skill: chalk.cyan,
  mcp: chalk.green,
  template: chalk.magenta,
  config: chalk.yellow,
  hook: chalk.red,
};

/** Retorna o texto colorido conforme o tipo do artefato */
function colorByType(type: string, text: string): string {
  const colorFn = TYPE_COLORS[type] || chalk.white;
  return colorFn(text);
}

/** Badge com fundo colorido por tipo */
function typeBadge(type: string): string {
  const badges: Record<string, string> = {
    skill: chalk.bgCyan.black.bold(` ${type.toUpperCase()} `),
    mcp: chalk.bgGreen.black.bold(` ${type.toUpperCase()} `),
    template: chalk.bgMagenta.white.bold(` ${type.toUpperCase()} `),
    config: chalk.bgYellow.black.bold(` ${type.toUpperCase()} `),
    hook: chalk.bgRed.white.bold(` ${type.toUpperCase()} `),
  };
  return badges[type] || chalk.bgGray.white.bold(` ${type.toUpperCase()} `);
}

/** Badge de downloads */
function downloadsBadge(count: number): string {
  if (count >= 1_000_000) {
    return chalk.gray(`  ${chalk.white.bold(`${(count / 1_000_000).toFixed(1)}M`)} downloads`);
  }
  if (count >= 1_000) {
    return chalk.gray(`  ${chalk.white.bold(`${(count / 1_000).toFixed(1)}K`)} downloads`);
  }
  return chalk.gray(`  ${chalk.white.bold(String(count))} downloads`);
}

// ── Indicadores de passo ───────────────────────────────────────────────

/** Cria indicador de passo numerado: [1/4] */
function stepIndicator(current: number, total: number): string {
  return chalk.cyan.bold(`[${current}/${total}]`);
}

/** Linha de separacao simples */
function separator(): void {
  console.log(chalk.gray(repeat('─', 50)));
}

// ── Formatacao de tabela ───────────────────────────────────────────────

interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

interface TableOptions {
  columns: TableColumn[];
  rows: string[][];
}

/** Renderiza uma tabela formatada com box drawing */
function table({ columns, rows }: TableOptions): string {
  const output: string[] = [];

  // Linha superior
  const topLine = BOX.topLeft +
    columns.map((col) => repeat(BOX.horizontal, col.width + 2)).join(BOX.horizontal) +
    BOX.topRight;
  output.push(topLine);

  // Cabecalho
  const headerLine = BOX.vertical +
    columns
      .map((col) => {
        const text = chalk.bold.white(col.header);
        const gap = col.width - visibleLength(col.header);
        return ` ${text}${repeat(' ', gap)} `;
      })
      .join(BOX.vertical) +
    BOX.vertical;
  output.push(headerLine);

  // Separador do cabecalho
  const sepLine = BOX.teeLeft +
    columns.map((col) => repeat(BOX.horizontal, col.width + 2)).join('┼') +
    BOX.teeRight;
  output.push(sepLine);

  // Linhas de dados
  for (const row of rows) {
    const rowLine = BOX.vertical +
      columns
        .map((col, i) => {
          const cell = row[i] || '';
          const gap = col.width - visibleLength(cell);
          if (col.align === 'right') {
            return ` ${repeat(' ', gap)}${cell} `;
          }
          return ` ${cell}${repeat(' ', gap)} `;
        })
        .join(BOX.vertical) +
      BOX.vertical;
    output.push(rowLine);
  }

  // Linha inferior
  const bottomLine = BOX.bottomLeft +
    columns.map((col) => repeat(BOX.horizontal, col.width + 2)).join(BOX.horizontal) +
    BOX.bottomRight;
  output.push(bottomLine);

  return output.join('\n');
}

// ── Arvore de arquivos ─────────────────────────────────────────────────

/** Renderiza uma arvore de arquivos no estilo tree */
function fileTree(files: string[], title?: string): string {
  const output: string[] = [];

  if (title) {
    output.push(chalk.bold(title));
  }

  for (let i = 0; i < files.length; i++) {
    const isLast = i === files.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    output.push(chalk.gray(prefix) + chalk.white(files[i]));
  }

  return output.join('\n');
}

// ── Logger principal ───────────────────────────────────────────────────

/** Utilitarios de log formatado para o CLI */
export const logger = {
  // ── Mensagens basicas ──────────────────────────────────────────────
  info: (message: string) => {
    console.log(`  ${PREFIX} ${chalk.cyan('info')}  ${message}`);
  },

  success: (message: string) => {
    console.log(`  ${PREFIX} ${chalk.green.bold('ok')}    ${chalk.green(message)}`);
  },

  warn: (message: string) => {
    console.log(`  ${PREFIX} ${chalk.yellow('warn')}  ${chalk.yellow(message)}`);
  },

  error: (message: string) => {
    console.error(`  ${PREFIX} ${chalk.red.bold('err')}   ${chalk.red(message)}`);
  },

  debug: (message: string) => {
    if (process.env.AITK_DEBUG) {
      console.log(`  ${PREFIX} ${chalk.gray('dbg')}   ${chalk.gray(message)}`);
    }
  },

  // ── Saida em branco (sem prefixo) ──────────────────────────────────
  print: (message: string) => {
    console.log(message);
  },

  blank: () => {
    console.log();
  },

  // ── Banner ─────────────────────────────────────────────────────────
  banner: () => {
    console.log(BANNER);
    console.log(BANNER_SUBTITLE);
  },

  // ── Componentes visuais ────────────────────────────────────────────
  box,
  divider,
  table,
  separator,
  fileTree,
  stepIndicator,

  // ── Cores e badges ─────────────────────────────────────────────────
  colorByType,
  typeBadge,
  downloadsBadge,

  // ── Constantes reutilizaveis ───────────────────────────────────────
  PREFIX,
  BOX,
};
