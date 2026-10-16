import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { createAiTask } from '@/features/ai-tasks/services/ai-task-service'
import { aiRequest, aiCreated, aiUserId } from './fixtures/ai-task'

const backend = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ functions: backend }) }))
beforeEach(() => vi.resetAllMocks())

describe('AI task frontend contract', () => {
  it('sends only the authorized request shape and confirms returned scope', async () => {
    backend.invoke.mockResolvedValue({ data: aiCreated, error: null })
    expect(await createAiTask(aiRequest, aiUserId)).toEqual(aiCreated)
    expect(backend.invoke).toHaveBeenCalledWith('create-ai-task', { body: aiRequest })
  })
  it.each([null, { success: true }, { ...aiCreated, task: { ...aiCreated.task, project_id: aiUserId } },
    { ...aiCreated, task: { ...aiCreated.task, created_by: aiRequest.projectId } }])('rejects unconfirmed or mismatched success %#', async data => {
    backend.invoke.mockResolvedValue({ data, error: null })
    await expect(createAiTask(aiRequest, aiUserId)).rejects.toMatchObject({ kind: 'contract' })
  })
  it.each([[401, 'authentication'], [403, 'permission'], [429, 'contract'], [503, 'configuration']])(
    'surfaces HTTP %i instead of reporting success', async (status, kind) => {
      backend.invoke.mockResolvedValue({ data: aiCreated, error: new FunctionsHttpError(Response.json(
        { code: Number(status) === 503 ? 'AI_NOT_CONFIGURED' : 'AI_RATE_LIMITED' }, { status: Number(status) })) })
      await expect(createAiTask(aiRequest, aiUserId)).rejects.toMatchObject({ kind })
    })
  it('treats connection loss as unknown outcome and keeps retry instructions', async () => {
    backend.invoke.mockResolvedValue({ data: null, error: new TypeError('network') })
    await expect(createAiTask(aiRequest, aiUserId)).rejects.toMatchObject({ kind: 'network', message: expect.stringContaining('mesmo texto') })
  })
})
