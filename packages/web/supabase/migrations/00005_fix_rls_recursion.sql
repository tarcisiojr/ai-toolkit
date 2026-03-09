-- Corrigir recursão infinita nas policies de team_members
-- A policy de SELECT referenciava a própria tabela causando loop infinito

-- 1. Criar funções helper SECURITY DEFINER para verificar membership sem RLS
CREATE OR REPLACE FUNCTION is_team_member(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = check_team_id
    AND team_members.user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_team_admin(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = check_team_id
    AND team_members.user_id = check_user_id
    AND team_members.role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Recriar policies de team_members sem auto-referência
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (true);

CREATE POLICY "team_members_insert" ON team_members FOR INSERT
  WITH CHECK (is_team_admin(team_id, auth.uid()));

CREATE POLICY "team_members_update" ON team_members FOR UPDATE
  USING (is_team_admin(team_id, auth.uid()));

CREATE POLICY "team_members_delete" ON team_members FOR DELETE
  USING (is_team_admin(team_id, auth.uid()) AND role != 'owner');

-- 3. Atualizar policies de artifacts usando helper functions
DROP POLICY IF EXISTS "artifacts_select_team" ON artifacts;
CREATE POLICY "artifacts_select_team" ON artifacts FOR SELECT
  USING (visibility = 'team' AND is_team_member(owner_team_id, auth.uid()));

DROP POLICY IF EXISTS "artifacts_insert_user" ON artifacts;
CREATE POLICY "artifacts_insert_user" ON artifacts FOR INSERT
  WITH CHECK (owner_user_id = auth.uid() OR is_team_admin(owner_team_id, auth.uid()));

DROP POLICY IF EXISTS "artifacts_update" ON artifacts;
CREATE POLICY "artifacts_update" ON artifacts FOR UPDATE
  USING (owner_user_id = auth.uid() OR is_team_admin(owner_team_id, auth.uid()));

DROP POLICY IF EXISTS "artifacts_delete" ON artifacts;
CREATE POLICY "artifacts_delete" ON artifacts FOR DELETE
  USING (owner_user_id = auth.uid() OR is_team_admin(owner_team_id, auth.uid()));

-- 4. Atualizar policies de versions
DROP POLICY IF EXISTS "versions_insert" ON artifact_versions;
CREATE POLICY "versions_insert" ON artifact_versions FOR INSERT
  WITH CHECK (artifact_id IN (SELECT id FROM artifacts WHERE owner_user_id = auth.uid() OR is_team_admin(owner_team_id, auth.uid())));

DROP POLICY IF EXISTS "versions_update" ON artifact_versions;
CREATE POLICY "versions_update" ON artifact_versions FOR UPDATE
  USING (artifact_id IN (SELECT id FROM artifacts WHERE owner_user_id = auth.uid() OR is_team_admin(owner_team_id, auth.uid())));

-- 5. Atualizar policies de teams
DROP POLICY IF EXISTS "teams_update_owner" ON teams;
CREATE POLICY "teams_update_owner" ON teams FOR UPDATE USING (is_team_admin(id, auth.uid()));

DROP POLICY IF EXISTS "teams_delete_owner" ON teams;
CREATE POLICY "teams_delete_owner" ON teams FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role = 'owner'));

-- 6. Atualizar policy de dependencies
DROP POLICY IF EXISTS "dependencies_insert" ON artifact_dependencies;
CREATE POLICY "dependencies_insert" ON artifact_dependencies FOR INSERT
  WITH CHECK (version_id IN (SELECT av.id FROM artifact_versions av JOIN artifacts a ON a.id = av.artifact_id WHERE a.owner_user_id = auth.uid() OR is_team_admin(a.owner_team_id, auth.uid())));

-- 7. Corrigir tipo de retorno do rank na função search_artifacts
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
        (ts_rank_cd(a.search_vector, plainto_tsquery('english', search_query)) +
        similarity(a.name, search_query) * 2)::REAL
      ELSE 0.0::REAL
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
