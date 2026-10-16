// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticateTaskSession } from '../supabase/functions/create-ai-task/database'
import { databaseError } from '../supabase/functions/create-ai-task/errors'
import { aiTaskClarificationMessages } from '../src/features/ai-tasks/ai-task-messages'
import { aiRequest, aiLease, aiUserId } from './fixtures/ai-task'
import { aiQuota } from './fixtures/ai-task-quota'

const backend = vi.hoisted(() => ({ rpc: vi.fn(), auth: { getUser: vi.fn() } }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => backend }))
beforeEach(() => {
  vi.resetAllMocks()
  backend.auth.getUser.mockResolvedValue({ data: { user: { id: aiUserId } }, error: null })
})
const session = () => authenticateTaskSession('test-user-token', 'http://127.0.0.1:56521', 'test-public-key')

describe('AI task persistence adapter', () => {
  it('reads PostgreSQL quota details without reserving or retrying again', async () => {
    backend.rpc.mockResolvedValue({ data: null, error: {
      code: 'PT429', message: 'AI_RATE_LIMITED', details: JSON.stringify(aiQuota),
    } })
    await expect((await session()).prepare(aiRequest)).rejects.toMatchObject({
      code: 'AI_RATE_LIMITED', status: 429, quota: aiQuota,
    })
    expect(backend.rpc).toHaveBeenCalledTimes(1)
  })
  it.each(['PRIVATE query error', '{"secret":"PRIVATE"}', JSON.stringify({ ...aiQuota, retryAfterSeconds: -1 })])(
    'never forwards unvalidated database details %#', details => {
      expect(databaseError({ code: 'PT429', message: 'PRIVATE', details })).toMatchObject({
        code: 'AI_RATE_LIMITED', quota: undefined,
      })
    })
  it('uses the rejection ledger RPC without sending any task draft', async () => {
    const rejected = { kind: 'rejected' as const, reason: 'unsupported_action' as const }
    backend.rpc.mockResolvedValue({ data: rejected, error: null })
    expect(await (await session()).complete(aiRequest, aiLease, rejected)).toEqual(rejected)
    expect(backend.rpc).toHaveBeenCalledExactlyOnceWith('reject_ai_task_request', {
      request_id: aiRequest.requestId, lease: aiLease, reason: rejected.reason,
    })
  })
  it('converts clarification codes into a fixed server-owned message', async () => {
    const message = aiTaskClarificationMessages.ambiguous_assignee
    backend.rpc.mockResolvedValue({ data: { kind: 'clarification', message }, error: null })
    await (await session()).complete(aiRequest, aiLease, { kind: 'clarification', reason: 'ambiguous_assignee' })
    expect(backend.rpc).toHaveBeenCalledExactlyOnceWith('complete_ai_task_request', {
      request_id: aiRequest.requestId, lease: aiLease, draft: null, clarification: message,
    })
  })
  it('does not turn a failed rejection write into a confirmed refusal', async () => {
    backend.rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect((await session()).complete(aiRequest, aiLease, { kind: 'rejected', reason: 'out_of_scope' }))
      .rejects.toMatchObject({ code: 'AI_FORBIDDEN', status: 403 })
  })
  it('exposes only recognized quota codes, never arbitrary database messages', () => {
    expect(databaseError({ code: 'PT429', message: 'AI_WORKSPACE_RATE_LIMITED' }).code).toBe('AI_WORKSPACE_RATE_LIMITED')
    expect(databaseError({ code: 'PT429', message: 'private database details' }).code).toBe('AI_RATE_LIMITED')
  })
})
