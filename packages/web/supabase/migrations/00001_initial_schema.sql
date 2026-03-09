-- Migração inicial: tabelas core do AI Toolkit
-- Perfis, equipes, artefatos, versões, downloads e tokens

-- ==========================================
-- TIPOS ENUMERADOS
-- ==========================================

CREATE TYPE artifact_type AS ENUM ('skill', 'mcp', 'template', 'config', 'hook');
CREATE TYPE artifact_visibility AS ENUM ('public', 'private', 'team');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');

-- ==========================================
-- TABELA: profiles
-- Extensão do auth.users com dados de perfil público
-- ==========================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  github_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$')
);

CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);

-- Trigger para criar perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      LOWER(REGEXP_REPLACE(NEW.raw_user_meta_data->>'preferred_username', '[^a-z0-9-]', '', 'g')),
      'user-' || LEFT(NEW.id::text, 8)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- TABELA: teams
-- ==========================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  website TEXT,
  is_personal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$')
);

CREATE UNIQUE INDEX idx_teams_slug ON teams(slug);

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- TABELA: team_members
-- ==========================================

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_team_member UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- ==========================================
-- TABELA: artifacts
-- ==========================================

CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT GENERATED ALWAYS AS (scope || '/' || name) STORED,

  owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  type artifact_type NOT NULL,
  visibility artifact_visibility NOT NULL DEFAULT 'public',
  description TEXT NOT NULL,
  long_description TEXT,
  homepage TEXT,
  repository TEXT,
  license TEXT DEFAULT 'MIT',
  keywords TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  tool_targets TEXT[] DEFAULT '{claude-code}',

  total_downloads INTEGER DEFAULT 0,
  latest_version TEXT,

  search_vector TSVECTOR,

  is_verified BOOLEAN DEFAULT FALSE,
  is_deprecated BOOLEAN DEFAULT FALSE,
  deprecated_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_artifact_slug UNIQUE (scope, name),
  CONSTRAINT name_format CHECK (name ~ '^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$'),
  CONSTRAINT has_owner CHECK (
    (owner_user_id IS NOT NULL AND owner_team_id IS NULL) OR
    (owner_user_id IS NULL AND owner_team_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_artifacts_slug ON artifacts(slug);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_artifacts_visibility ON artifacts(visibility);
CREATE INDEX idx_artifacts_owner_user ON artifacts(owner_user_id);
CREATE INDEX idx_artifacts_owner_team ON artifacts(owner_team_id);
CREATE INDEX idx_artifacts_keywords ON artifacts USING GIN(keywords);
CREATE INDEX idx_artifacts_categories ON artifacts USING GIN(categories);

CREATE TRIGGER trg_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para atualizar search_vector
CREATE OR REPLACE FUNCTION update_artifact_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.long_description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_artifact_search
  BEFORE INSERT OR UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION update_artifact_search_vector();

-- ==========================================
-- TABELA: artifact_versions
-- ==========================================

CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,

  version TEXT NOT NULL,
  version_major INTEGER NOT NULL,
  version_minor INTEGER NOT NULL,
  version_patch INTEGER NOT NULL,
  prerelease TEXT,

  changelog TEXT,
  readme TEXT,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  checksum TEXT NOT NULL,

  metadata JSONB DEFAULT '{}',
  dependencies JSONB DEFAULT '[]',
  tool_configs JSONB DEFAULT '{}',
  min_tool_version JSONB DEFAULT '{}',

  published_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  is_yanked BOOLEAN DEFAULT FALSE,
  yanked_reason TEXT,

  CONSTRAINT unique_version UNIQUE (artifact_id, version),
  CONSTRAINT valid_semver CHECK (version ~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$')
);

CREATE INDEX idx_versions_artifact ON artifact_versions(artifact_id);
CREATE INDEX idx_versions_semver ON artifact_versions(version_major, version_minor, version_patch);

-- ==========================================
-- TABELA: downloads
-- ==========================================

CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  ip_hash TEXT,
  user_agent TEXT,
  tool_target TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_downloads_artifact ON downloads(artifact_id);
CREATE INDEX idx_downloads_date ON downloads(created_at);

-- Contagem diária materializada
CREATE TABLE download_stats_daily (
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (artifact_id, date)
);

-- ==========================================
-- TABELA: api_tokens
-- Tokens de API para autenticação do CLI
-- ==========================================

CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'CLI Token',
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{read,write}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash);

-- ==========================================
-- TABELA: artifact_dependencies
-- ==========================================

CREATE TABLE artifact_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
  depends_on_artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version_range TEXT NOT NULL DEFAULT '*',
  is_optional BOOLEAN DEFAULT FALSE,

  CONSTRAINT unique_dependency UNIQUE (version_id, depends_on_artifact_id)
);
