-- Índices de busca full-text e extensões

-- Extensão pg_trgm para busca por similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca full-text
CREATE INDEX idx_artifacts_search ON artifacts USING GIN(search_vector);

-- Índice trigram para busca fuzzy por nome
CREATE INDEX idx_artifacts_name_trgm ON artifacts USING GIN(name gin_trgm_ops);
CREATE INDEX idx_artifacts_description_trgm ON artifacts USING GIN(description gin_trgm_ops);

-- Função de busca otimizada
CREATE OR REPLACE FUNCTION search_artifacts(
  search_query TEXT,
  filter_type artifact_type DEFAULT NULL,
  filter_visibility artifact_visibility DEFAULT 'public',
  filter_tool TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  scope TEXT,
  name TEXT,
  slug TEXT,
  type artifact_type,
  visibility artifact_visibility,
  description TEXT,
  keywords TEXT[],
  tool_targets TEXT[],
  total_downloads INTEGER,
  latest_version TEXT,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.scope,
    a.name,
    a.slug,
    a.type,
    a.visibility,
    a.description,
    a.keywords,
    a.tool_targets,
    a.total_downloads,
    a.latest_version,
    a.is_verified,
    a.created_at,
    a.updated_at,
    CASE
      WHEN search_query IS NOT NULL AND search_query != '' THEN
        ts_rank_cd(a.search_vector, plainto_tsquery('english', search_query)) +
        similarity(a.name, search_query) * 2
      ELSE 0.0
    END AS rank
  FROM artifacts a
  WHERE
    a.visibility = filter_visibility
    AND (filter_type IS NULL OR a.type = filter_type)
    AND (filter_tool IS NULL OR filter_tool = ANY(a.tool_targets))
    AND a.is_deprecated = FALSE
    AND (
      search_query IS NULL
      OR search_query = ''
      OR a.search_vector @@ plainto_tsquery('english', search_query)
      OR similarity(a.name, search_query) > 0.1
    )
  ORDER BY
    CASE WHEN search_query IS NOT NULL AND search_query != '' THEN 0 ELSE 1 END,
    rank DESC,
    a.total_downloads DESC,
    a.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;
