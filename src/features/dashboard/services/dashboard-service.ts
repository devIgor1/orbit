import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireCollection } from '@/lib/supabase/require-data'
import type { DashboardSummary } from '@/lib/supabase/database.types'

const count = z.number().int().nonnegative()
const summarySchema = z.object({
  active_projects: count, pending_tasks: count, overdue_tasks: count,
  completed_tasks: count, total_tasks: count,
  weekly: z.array(z.object({ date: z.iso.date(), created: count, completed: count })),
  distribution: z.array(z.object({ status: z.enum(['todo', 'in_progress', 'review', 'done']), count })),
}).superRefine((summary, context) => {
  const stages = new Set(summary.distribution.map((entry) => entry.status))
  if (summary.distribution.length !== 4 || stages.size !== 4) {
    context.addIssue({ code: 'custom', path: ['distribution'], message: 'Todas as quatro etapas são obrigatórias, sem duplicações.' })
  }
  const total = summary.distribution.reduce((sum, entry) => sum + entry.count, 0)
  const done = summary.distribution.find((entry) => entry.status === 'done')?.count
  if (total !== summary.total_tasks || done === undefined || summary.pending_tasks !== total - done || summary.overdue_tasks > summary.pending_tasks || summary.completed_tasks > done) {
    context.addIssue({ code: 'custom', message: 'Os totais das tarefas não são consistentes.' })
  }
  if (summary.weekly.reduce((sum, day) => sum + day.completed, 0) !== summary.completed_tasks) {
    context.addIssue({ code: 'custom', path: ['weekly'], message: 'O total concluído deve corresponder ao período.' })
  }
  if (summary.weekly.some((day, index) => index > 0 && day.date <= summary.weekly[index - 1].date)) {
    context.addIssue({ code: 'custom', path: ['weekly'], message: 'A série deve conter dias únicos em ordem crescente.' })
  }
})

export async function fetchDashboard(workspaceId: string, days: number): Promise<DashboardSummary> {
  const { data, error } = await getSupabase().rpc('dashboard_summary', { target_workspace: workspaceId, period_days: days })
  if (error) throw toAppError(error)
  const result = summarySchema.safeParse(data)
  if (!result.success || result.data.weekly.length !== days) throw new AppError('contract', 'Os indicadores retornaram um formato inesperado. Tente novamente ou contate o administrador.')
  return result.data
}

export async function fetchActivity(workspaceId: string, limit: number) {
  const { data, error } = await getSupabase().from('activity_events').select('*')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw toAppError(error)
  return requireCollection(data)
}
