/**
 * Interface base para adapters de fontes de artefatos.
 * Cada adapter sabe interpretar um formato específico de repositório.
 */

import type { ArtifactManifest } from '@tarcisiojunior/shared';

/** Interface que todos os adapters de fonte devem implementar */
export interface SourceAdapter {
  /** Identificador do tipo de adapter */
  readonly type: string;

  /**
   * Verifica se o adapter consegue interpretar o repositório no caminho dado.
   * @param repoPath - Caminho local do repositório (sparse checkout)
   */
  canHandle(repoPath: string): boolean;

  /**
   * Lista todos os artefatos disponíveis no repositório.
   * @param repoPath - Caminho local do repositório
   * @param sourceName - Nome da fonte para usar como escopo
   */
  listArtifacts(repoPath: string, sourceName: string): ArtifactManifest[];

  /**
   * Retorna um artefato específico pelo nome.
   * @param repoPath - Caminho local do repositório
   * @param name - Nome do artefato
   * @param sourceName - Nome da fonte para usar como escopo
   */
  getArtifact(repoPath: string, name: string, sourceName: string): ArtifactManifest | null;
}
