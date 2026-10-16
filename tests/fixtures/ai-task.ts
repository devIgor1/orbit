import type { AiTaskRequest, AiTaskResult } from '@/features/ai-tasks/schemas/ai-task-schema'
import type { TaskContext, TaskDecision } from '../../supabase/functions/create-ai-task/contracts'

export const aiRequest: AiTaskRequest = {
  requestId: 'a1600000-0000-4000-8000-000000000001',
  workspaceId: 'a1600000-0000-4000-8000-000000000002',
  projectId: 'a1600000-0000-4000-8000-000000000003',
  prompt: 'Crie uma tarefa para revisar o checkout, prioridade alta.', timeZone: 'America/Sao_Paulo',
}
export const aiUserId = 'a1600000-0000-4000-8000-000000000004'
export const aiLease = 'a1600000-0000-4000-8000-000000000005'
export const aiContext: TaskContext = {
  project: { id: aiRequest.projectId, workspace_id: aiRequest.workspaceId, title: 'Loja' },
  members: [{ id: aiUserId, full_name: 'Marina' }],
}
export const aiDecision: Extract<TaskDecision, { kind: 'create' }> = {
  kind: 'create', task: { title: 'Revisar o checkout', description: null, priority: 'high', assignee_id: null, due_date: null },
}
export const aiCreated: Extract<AiTaskResult, { kind: 'created' }> = {
  kind: 'created', task: { id: 'a1600000-0000-4000-8000-000000000006', title: 'Revisar o checkout',
    workspace_id: aiRequest.workspaceId, project_id: aiRequest.projectId, created_by: aiUserId },
}
