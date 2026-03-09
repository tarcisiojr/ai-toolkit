/**
 * Tipos relacionados a usuários e perfis.
 */

/** Perfil público do usuário */
export interface Profile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  githubUsername?: string;
  createdAt: string;
  updatedAt: string;
}

/** Dados de autenticação do CLI */
export interface CliAuth {
  token: string;
  user: Pick<Profile, 'id' | 'username'> & { email: string };
  createdAt: string;
  registry: string;
}

/** Token de API */
export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}
