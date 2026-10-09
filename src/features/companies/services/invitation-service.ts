import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireCollection, requireRecord } from '@/lib/supabase/require-data'

const incomingSchema = z.array(
  z.object({
    id: z.uuid(),
    workspace_name: z.string().min(1),
    email: z.email(),
    expires_at: z.iso.datetime({ offset: true }),
  }),
)

function invitationError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''
  if (code === 'PT409') return new AppError('contract', 'Este e-mail já pertence a um colaborador da empresa.')
  if (code === 'PT410')
    return new AppError(
      'contract',
      'Este convite expirou, foi cancelado ou já foi utilizado. Solicite um novo convite ao administrador.',
    )
  return toAppError(error)
}

export async function fetchInvitations(workspaceId: string) {
  const { data, error } = await getSupabase()
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw toAppError(error)
  return requireCollection(data).map((invitation) => ({
    ...invitation,
    expired: new Date(invitation.expires_at).getTime() <= Date.now(),
  }))
}

export async function fetchMyInvitations() {
  const { data, error } = await getSupabase().rpc('my_invitations')
  if (error) throw toAppError(error)
  const result = incomingSchema.safeParse(data)
  if (!result.success) throw new AppError('contract', 'O servidor retornou convites em um formato inesperado.')
  return result.data
}

export async function inviteCollaborator(workspaceId: string, email: string) {
  const { data, error } = await getSupabase().rpc('invite_collaborator', {
    target_workspace: workspaceId,
    invite_email: email,
  })
  if (error) throw invitationError(error)
  const invitation = requireRecord(data)
  if (invitation.workspace_id !== workspaceId || invitation.email !== email || invitation.status !== 'pending')
    throw new AppError('contract', 'O servidor não confirmou o convite solicitado.')
  return invitation
}

export async function revokeInvitation(id: string) {
  const { data, error } = await getSupabase().rpc('revoke_invitation', { invitation_id: id })
  if (error) throw invitationError(error)
  const invitation = requireRecord(data, id)
  if (invitation.status !== 'revoked')
    throw new AppError('contract', 'O servidor não confirmou o cancelamento do convite.')
  return invitation
}

export async function acceptInvitation(id: string) {
  const { data, error } = await getSupabase().rpc('accept_invitation', { invitation_id: id })
  if (error) throw invitationError(error)
  const result = z.uuid().safeParse(data)
  if (!result.success) throw new AppError('contract', 'O servidor não confirmou a entrada na empresa.')
  return result.data
}
