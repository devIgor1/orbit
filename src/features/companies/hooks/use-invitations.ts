import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import { fetchInvitations, inviteCollaborator, revokeInvitation } from '../services/invitation-service'
import { inviteCollaboratorWithEmail, sendInvitationEmail } from '../services/invitation-email-service'

export function useInvitations() {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['invitations', scope.userId, scope.workspaceId],
    queryFn: () => fetchInvitations(scope.requireScope().workspaceId),
    enabled: scope.enabled,
  })
}

export function useManageInvitations() {
  const scope = useQueryScope()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: async (input: { action: 'invite'; email: string; sendEmail: boolean } | { action: 'send' | 'revoke'; id: string }): Promise<{ id: string }> => {
      const { workspaceId } = scope.requireScope()
      if (input.action === 'invite') return input.sendEmail
          ? inviteCollaboratorWithEmail(workspaceId, input.email)
          : inviteCollaborator(workspaceId, input.email)
      return input.action === 'send' ? sendInvitationEmail(input.id) : revokeInvitation(input.id)
    },
    onSettled: async () => {
      // Creation can succeed while delivery fails; always read the persisted state.
      await cache.invalidateQueries({ queryKey: ['invitations', scope.userId, scope.workspaceId] })
    },
  })
}
