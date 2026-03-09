import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api/auth';

/** GET /api/v1/auth/verify — Verificar se token e valido */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth) {
    return apiError('UNAUTHORIZED', 'Token invalido ou expirado', 401);
  }

  return apiSuccess({
    authenticated: true,
    userId: auth.userId,
    username: auth.username,
  });
}
