import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { memberDetailsSchema, memberEventSchema } from '../schemas/member-management-schema'

export type MemberRole = Database['public']['Enums']['member_role']
export type MemberDetails = Database['public']['Functions']['member_management_details']['Returns'][number]
export type MemberEvent = Database['public']['Tables']['workspace_member_events']['Row']
export type MemberChange = { memberId: string; expectedRole: MemberRole } & (
  { action: 'role'; role: MemberRole } | { action: 'remove'; pendingTasks: number; replacement: string | null }
)
export const MEMBER_EVENTS_PAGE_SIZE = 20

function managementError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''
  if (code === 'PT412') return new AppError('contract', 'A empresa precisa de pelo menos um administrador. Promova outra pessoa antes de continuar.')
  if (code === 'PT409') return new AppError('contract', 'O acesso ou as tarefas desta pessoa mudaram. Atualize os dados e revise a alteração antes de confirmar.')
  if (code === 'PT404') return new AppError('permission', 'Esta pessoa não faz mais parte da empresa. Atualize a equipe.')
  if (code === '22023') return new AppError('contract', 'Revise o acesso ou o responsável escolhido.')
  if (code === '40P01' || code === '40001') return new AppError('contract', 'Outra alteração está acontecendo na equipe. Atualize os dados e tente novamente.')
  return toAppError(error)
}

export async function fetchMemberDetails(workspaceId: string, memberId: string): Promise<MemberDetails> {
  const { data, error } = await getSupabase().rpc('member_management_details', { target_workspace: workspaceId, target_user: memberId }).single()
  if (error) throw managementError(error)
  const result = memberDetailsSchema.safeParse(data)
  if (!result.success || result.data.user_id !== memberId) throw new AppError('contract', 'Não foi possível confirmar os dados desta pessoa.')
  return result.data
}

export async function manageMember(workspaceId: string, change: MemberChange): Promise<MemberEvent> {
  const common = { target_workspace: workspaceId, target_user: change.memberId, expected_role: change.expectedRole }
  const response = change.action === 'role'
    ? await getSupabase().rpc('change_member_role', { ...common, new_role: change.role })
    : await getSupabase().rpc('remove_workspace_member', { ...common, expected_pending_tasks: change.pendingTasks, replacement_user: change.replacement ?? undefined })
  if (response.error) throw managementError(response.error)
  const result = memberEventSchema.safeParse(response.data)
  if (!result.success || result.data.workspace_id !== workspaceId || result.data.member_id !== change.memberId
    || result.data.previous_role !== change.expectedRole
    || (change.action === 'role' ? result.data.action !== 'role_changed' || result.data.new_role !== change.role
      : result.data.action !== 'removed' || result.data.affected_tasks !== change.pendingTasks || result.data.reassigned_to !== change.replacement)) {
    throw new AppError('contract', 'O servidor não confirmou a alteração solicitada. Atualize a equipe antes de tentar novamente.')
  }
  return result.data
}

export async function fetchMemberEvents(workspaceId: string, page: number) {
  const first = page * MEMBER_EVENTS_PAGE_SIZE
  const { data, error, count } = await getSupabase().from('workspace_member_events').select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(first, first + MEMBER_EVENTS_PAGE_SIZE - 1)
  if (error) throw toAppError(error)
  const result = memberEventSchema.array().safeParse(data)
  if (!result.success || count === null) throw new AppError('contract', 'Não foi possível confirmar o histórico de acessos.')
  return { events: result.data, total: count }
}
