import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CliAuth } from '@ai-toolkit/shared';

const AUTH_FILE = join(homedir(), '.aitk', 'auth.json');

/** Lê os dados de autenticação */
export function getAuth(): CliAuth | null {
  if (!existsSync(AUTH_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(AUTH_FILE, 'utf-8');
    return JSON.parse(content) as CliAuth;
  } catch {
    return null;
  }
}

/** Salva os dados de autenticação */
export function saveAuth(auth: CliAuth): void {
  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

/** Remove os dados de autenticação */
export function clearAuth(): void {
  if (existsSync(AUTH_FILE)) {
    unlinkSync(AUTH_FILE);
  }
}

/** Verifica se está autenticado */
export function isAuthenticated(): boolean {
  return getAuth() !== null;
}

/** Retorna o token de autenticação ou lança erro */
export function requireAuth(): CliAuth {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Não autenticado. Execute "aitk login" primeiro.');
  }
  return auth;
}
