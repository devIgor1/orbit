import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import * as service from '../services/team-service'

export function useTeam(search = '') {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['team', scope.userId, scope.workspaceId, search],
    queryFn: () => service.fetchTeam(scope.requireScope().workspaceId, search),
    enabled: scope.enabled,
  })
}

export function useUpdateProfile() {
  const scope = useQueryScope()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (input: service.ProfileInput) => service.updateProfile(scope.requireScope().userId, input),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['workspace', scope.userId] }),
        cache.invalidateQueries({ queryKey: ['team', scope.userId, scope.workspaceId] }),
      ])
    },
  })
}
