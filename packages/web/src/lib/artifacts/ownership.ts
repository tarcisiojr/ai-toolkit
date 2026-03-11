/**
 * Verifica se um usuário é proprietário de um artefato
 * Considera ownership direto e membership de time (owner/admin)
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface ArtifactOwnership {
  owner_user_id: string | null;
  owner_team_id: string | null;
}

/**
 * Verifica se o userId é owner do artefato
 * - Owner direto: artifact.owner_user_id === userId
 * - Owner via time: userId é membro do time com role 'owner' ou 'admin'
 */
export async function checkOwnership(
  supabase: SupabaseClient,
  userId: string,
  artifact: ArtifactOwnership,
): Promise<boolean> {
  // Owner direto
  if (artifact.owner_user_id === userId) {
    return true;
  }

  // Owner via time
  if (artifact.owner_team_id) {
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', artifact.owner_team_id)
      .eq('user_id', userId)
      .single();

    if (member && (member.role === 'owner' || member.role === 'admin')) {
      return true;
    }
  }

  return false;
}
