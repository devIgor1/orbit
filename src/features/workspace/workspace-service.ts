import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireRecord } from '@/lib/supabase/require-data'

export async function fetchWorkspace(userId: string) {
  const client = getSupabase()
  const { data: membership, error: memberError } = await client.from('workspace_members')
    .select('workspace_id,role').eq('user_id', userId).order('created_at').order('workspace_id').limit(1).maybeSingle()
  if (memberError) throw toAppError(memberError)
  if (!membership) throw new AppError('permission', 'Sua conta ainda não está vinculada a um workspace. Solicite acesso ao administrador.')
  const [workspaceResult, profileResult] = await Promise.all([
    client.from('workspaces').select('*').eq('id', membership.workspace_id).single(),
    client.from('profiles').select('*').eq('id', userId).single(),
  ])
  if (workspaceResult.error) throw toAppError(workspaceResult.error)
  if (profileResult.error) throw toAppError(profileResult.error)
  return {
    workspace: requireRecord(workspaceResult.data, membership.workspace_id),
    role: membership.role,
    profile: requireRecord(profileResult.data, userId),
  }
}
