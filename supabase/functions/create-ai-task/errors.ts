import { aiTaskQuotaSchema, type AiTaskQuota } from '../../../src/features/ai-tasks/schemas/ai-task-quota-schema.ts'

export class AiTaskError extends Error {
  constructor(readonly code: string, readonly status: number, readonly quota?: AiTaskQuota) { super(code) }
}

export function databaseError(error: { code?: string; message?: string; details?: string }): AiTaskError {
  if (error.code === '42501' || error.code === 'PGRST116') return new AiTaskError('AI_FORBIDDEN', 403)
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(error.code ?? '')) return new AiTaskError('AUTH_REQUIRED', 401)
  if (error.code === 'PT429') {
    let details: unknown
    try { details = JSON.parse(error.details ?? '') } catch { /* Older backends omit quota details. */ }
    const quota = aiTaskQuotaSchema.safeParse(details)
    return new AiTaskError(error.message === 'AI_WORKSPACE_RATE_LIMITED' ? 'AI_WORKSPACE_RATE_LIMITED' : 'AI_RATE_LIMITED',
      429, quota.success ? quota.data : undefined)
  }
  if (error.code === 'PT409') return new AiTaskError('AI_IN_PROGRESS', 409)
  if (['22023', '22007', '22008', '23503', '23514', '22P02'].includes(error.code ?? ''))
    return new AiTaskError('AI_INVALID_TASK', 422)
  return new AiTaskError('AI_DATABASE_FAILED', 503)
}
