import { z } from 'zod'
import { aiTaskDraftSchema, aiTaskResultSchema, type AiTaskRequest, type AiTaskResult } from '../../../src/features/ai-tasks/schemas/ai-task-schema.ts'

export const contextSchema = z.object({
  project: z.object({ id: z.uuid(), workspace_id: z.uuid(), title: z.string() }),
  members: z.array(z.object({ id: z.uuid(), full_name: z.string() })).max(200),
})
export const reservationSchema = z.union([
  z.strictObject({ result: aiTaskResultSchema }),
  z.strictObject({ leaseToken: z.uuid() }),
])
export const decisionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('create'), task: aiTaskDraftSchema }),
  z.strictObject({ kind: z.literal('clarification'), message: z.string().trim().min(1).max(600) }),
])
export type TaskContext = z.infer<typeof contextSchema>
export type TaskDecision = z.infer<typeof decisionSchema>
export type TaskReservation = z.infer<typeof reservationSchema>
export interface AiTaskSession {
  userId: string
  context(input: AiTaskRequest): Promise<TaskContext>
  prepare(input: AiTaskRequest): Promise<TaskReservation>
  complete(input: AiTaskRequest, lease: string, decision: TaskDecision): Promise<AiTaskResult>
  fail(requestId: string, lease: string): Promise<void>
}
export interface AiTaskDependencies {
  authenticate(token: string): Promise<AiTaskSession>
  configured(): boolean
  generate(input: AiTaskRequest, context: TaskContext): Promise<TaskDecision>
}
