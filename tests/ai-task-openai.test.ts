// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { generateTask } from '../supabase/functions/create-ai-task/openai'
import { aiContext, aiDecision, aiRequest } from './fixtures/ai-task'

const toolResponse = (args: unknown = aiDecision.task, name = 'create_task') => ({
  status: 'completed', output: [{ type: 'function_call', name, arguments: JSON.stringify(args) }],
})
describe('GPT-6 Luna adapter', () => {
  it('keeps the credential in the server header, limits context, and uses the requested model', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(toolResponse()))
    expect(await generateTask(aiRequest, aiContext, 'backend-secret', fetcher, new Date('2026-10-17T01:00:00Z'))).toEqual(aiDecision)
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer backend-secret' })
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({ model: 'gpt-6-luna', store: false, reasoning: { effort: 'none' }, max_output_tokens: 1600, parallel_tool_calls: false, tool_choice: 'required' })
    expect(body.input[0].content).toContain('2026-10-16')
    expect(String(init?.body)).not.toMatch(/backend-secret|valid-user-token|email|service_role/)
  })
  it.each([
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] },
    { ...toolResponse(), output: [...toolResponse().output, ...toolResponse().output] },
    toolResponse(aiDecision.task, 'delete_project'),
    toolResponse({ ...aiDecision.task, created_by: aiContext.members[0].id }),
    toolResponse({ ...aiDecision.task, assignee_id: aiRequest.projectId }),
    toolResponse({ ...aiDecision.task, due_date: '2026-02-30' }),
    toolResponse({ ...aiDecision.task, priority: 'urgent' }),
  ])('rejects unsafe or malformed provider result %#', async raw => {
    await expect(generateTask(aiRequest, aiContext, 'secret', vi.fn<typeof fetch>().mockResolvedValue(Response.json(raw))))
      .rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })
  it('allows a clarification for ambiguous instructions', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(toolResponse({ message: 'Qual Marina?' }, 'request_clarification')))
    expect(await generateTask(aiRequest, aiContext, 'secret', fetcher)).toEqual({ kind: 'clarification', message: 'Qual Marina?' })
  })
  it('handles timeout and provider rejection without returning their sensitive response', async () => {
    await expect(generateTask(aiRequest, aiContext, 'secret', vi.fn<typeof fetch>().mockRejectedValue(new Error('private'))))
      .rejects.toMatchObject({ code: 'AI_UNAVAILABLE' })
    await expect(generateTask(aiRequest, aiContext, 'secret', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ secret: 'private' }, { status: 429 }))))
      .rejects.toMatchObject({ code: 'AI_PROVIDER_LIMIT' })
  })
})
