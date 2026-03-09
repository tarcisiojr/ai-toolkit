/**
 * Tipos relacionados a equipes.
 */

/** Papéis dentro de uma equipe */
export type TeamRole = 'owner' | 'admin' | 'member';

/** Equipe */
export interface Team {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  website?: string;
  isPersonal: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Membro de uma equipe */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
}
