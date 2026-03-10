import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api/auth';

/**
 * GET /api/v1/artifacts/trending — Artefatos populares/trending
 *
 * Retorna artefatos ordenados por downloads recentes (últimos 7 dias)
 * com fallback para total_downloads quando não há dados recentes.
 */
export async function GET() {
  const supabase = await createClient();

  // Buscar artefatos públicos ordenados por downloads totais
  // Em produção com a view materializada, usaria a view trending_artifacts
  const { data, error } = await supabase
    .from('artifacts')
    .select('id, scope, name, type, description, latest_version, keywords, tool_targets, total_downloads, created_at, updated_at')
    .eq('visibility', 'public')
    .eq('is_deprecated', false)
    .order('total_downloads', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(12);

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  // Buscar artefatos mais recentes separadamente
  const { data: recent } = await supabase
    .from('artifacts')
    .select('id, scope, name, type, description, latest_version, keywords, tool_targets, total_downloads, created_at, updated_at')
    .eq('visibility', 'public')
    .eq('is_deprecated', false)
    .order('created_at', { ascending: false })
    .limit(6);

  // Buscar artefatos atualizados recentemente
  const { data: updated } = await supabase
    .from('artifacts')
    .select('id, scope, name, type, description, latest_version, keywords, tool_targets, total_downloads, created_at, updated_at')
    .eq('visibility', 'public')
    .eq('is_deprecated', false)
    .not('latest_version', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(6);

  return apiSuccess({
    trending: data || [],
    recent: recent || [],
    updated: updated || [],
  });
}
