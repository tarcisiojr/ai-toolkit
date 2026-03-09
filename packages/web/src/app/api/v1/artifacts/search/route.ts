import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api/auth';

/** GET /api/v1/artifacts/search — Busca full-text */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type');
  const tool = searchParams.get('tool');
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = Math.min(
    parseInt(searchParams.get('per_page') || '20'),
    100,
  );

  const supabase = await createClient();
  const offset = (page - 1) * perPage;

  // Usar a funcao de busca otimizada do PostgreSQL
  const { data, error } = await supabase.rpc('search_artifacts', {
    search_query: q || null,
    filter_type: type || null,
    filter_visibility: 'public',
    filter_tool: tool || null,
    result_limit: perPage,
    result_offset: offset,
  });

  if (error) {
    return apiError('SEARCH_ERROR', error.message, 500);
  }

  // Contar total para paginacao
  let total = data?.length || 0;
  if (total === perPage) {
    // Se retornou o limite, pode haver mais resultados
    const { count } = await supabase
      .from('artifacts')
      .select('*', { count: 'exact', head: true })
      .eq('visibility', 'public')
      .eq('is_deprecated', false);
    total = count || total;
  }

  return apiSuccess(data || [], {
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
}
