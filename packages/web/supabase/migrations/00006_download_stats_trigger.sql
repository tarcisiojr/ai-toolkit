-- Migração: Trigger para agregar estatísticas de download diárias
-- Atualiza a tabela download_stats_daily e o total_downloads do artefato automaticamente

-- ==========================================
-- FUNÇÃO: Atualizar estatísticas ao registrar download
-- ==========================================

CREATE OR REPLACE FUNCTION update_download_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir ou atualizar contagem diária
  INSERT INTO download_stats_daily (artifact_id, date, count)
  VALUES (NEW.artifact_id, CURRENT_DATE, 1)
  ON CONFLICT (artifact_id, date)
  DO UPDATE SET count = download_stats_daily.count + 1;

  -- Incrementar total de downloads do artefato
  UPDATE artifacts
  SET total_downloads = total_downloads + 1
  WHERE id = NEW.artifact_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- TRIGGER: Executar ao inserir download
-- ==========================================

CREATE TRIGGER trg_update_download_stats
  AFTER INSERT ON downloads
  FOR EACH ROW EXECUTE FUNCTION update_download_stats();

-- ==========================================
-- ÍNDICE: Melhorar performance de consultas de stats
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_download_stats_date
  ON download_stats_daily(date);

CREATE INDEX IF NOT EXISTS idx_download_stats_artifact_date
  ON download_stats_daily(artifact_id, date);
