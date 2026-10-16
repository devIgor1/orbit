import { FunctionsHttpError } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabase } from '@/lib/supabase/client'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { AI_TASK_PROMPT_MAX_LENGTH, aiTaskRequestSchema, aiTaskResultSchema, type AiTaskRequest } from '../schemas/ai-task-schema'
import { aiTaskQuotaSchema } from '../schemas/ai-task-quota-schema'
import { AiTaskQuotaError } from './ai-task-quota-error'

const messages: Record<string, string> = {
  AI_NOT_CONFIGURED: 'A criação com IA ainda precisa ser ativada pela administração do Orbit.',
  AI_RATE_LIMITED: 'Você atingiu o limite de uso da IA. Aguarde e tente novamente mais tarde.',
  AI_WORKSPACE_RATE_LIMITED: 'Sua empresa atingiu o limite de uso da IA. Aguarde e tente novamente mais tarde ou use Nova tarefa.',
  AI_IN_PROGRESS: 'Este pedido ainda está em processamento. Aguarde alguns instantes e tente novamente com o mesmo texto.',
  AI_PROVIDER_LIMIT: 'A IA está temporariamente indisponível. Tente novamente em instantes.',
  AI_UNAVAILABLE: 'Não foi possível concluir o pedido com a IA. Seu texto foi preservado. Tente novamente.',
  AI_DATABASE_FAILED: 'O banco não confirmou a criação. Tente novamente com o mesmo texto para recuperar o resultado sem duplicar a tarefa.',
  AI_INVALID_RESPONSE: 'A IA não retornou uma tarefa válida. Revise o pedido e tente novamente.',
  AI_INVALID_TASK: 'Um campo ou responsável não é válido. Confira os dados e o acesso da equipe antes de tentar novamente.',
  AI_CONTEXT_UNAVAILABLE: 'Não foi possível preparar o contexto deste projeto. Tente novamente ou use Nova tarefa.',
  AI_INVALID_REQUEST: `Descreva uma tarefa usando entre 10 e ${AI_TASK_PROMPT_MAX_LENGTH} caracteres.`,
}

export async function createAiTask(input: AiTaskRequest, userId: string) {
  const body = aiTaskRequestSchema.parse(input)
  const { data, error } = await getSupabase().functions.invoke('create-ai-task', { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status
      if (status === 401 || status === 403) throw toAppError({ status })
      const payload: unknown = await error.context.json().catch(() => null)
      const parsed = z.object({ code: z.string(), quota: z.unknown().optional() }).safeParse(payload)
      const code = parsed.success ? parsed.data.code : ''
      if (status === 429 && ['AI_RATE_LIMITED', 'AI_WORKSPACE_RATE_LIMITED'].includes(code) && parsed.success) {
        const quota = aiTaskQuotaSchema.safeParse(parsed.data.quota)
        if (quota.success) throw new AiTaskQuotaError(quota.data)
      }
      throw new AppError(code === 'AI_NOT_CONFIGURED' ? 'configuration' : 'contract',
        messages[code] ?? 'O servidor não confirmou a criação. Tente novamente com o mesmo texto.')
    }
    throw new AppError('network', 'A conexão foi interrompida. Tente novamente com o mesmo texto para recuperar o resultado sem duplicar a tarefa.')
  }
  const result = aiTaskResultSchema.safeParse(data)
  if (!result.success || (result.data.kind === 'created' && (
    result.data.task.workspace_id !== input.workspaceId || result.data.task.project_id !== input.projectId
    || result.data.task.created_by !== userId)))
    throw new AppError('contract', 'O servidor não confirmou a tarefa neste projeto.')
  return result.data
}
