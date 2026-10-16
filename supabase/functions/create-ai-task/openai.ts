import { z } from 'zod'
import type { AiTaskRequest } from '../../../src/features/ai-tasks/schemas/ai-task-schema.ts'
import { decisionSchema, type TaskContext, type TaskDecision } from './contracts.ts'
import { AiTaskError } from './errors.ts'
import { taskInstructions, taskTools } from './tools.ts'

const responseSchema = z.object({
  status: z.literal('completed'),
  output: z.array(z.object({
    type: z.string(), name: z.string().optional(), arguments: z.string().optional(),
  })),
})

export async function generateTask(input: AiTaskRequest, context: TaskContext, apiKey: string,
  fetcher: typeof fetch = fetch, now = new Date()): Promise<TaskDecision> {
  let response: Response
  try {
    response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-6-luna', reasoning: { effort: 'none' }, store: false,
        max_output_tokens: 1600, parallel_tool_calls: false, tool_choice: 'required',
        instructions: taskInstructions, tools: taskTools,
        input: [
          { role: 'user', content: JSON.stringify({ reference_context: {
            currentDate: new Intl.DateTimeFormat('en-CA', { timeZone: input.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
            timeZone: input.timeZone, ...context,
          } }) },
          { role: 'user', content: JSON.stringify({ task_request: input.prompt }) },
        ],
      }),
    })
  } catch { throw new AiTaskError('AI_UNAVAILABLE', 502) }
  if (!response.ok) throw new AiTaskError(response.status === 429 ? 'AI_PROVIDER_LIMIT' : 'AI_UNAVAILABLE', 502)
  let raw: unknown
  try { raw = await response.json() } catch { throw new AiTaskError('AI_INVALID_RESPONSE', 502) }
  const parsed = responseSchema.safeParse(raw)
  if (!parsed.success) throw new AiTaskError('AI_INVALID_RESPONSE', 502)
  const calls = parsed.data.output.filter(item => item.type === 'function_call')
  if (calls.length !== 1 || !calls[0].arguments) throw new AiTaskError('AI_INVALID_RESPONSE', 502)
  let args: unknown
  try { args = JSON.parse(calls[0].arguments) } catch { throw new AiTaskError('AI_INVALID_RESPONSE', 502) }
  if (typeof args === 'object' && args !== null && 'kind' in args) throw new AiTaskError('AI_INVALID_RESPONSE', 502)
  const decision = decisionSchema.safeParse(calls[0].name === 'create_task'
    ? { kind: 'create', task: args }
    : calls[0].name === 'request_clarification' && typeof args === 'object' && args !== null
      ? { ...args, kind: 'clarification' }
      : calls[0].name === 'reject_request' && typeof args === 'object' && args !== null
        ? { ...args, kind: 'rejected' } : null)
  if (!decision.success) throw new AiTaskError('AI_INVALID_RESPONSE', 502)
  const assignee = decision.data.kind === 'create' ? decision.data.task.assignee_id : null
  if (assignee !== null && !context.members.some(member => member.id === assignee))
    throw new AiTaskError('AI_INVALID_RESPONSE', 502)
  return decision.data
}
