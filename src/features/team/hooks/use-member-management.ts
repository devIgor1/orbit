import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import * as service from '../services/member-management-service'

export function useMemberDetails(memberId: string) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['member-details', scope.userId, scope.workspaceId, memberId],
    queryFn: () => service.fetchMemberDetails(scope.requireScope().workspaceId, memberId),
    enabled: scope.enabled, staleTime: 0, refetchOnWindowFocus: false,
  })
}

export function useMemberEvents(page: number) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['member-events', scope.userId, scope.workspaceId, page],
    queryFn: () => service.fetchMemberEvents(scope.requireScope().workspaceId, page),
    enabled: scope.enabled,
  })
}

export function useManageMember() {
  const scope = useQueryScope()
  const cache = useQueryClient()
  return useMutation({
    mutationKey: ['manage-member', scope.userId, scope.workspaceId],
    mutationFn: (change: service.MemberChange) => service.manageMember(scope.requireScope().workspaceId, change),
    onSuccess: async (_event, change) => {
      if (change.memberId === scope.userId) {
        await cache.cancelQueries()
        cache.removeQueries({ predicate: query => query.queryKey[0] !== 'workspace' })
        await cache.invalidateQueries({ queryKey: ['workspace', scope.userId] })
      } else {
        await Promise.all(['team', 'member-details', 'member-events', 'tasks', 'task-history', 'dashboard', 'activity', 'invitations'].map(key =>
          cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] })))
      }
    },
  })
}
