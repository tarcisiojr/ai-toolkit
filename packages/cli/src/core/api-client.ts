import type { Artifact, ApiResponse, SearchParams } from '@ai-toolkit/shared';
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

  /** Faz uma requisição à API */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  /** Verificar saúde da API */
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

/** Cria uma instância do cliente API */
export function createApiClient(): ApiClient {
  return new ApiClient();
}
