/**
 * Tipos para request/response da API.
 */

/** Metadados de paginação */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** Resposta de sucesso da API */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/** Resposta de erro da API */
export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

/** Parâmetros de busca */
export interface SearchParams {
  q?: string;
  type?: string;
  category?: string;
  tool?: string;
  scope?: string;
  page?: number;
  perPage?: number;
  sort?: 'relevance' | 'downloads' | 'updated' | 'created';
}
