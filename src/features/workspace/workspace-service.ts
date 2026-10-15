import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireRecord } from '@/lib/supabase/require-data'

export async function fetchWorkspace(userId: string) {
  const client = getSupabase()
  const profileResult = await client.from('profiles').select('*').eq('id', userId).single()
  if (profileResult.error) throw toAppError(profileResult.error)
  const profile = requireRecord(profileResult.data, userId)
  const memberships = (activeId?: string | null) => {
    let query = client.from('workspace_members').select('workspace_id,role').eq('user_id', userId).is('removed_at', null)
    if (activeId) query = query.eq('workspace_id', activeId)
    return query.order('created_at').order('workspace_id').limit(1).maybeSingle()
  }
  let { data: membership, error: memberError } = await memberships(profile.active_workspace_id)
  // The active company may have been deleted: fall back to any other company.
  if (!memberError && !membership && profile.active_workspace_id) ({ data: membership, error: memberError } = await memberships())
  if (memberError) throw toAppError(memberError)
  if (!membership) throw new AppError('onboarding', 'Cadastre sua empresa ou aceite um convite para continuar.')
  const workspaceResult = await client.from('workspaces').select('*').eq('id', membership.workspace_id).single()
  if (workspaceResult.error) throw toAppError(workspaceResult.error)
  return {
    workspace: requireRecord(workspaceResult.data, membership.workspace_id),
    role: membership.role,
    profile,
  }
}
