import { createClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type { Database } from '../../../src/lib/supabase/database.generated.ts'
import { aiTaskResultSchema, type AiTaskRequest } from '../../../src/features/ai-tasks/schemas/ai-task-schema.ts'
import { contextSchema, reservationSchema, type AiTaskSession } from './contracts.ts'
import { aiTaskClarificationMessages } from '../../../src/features/ai-tasks/ai-task-messages.ts'
import { AiTaskError, databaseError } from './errors.ts'

export async function authenticateTaskSession(token: string, url: string, publishableKey: string): Promise<AiTaskSession> {
  // Deliberately no administrative client: queries and task writes use the user's JWT.
  const db = createClient<Database>(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: auth, error } = await db.auth.getUser(token)
  if (error || !auth.user) throw new AiTaskError(error && (!error.status || error.status >= 500) ? 'AI_UNAVAILABLE' : 'AUTH_REQUIRED', error && (!error.status || error.status >= 500) ? 503 : 401)
  const userId = auth.user.id
  return {
    userId,
    async context(input) {
      const { data: project, error: projectError } = await db.from('projects').select('id,workspace_id,title')
        .eq('workspace_id', input.workspaceId).eq('id', input.projectId).single()
      if (projectError) throw databaseError(projectError)
      const { data: members, error: membersError } = await db.rpc('team_directory', {
        target_workspace: input.workspaceId, search_term: '', include_removed: false,
      })
      if (membersError) throw databaseError(membersError)
      const context = contextSchema.safeParse({ project, members })
      if (!context.success) throw new AiTaskError('AI_CONTEXT_UNAVAILABLE', 503)
      return context.data
    },
    async prepare(input) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([input.prompt, input.timeZone])))
      const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
      const { data, error } = await db.rpc('prepare_ai_task_request', {
        request_id: input.requestId, target_workspace: input.workspaceId, target_project: input.projectId, prompt_hash: hash,
      })
      if (error) throw databaseError(error)
      const parsed = reservationSchema.safeParse(data)
      if (!parsed.success) throw new AiTaskError('AI_INVALID_RESPONSE', 503)
      if ('result' in parsed.data) confirmScope(parsed.data.result, input, userId)
      return parsed.data
    },
    async complete(input, lease, decision) {
      const { data, error } = decision.kind === 'rejected' ? await db.rpc('reject_ai_task_request', {
        request_id: input.requestId, lease, reason: decision.reason,
      }) : await db.rpc('complete_ai_task_request', {
        request_id: input.requestId, lease,
        draft: decision.kind === 'create' ? decision.task : null,
        ...(decision.kind === 'clarification' ? { clarification: aiTaskClarificationMessages[decision.reason] } : {}),
      })
      if (error) throw databaseError(error)
      const parsed = aiTaskResultSchema.safeParse(data)
      if (!parsed.success) throw new AiTaskError('AI_INVALID_RESPONSE', 503)
      confirmScope(parsed.data, input, userId)
      return parsed.data
    },
    async fail(requestId, lease) {
      const { error } = await db.rpc('fail_ai_task_request', { request_id: requestId, lease })
      if (error) throw databaseError(error)
    },
  }
}

function confirmScope(result: z.infer<typeof aiTaskResultSchema>, input: AiTaskRequest, userId: string) {
  if (result.kind === 'created' && (result.task.workspace_id !== input.workspaceId
    || result.task.project_id !== input.projectId || result.task.created_by !== userId))
    throw new AiTaskError('AI_INVALID_RESPONSE', 503)
}
