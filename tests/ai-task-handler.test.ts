// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAiTaskHandler } from '../supabase/functions/create-ai-task/handler'
import { AiTaskError } from '../supabase/functions/create-ai-task/errors'
import type { AiTaskDependencies, AiTaskSession } from '../supabase/functions/create-ai-task/contracts'
import { aiRequest, aiContext, aiCreated, aiDecision, aiLease, aiUserId } from './fixtures/ai-task'

const session = {
  userId: aiUserId, context: vi.fn<AiTaskSession['context']>(), prepare: vi.fn<AiTaskSession['prepare']>(),
  complete: vi.fn<AiTaskSession['complete']>(), fail: vi.fn<AiTaskSession['fail']>(),
}
const dependencies = {
  authenticate: vi.fn<AiTaskDependencies['authenticate']>(), configured: vi.fn(() => true),
  generate: vi.fn<AiTaskDependencies['generate']>(),
}
const handler = createAiTaskHandler(dependencies)
const request = (body: object = aiRequest, token = 'valid-user-token') => new Request('https://orbit.test/functions/v1/create-ai-task', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  dependencies.authenticate.mockResolvedValue(session)
  dependencies.configured.mockReturnValue(true)
  dependencies.generate.mockResolvedValue(aiDecision)
  session.context.mockResolvedValue(aiContext)
  session.prepare.mockResolvedValue({ leaseToken: aiLease })
  session.complete.mockResolvedValue(aiCreated)
  session.fail.mockResolvedValue(undefined)
})

describe('AI task boundary', () => {
  it('rejects anonymous and invalid sessions before model or database work', async () => {
    expect((await handler(request(aiRequest, ''))).status).toBe(401)
    expect(dependencies.authenticate).not.toHaveBeenCalled()
    dependencies.authenticate.mockRejectedValue(new AiTaskError('AUTH_REQUIRED', 401))
    expect((await handler(request())).status).toBe(401)
    expect(session.context).not.toHaveBeenCalled()
    expect(dependencies.generate).not.toHaveBeenCalled()
  })
  it.each([{ created_by: aiUserId }, { model: 'other' }, { apiKey: 'secret' }, { timeZone: 'invalid/zone' }])(
    'rejects client-controlled identity/configuration and invalid timezone: %j', async extra => {
      expect((await handler(request({ ...aiRequest, ...extra }))).status).toBe(400)
      expect(dependencies.generate).not.toHaveBeenCalled()
    })
  it('rejects oversized input before consuming quota', async () => {
    expect((await handler(request({ ...aiRequest, prompt: 'a'.repeat(17000) }))).status).toBe(400)
    expect(session.prepare).not.toHaveBeenCalled()
  })
  it('does not call OpenAI when access to the project is denied', async () => {
    session.context.mockRejectedValue(new AiTaskError('AI_FORBIDDEN', 403))
    expect((await handler(request())).status).toBe(403)
    expect(session.prepare).not.toHaveBeenCalled()
    expect(dependencies.generate).not.toHaveBeenCalled()
  })
  it('reports missing configuration instead of creating a mock task', async () => {
    dependencies.configured.mockReturnValue(false)
    const response = await handler(request())
    expect(await response.json()).toEqual({ code: 'AI_NOT_CONFIGURED' })
    expect(session.prepare).not.toHaveBeenCalled()
  })
  it.each([409, 429])('does not spend tokens for a busy or rate limited request (%i)', async status => {
    session.prepare.mockRejectedValue(new AiTaskError('AI_LIMIT', status))
    expect((await handler(request())).status).toBe(status)
    expect(dependencies.generate).not.toHaveBeenCalled()
  })
  it('returns a confirmed retry without generating or inserting again', async () => {
    session.prepare.mockResolvedValue({ result: aiCreated })
    expect(await (await handler(request())).json()).toEqual(aiCreated)
    expect(dependencies.generate).not.toHaveBeenCalled()
    expect(session.complete).not.toHaveBeenCalled()
  })
  it('confirms success only after persistence', async () => {
    expect(await (await handler(request())).json()).toEqual(aiCreated)
    expect(session.complete).toHaveBeenCalledWith(aiRequest, aiLease, aiDecision)
    expect(session.fail).not.toHaveBeenCalled()
  })
  it('does not turn revoked permission during generation into success', async () => {
    session.complete.mockRejectedValue(new AiTaskError('AI_FORBIDDEN', 403))
    const response = await handler(request())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'AI_FORBIDDEN' })
    expect(session.fail).toHaveBeenCalledWith(aiRequest.requestId, aiLease)
  })
  it('releases failures and never logs private provider errors or tokens', async () => {
    dependencies.generate.mockRejectedValue(new Error('SECRET_API_KEY sensitive prompt'))
    const response = await handler(request())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('SECRET_API_KEY')
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/SECRET|sensitive|valid-user-token/)
    expect(session.complete).not.toHaveBeenCalled()
    expect(session.fail).toHaveBeenCalledWith(aiRequest.requestId, aiLease)
  })
  it('returns clarification without claiming a task exists', async () => {
    const clarification = { kind: 'clarification' as const, message: 'Qual alteração deve ser feita?' }
    dependencies.generate.mockResolvedValue(clarification)
    session.complete.mockResolvedValue(clarification)
    expect(await (await handler(request())).json()).toEqual(clarification)
  })
})
