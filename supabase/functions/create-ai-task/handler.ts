import { aiTaskRequestSchema } from '../../../src/features/ai-tasks/schemas/ai-task-schema.ts'
import type { AiTaskDependencies, AiTaskSession } from './contracts.ts'
import { AiTaskError } from './errors.ts'
import { readTaskRequest } from './request.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Retry-After',
  'Cache-Control': 'no-store',
}

export function createAiTaskHandler(dependencies: AiTaskDependencies) {
  return async (request: Request): Promise<Response> => {
    const respond = (body: object, status = 200, headers: Record<string, string> = {}) =>
      Response.json(body, { status, headers: { ...cors, ...headers } })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return respond({ code: 'METHOD_NOT_ALLOWED' }, 405)
    let session: AiTaskSession | undefined
    let active: { requestId: string; lease: string } | undefined
    try {
      const authorization = request.headers.get('authorization')
      if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) throw new AiTaskError('AUTH_REQUIRED', 401)
      session = await dependencies.authenticate(authorization.slice(7))
      const raw = await readTaskRequest(request)
      const parsed = aiTaskRequestSchema.safeParse(raw)
      if (!parsed.success) throw new AiTaskError('AI_INVALID_REQUEST', 400)
      const input = parsed.data
      const context = await session.context(input)
      if (!dependencies.configured()) throw new AiTaskError('AI_NOT_CONFIGURED', 503)
      const reservation = await session.prepare(input)
      if ('result' in reservation) return respond(reservation.result)
      active = { requestId: input.requestId, lease: reservation.leaseToken }
      const decision = await dependencies.generate(input, context)
      const result = await session.complete(input, reservation.leaseToken, decision)
      active = undefined
      return respond(result)
    } catch (error) {
      if (session && active) {
        try { await session.fail(active.requestId, active.lease) }
        catch { console.error('create-ai-task', { code: 'AI_RELEASE_FAILED' }) }
      }
      const failure = error instanceof AiTaskError ? error : new AiTaskError('AI_UNAVAILABLE', 503)
      console.error('create-ai-task', { code: failure.code })
      return respond({ code: failure.code, ...(failure.quota ? { quota: failure.quota } : {}) }, failure.status,
        failure.quota ? { 'Retry-After': String(failure.quota.retryAfterSeconds) } : {})
    }
  }
}
