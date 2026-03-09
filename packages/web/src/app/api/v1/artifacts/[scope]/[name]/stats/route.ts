import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{ scope: string; name: string }>;
}

/** GET /api/v1/artifacts/:scope/:name/stats — Estatísticas de download */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { scope, name } = await params;
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '30d';

  const supabase = await createClient();

  // Buscar artefato
  const { data: artifact, error: artifactError } = await supabase
    .from('artifacts')
    .select('id, total_downloads, latest_version, created_at')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (artifactError || !artifact) {
    return apiError(
      'ARTIFACT_NOT_FOUND',
      `Artefato "${scope}/${name}" nao encontrado`,
      404,
    );
  }

  // Calcular intervalo de datas baseado no período
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date(artifact.created_at);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Buscar estatísticas diárias
  const { data: dailyStats } = await supabase
    .from('download_stats_daily')
    .select('date, count')
    .eq('artifact_id', artifact.id)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  // Buscar downloads por versão
  const { data: versionStats } = await supabase
    .from('downloads')
    .select(`
      version_id,
      artifact_versions (version)
    `)
    .eq('artifact_id', artifact.id)
    .gte('created_at', startDate.toISOString());

  // Agregar por versão
  const versionCounts: Record<string, number> = {};
  if (versionStats) {
    for (const download of versionStats) {
      const version = (download.artifact_versions as unknown as { version: string })?.version || 'unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    }
  }

  // Calcular downloads no período
  const periodDownloads = dailyStats?.reduce((sum, d) => sum + d.count, 0) || 0;

  return apiSuccess({
    totalDownloads: artifact.total_downloads,
    periodDownloads,
    period,
    dailyStats: dailyStats || [],
    versionBreakdown: Object.entries(versionCounts)
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count),
  });
}
