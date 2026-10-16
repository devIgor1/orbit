import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { createAiTask } from '@/features/ai-tasks/services/ai-task-service'
import { aiRequest, aiCreated, aiUserId } from './fixtures/ai-task'
import { aiQuota } from './fixtures/ai-task-quota'
import { AiTaskQuotaError } from '@/features/ai-tasks/services/ai-task-quota-error'

const backend = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ functions: backend }) }))
beforeEach(() => vi.resetAllMocks())

describe('AI task frontend contract', () => {
  it('rejects overlong prompts before any HTTP request', async () => {
    await expect(createAiTask({ ...aiRequest, prompt: 'a'.repeat(151) }, aiUserId)).rejects.toThrow()
    expect(backend.invoke).not.toHaveBeenCalled()
  })
  it('preserves validated quota details in a typed error', async () => {
    backend.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(Response.json(
      { code: 'AI_RATE_LIMITED', quota: aiQuota }, { status: 429 })) })
    const result = createAiTask(aiRequest, aiUserId)
    await expect(result).rejects.toBeInstanceOf(AiTaskQuotaError)
    await expect(result).rejects.toMatchObject({ quota: aiQuota })
    expect(backend.invoke).toHaveBeenCalledTimes(1)
  })
  it('uses a safe fallback for malformed quota details', async () => {
    backend.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(Response.json(
      { code: 'AI_WORKSPACE_RATE_LIMITED', quota: { ...aiQuota, secret: 'PRIVATE' } }, { status: 429 })) })
    await expect(createAiTask(aiRequest, aiUserId)).rejects.toMatchObject({
      message: 'Sua empresa atingiu o limite de uso da IA. Aguarde e tente novamente mais tarde ou use Nova tarefa.',
    })
  })
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
  it('distinguishes the company quota from the individual quota', async () => {
    backend.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(Response.json(
      { code: 'AI_WORKSPACE_RATE_LIMITED' }, { status: 429 })) })
    await expect(createAiTask(aiRequest, aiUserId)).rejects.toMatchObject({ message: expect.stringContaining('Sua empresa') })
  })
  it.each([{ kind: 'rejected', reason: 'unknown' }, { kind: 'rejected', reason: 'out_of_scope', message: 'free text' }])(
    'rejects invalid refusal contracts: %j', async data => {
      backend.invoke.mockResolvedValue({ data, error: null })
      await expect(createAiTask(aiRequest, aiUserId)).rejects.toMatchObject({ kind: 'contract' })
    })
})
