import { z } from 'zod'

export const AI_TASK_PROMPT_MAX_LENGTH = 150

export const aiTaskRequestSchema = z.strictObject({
  requestId: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  prompt: z.string().max(AI_TASK_PROMPT_MAX_LENGTH).trim().min(10),
  timeZone: z.string().max(80).refine(value => {
    try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }); return true } catch { return false }
  }),
})

export const aiTaskDraftSchema = z.strictObject({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000).nullable(),
  priority: z.enum(['low', 'medium', 'high']),
  assignee_id: z.uuid().nullable(),
  due_date: z.iso.date().nullable(),
})

export const aiTaskRejectionReasonSchema = z.enum(['out_of_scope', 'unsupported_action', 'instruction_override'])
export const aiTaskClarificationReasonSchema = z.enum([
  'missing_task_details', 'multiple_tasks', 'ambiguous_assignee', 'unknown_assignee', 'ambiguous_date',
])

export const aiTaskResultSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('rejected'), reason: aiTaskRejectionReasonSchema }),
  z.strictObject({ kind: z.literal('clarification'), message: z.string().min(1).max(600) }),
  z.strictObject({ kind: z.literal('created'), task: z.strictObject({
    id: z.uuid(), title: z.string().min(1).max(160),
    workspace_id: z.uuid(), project_id: z.uuid(), created_by: z.uuid(),
  }) }),
])

export type AiTaskRequest = z.infer<typeof aiTaskRequestSchema>
export type AiTaskDraft = z.infer<typeof aiTaskDraftSchema>
export type AiTaskResult = z.infer<typeof aiTaskResultSchema>
