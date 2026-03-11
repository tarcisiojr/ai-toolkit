import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Diretório de configuração do CLI */
const CONFIG_DIR = join(homedir(), '.aitk');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** Configuração do CLI */
export interface CliConfig {
  registry: string;
  defaultScope?: string;
  defaultTool: string;
  cacheDir: string;
  cacheMaxSize: string;
}

/** Configuração padrão */
const DEFAULT_CONFIG: CliConfig = {
  registry: 'https://ai-toolkit-henna.vercel.app',
  defaultTool: 'claude-code',
  cacheDir: join(CONFIG_DIR, 'cache'),
  cacheMaxSize: '500MB',
};

/** Garante que o diretório de configuração existe */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Lê a configuração atual */
export function getConfig(): CliConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Salva a configuração */
export function saveConfig(config: Partial<CliConfig>): void {
  ensureConfigDir();
  const current = getConfig();
  const merged = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}
