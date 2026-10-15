import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import * as service from '../services/project-repository-service'

export function useProjectRepository(projectId: string) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['github', scope.userId, scope.workspaceId, 'project', projectId],
    enabled: scope.enabled && Boolean(projectId),
    queryFn: () => service.fetchProjectRepository(scope.requireScope().workspaceId, projectId),
  })
}
export function useProjectRepositoryMutation(projectId: string) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (repositoryId: string | null) => {
      const { workspaceId } = scope.requireScope()
      return repositoryId
        ? service.setProjectRepository(workspaceId, projectId, repositoryId)
        : service.clearProjectRepository(workspaceId, projectId)
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['github', scope.userId, scope.workspaceId] }),
  })
}
