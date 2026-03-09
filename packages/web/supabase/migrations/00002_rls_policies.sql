-- Políticas de segurança por linha (RLS)
-- Controle de acesso para todos os recursos

-- ==========================================
-- Habilitar RLS em todas as tabelas
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_stats_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_dependencies ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PROFILES
-- ==========================================

-- Perfis públicos são visíveis para todos
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

-- Usuário pode editar seu próprio perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ==========================================
-- TEAMS
-- ==========================================

-- Equipes são visíveis para todos
CREATE POLICY "teams_select_public"
  ON teams FOR SELECT
  USING (true);

-- Qualquer autenticado pode criar equipe
CREATE POLICY "teams_insert_authenticated"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Apenas owner pode atualizar
CREATE POLICY "teams_update_owner"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Apenas owner pode deletar
CREATE POLICY "teams_delete_owner"
  ON teams FOR DELETE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ==========================================
-- TEAM_MEMBERS
-- ==========================================

-- Membros visíveis para membros da equipe
CREATE POLICY "team_members_select"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Admin/owner pode adicionar membros
CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Admin/owner pode alterar papel
CREATE POLICY "team_members_update"
  ON team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Admin/owner pode remover (exceto owner)
CREATE POLICY "team_members_delete"
  ON team_members FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND role != 'owner'
  );

-- ==========================================
-- ARTIFACTS
-- ==========================================

-- Artefatos públicos visíveis para todos
CREATE POLICY "artifacts_select_public"
  ON artifacts FOR SELECT
  USING (visibility = 'public');

-- Artefatos privados visíveis apenas para o dono
CREATE POLICY "artifacts_select_private"
  ON artifacts FOR SELECT
  USING (
    visibility = 'private'
    AND owner_user_id = auth.uid()
  );

-- Artefatos de equipe visíveis para membros
CREATE POLICY "artifacts_select_team"
  ON artifacts FOR SELECT
  USING (
    visibility = 'team'
    AND owner_team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Dono pode criar artefato pessoal
CREATE POLICY "artifacts_insert_user"
  ON artifacts FOR INSERT
  WITH CHECK (
    owner_user_id = auth.uid()
    OR owner_team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Dono ou admin pode atualizar
CREATE POLICY "artifacts_update"
  ON artifacts FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR owner_team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Dono ou admin pode deletar
CREATE POLICY "artifacts_delete"
  ON artifacts FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR owner_team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ==========================================
-- ARTIFACT_VERSIONS
-- ==========================================

-- Versões visíveis se o artefato é visível (delegação via JOIN)
CREATE POLICY "versions_select"
  ON artifact_versions FOR SELECT
  USING (
    artifact_id IN (SELECT id FROM artifacts)
  );

-- Publicação por dono/admin
CREATE POLICY "versions_insert"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    artifact_id IN (
      SELECT id FROM artifacts
      WHERE owner_user_id = auth.uid()
      OR owner_team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Yank por dono/admin
CREATE POLICY "versions_update"
  ON artifact_versions FOR UPDATE
  USING (
    artifact_id IN (
      SELECT id FROM artifacts
      WHERE owner_user_id = auth.uid()
      OR owner_team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- ==========================================
-- DOWNLOADS
-- ==========================================

-- Downloads são inseridos por qualquer um (tracking)
CREATE POLICY "downloads_insert"
  ON downloads FOR INSERT
  WITH CHECK (true);

-- Leitura de downloads (apenas stats públicas)
CREATE POLICY "downloads_select"
  ON downloads FOR SELECT
  USING (true);

-- ==========================================
-- DOWNLOAD_STATS_DAILY
-- ==========================================

CREATE POLICY "download_stats_select"
  ON download_stats_daily FOR SELECT
  USING (true);

-- ==========================================
-- API_TOKENS
-- ==========================================

-- Usuário vê apenas seus tokens
CREATE POLICY "api_tokens_select_own"
  ON api_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Usuário cria seus tokens
CREATE POLICY "api_tokens_insert_own"
  ON api_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuário deleta seus tokens
CREATE POLICY "api_tokens_delete_own"
  ON api_tokens FOR DELETE
  USING (user_id = auth.uid());

-- ==========================================
-- ARTIFACT_DEPENDENCIES
-- ==========================================

CREATE POLICY "dependencies_select"
  ON artifact_dependencies FOR SELECT
  USING (true);

CREATE POLICY "dependencies_insert"
  ON artifact_dependencies FOR INSERT
  WITH CHECK (
    version_id IN (
      SELECT av.id FROM artifact_versions av
      JOIN artifacts a ON a.id = av.artifact_id
      WHERE a.owner_user_id = auth.uid()
      OR a.owner_team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );
