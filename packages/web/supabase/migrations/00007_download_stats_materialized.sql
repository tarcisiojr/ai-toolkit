-- Migração: Estatísticas de downloads agregados
-- Cria view materializada para downloads diários e funções de consulta

-- View materializada para estatísticas diárias de downloads por artefato
CREATE MATERIALIZED VIEW IF NOT EXISTS download_stats_daily AS
SELECT
  artifact_id,
  DATE(created_at) AS download_date,
  COUNT(*) AS download_count
FROM downloads
GROUP BY artifact_id, DATE(created_at)
ORDER BY download_date DESC;

-- Índice para consultas rápidas por artefato e data
CREATE UNIQUE INDEX IF NOT EXISTS idx_download_stats_daily_unique
  ON download_stats_daily (artifact_id, download_date);

CREATE INDEX IF NOT EXISTS idx_download_stats_daily_date
  ON download_stats_daily (download_date DESC);

-- View para downloads semanais (últimas 12 semanas)
CREATE OR REPLACE VIEW download_stats_weekly AS
SELECT
  artifact_id,
  DATE_TRUNC('week', download_date)::date AS week_start,
  SUM(download_count) AS download_count
FROM download_stats_daily
WHERE download_date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY artifact_id, DATE_TRUNC('week', download_date)
ORDER BY week_start DESC;

-- View para artefatos trending (mais downloads nos últimos 7 dias)
CREATE OR REPLACE VIEW trending_artifacts AS
SELECT
  a.id,
  a.scope,
  a.name,
  a.type,
  a.description,
  a.latest_version,
  a.keywords,
  a.total_downloads,
  COALESCE(recent.recent_downloads, 0) AS recent_downloads,
  a.created_at,
  a.updated_at
FROM artifacts a
LEFT JOIN (
  SELECT
    artifact_id,
    SUM(download_count) AS recent_downloads
  FROM download_stats_daily
  WHERE download_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY artifact_id
) recent ON a.id = recent.artifact_id
WHERE a.visibility = 'public'
ORDER BY COALESCE(recent.recent_downloads, 0) DESC, a.total_downloads DESC;

-- Função para atualizar a view materializada (chamada via cron ou trigger)
CREATE OR REPLACE FUNCTION refresh_download_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY download_stats_daily;
END;
$$;

-- Função para obter downloads semanais de um artefato específico
CREATE OR REPLACE FUNCTION get_weekly_downloads(
  p_artifact_id uuid,
  p_weeks integer DEFAULT 7
)
RETURNS TABLE (
  week_start date,
  download_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.week::date AS week_start,
    COALESCE(SUM(d.download_count), 0)::bigint AS download_count
  FROM generate_series(
    DATE_TRUNC('week', CURRENT_DATE - (p_weeks || ' weeks')::interval)::date,
    DATE_TRUNC('week', CURRENT_DATE)::date,
    '1 week'::interval
  ) gs(week)
  LEFT JOIN download_stats_daily d
    ON d.artifact_id = p_artifact_id
    AND DATE_TRUNC('week', d.download_date) = gs.week
  GROUP BY gs.week
  ORDER BY gs.week ASC;
END;
$$;

-- Política RLS: permitir leitura pública das views (são views, herdam as políticas das tabelas base)
-- A view materializada não usa RLS, mas é somente leitura

-- Comentários descritivos
COMMENT ON MATERIALIZED VIEW download_stats_daily IS 'Estatísticas diárias de downloads por artefato (materializada para performance)';
COMMENT ON VIEW download_stats_weekly IS 'Estatísticas semanais de downloads (últimas 12 semanas)';
COMMENT ON VIEW trending_artifacts IS 'Artefatos populares ordenados por downloads recentes';
COMMENT ON FUNCTION refresh_download_stats IS 'Atualiza a view materializada de estatísticas de downloads';
COMMENT ON FUNCTION get_weekly_downloads IS 'Retorna downloads semanais de um artefato específico';
