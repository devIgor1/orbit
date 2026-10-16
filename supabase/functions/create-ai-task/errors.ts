export class AiTaskError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

export function databaseError(error: { code?: string; message?: string }): AiTaskError {
  if (error.code === '42501' || error.code === 'PGRST116') return new AiTaskError('AI_FORBIDDEN', 403)
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(error.code ?? '')) return new AiTaskError('AUTH_REQUIRED', 401)
  if (error.code === 'PT429') return new AiTaskError('AI_RATE_LIMITED', 429)
  if (error.code === 'PT409') return new AiTaskError('AI_IN_PROGRESS', 409)
  if (['22023', '22007', '22008', '23503', '23514', '22P02'].includes(error.code ?? ''))
    return new AiTaskError('AI_INVALID_TASK', 422)
  return new AiTaskError('AI_DATABASE_FAILED', 503)
}
