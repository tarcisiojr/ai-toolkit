import type { Artifact, ArtifactVersion, ApiResponse, SearchParams } from '@ai-toolkit/shared';
import { getConfig } from './config.js';
import { getAuth } from './auth.js';

/** Cliente HTTP para comunicação com a API */
export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = `${config.registry}/api/v1`;
    this.token = getAuth()?.token;
  }

  /** Faz uma requisição à API com JSON */
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['X-API-Token'] = this.token;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(body.error?.message || `Erro HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /** Faz uma requisição raw (sem Content-Type fixo, retorna Response) */
  private async rawRequest(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['X-API-Token'] = this.token;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(body.error?.message || `Erro HTTP ${response.status}`);
    }

    return response;
  }

  /** Buscar artefatos */
  async search(params: SearchParams): Promise<ApiResponse<Artifact[]>> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.type) searchParams.set('type', params.type);
    if (params.tool) searchParams.set('tool', params.tool);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.perPage) searchParams.set('per_page', String(params.perPage));

    return this.request<ApiResponse<Artifact[]>>(`/artifacts/search?${searchParams.toString()}`);
  }

  /** Obter detalhes de um artefato */
  async getArtifact(scope: string, name: string): Promise<ApiResponse<Artifact>> {
    return this.request<ApiResponse<Artifact>>(`/artifacts/${scope}/${name}`);
  }

  /** Criar um novo artefato no registry */
  async createArtifact(data: {
    scope: string;
    name: string;
    type: string;
    description: string;
    visibility?: string;
    keywords?: string[];
    categories?: string[];
    toolTargets?: string[];
    repository?: string;
    license?: string;
  }): Promise<ApiResponse<Artifact>> {
    return this.request<ApiResponse<Artifact>>('/artifacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Publicar nova versão de um artefato (multipart/form-data) */
  async publishVersion(
    scope: string,
    name: string,
    formData: FormData,
  ): Promise<ApiResponse<ArtifactVersion>> {
    // Usa rawRequest para não definir Content-Type (o fetch define automaticamente com boundary)
    const response = await this.rawRequest(`/artifacts/${scope}/${name}/versions`, {
      method: 'POST',
      body: formData,
    });

    return response.json() as Promise<ApiResponse<ArtifactVersion>>;
  }

  /** Listar versões de um artefato */
  async getVersions(scope: string, name: string): Promise<ApiResponse<ArtifactVersion[]>> {
    return this.request<ApiResponse<ArtifactVersion[]>>(`/artifacts/${scope}/${name}/versions`);
  }

  /** Fazer download do tarball de uma versão (retorna o buffer binário) */
  async downloadVersion(
    scope: string,
    name: string,
    version: string,
  ): Promise<{ buffer: ArrayBuffer; size: number }> {
    // O endpoint redireciona para URL assinada; seguimos o redirect
    const response = await fetch(
      `${this.baseUrl}/artifacts/${scope}/${name}/versions/${version}/download`,
      {
        headers: this.token ? { 'X-API-Token': this.token } : {},
        redirect: 'follow',
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(body.error?.message || `Erro ao baixar: HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return { buffer, size: buffer.byteLength };
  }

  /** Verificar saúde da API */
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

/** Cria uma instância do cliente API */
export function createApiClient(): ApiClient {
  return new ApiClient();
}
