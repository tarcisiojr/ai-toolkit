/**
 * Tipos para gerenciamento de fontes Git de artefatos.
 * Permitem registrar repositórios Git como fontes de skills/artefatos.
 */

/** Tipo de fonte suportado */
export type SourceType = 'github';

/** Tipo de adapter detectado na fonte */
export type SourceAdapterType = 'marketplace' | 'aitk' | 'skill-md';

/** Fonte Git registrada */
export interface Source {
  /** Nome da fonte (ex: "anthropics/skills") */
  name: string;
  /** Tipo do host Git */
  type: SourceType;
  /** URL completa do repositório */
  url: string;
  /** Branch a ser usada (padrão: "main") */
  branch: string;
  /** Data da última sincronização (ISO 8601) */
  lastSync: string | null;
  /** Tipo de adapter detectado */
  adapterType: SourceAdapterType | null;
  /** Quantidade de artefatos encontrados */
  artifactCount: number;
}

/** Configuração de fonte para operações de adição */
export interface SourceConfig {
  /** URL ou shorthand (ex: "anthropics/skills" ou "https://github.com/...") */
  url: string;
  /** Nome customizado (opcional, derivado da URL se não fornecido) */
  name?: string;
  /** Branch específica (padrão: "main") */
  branch?: string;
}

/** Manifesto de fontes persistido em ~/.aitk/sources/sources.json */
export interface SourcesManifest {
  /** Lista de fontes registradas */
  sources: Source[];
}

/** Formato do marketplace.json usado por Anthropic/Microsoft */
export interface MarketplaceManifest {
  /** Nome do marketplace/plugin */
  name?: string;
  /** Descrição do marketplace */
  description?: string;
  /** Lista de plugins referenciados */
  plugins?: MarketplacePlugin[];
  /** Lista de skills diretamente listadas */
  skills?: MarketplaceSkill[];
}

/** Plugin dentro do marketplace.json */
export interface MarketplacePlugin {
  /** Identificador do plugin */
  id?: string;
  /** Nome do plugin */
  name: string;
  /** Descrição do plugin */
  description?: string;
  /** Caminho relativo ao diretório do plugin */
  path: string;
}

/** Skill dentro do marketplace.json */
export interface MarketplaceSkill {
  /** Nome da skill */
  name: string;
  /** Descrição da skill */
  description?: string;
  /** Caminho relativo ao diretório da skill */
  path: string;
}

/** Frontmatter YAML de um arquivo SKILL.md */
export interface SkillMdFrontmatter {
  /** Nome da skill */
  name?: string;
  /** Descrição da skill */
  description?: string;
  /** Licença */
  license?: string;
  /** Tags/palavras-chave */
  tags?: string[];
  /** Ferramentas alvo */
  tools?: string[];
}

/** Opções para criação de artefatos via `aitk create` */
export interface CreateOptions {
  /** Tipo do artefato */
  type: import('./artifact.js').ArtifactType;
  /** Nome do artefato */
  name: string;
  /** Escopo/autor */
  scope: string;
  /** Descrição */
  description: string;
  /** Ferramenta alvo */
  toolTarget?: import('./artifact.js').ToolTarget;
  /** Formato de saída */
  format?: 'aitk' | 'marketplace' | 'dual';
  /** Diretório de saída customizado */
  dir?: string;
}

/** Template para geração de artefatos */
export interface ArtifactTemplate {
  /** Tipo de artefato que o template gera */
  type: import('./artifact.js').ArtifactType;
  /** Arquivos a serem gerados (caminho relativo → conteúdo) */
  files: Record<string, string>;
  /** Descrição do template */
  description: string;
}
