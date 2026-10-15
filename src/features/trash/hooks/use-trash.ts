import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import * as service from '../services/trash-service'

export function useTrash(enabled = true) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['trash', scope.userId, scope.workspaceId],
    enabled: scope.enabled && enabled,
    queryFn: () => service.fetchTrash(scope.requireScope().workspaceId),
  })
}

type TrashChange = { kind: service.TrashKind; action: service.TrashAction; id: string }

/** Moves projects and tasks to and from the trash, refreshing every view that lists them. */
export function useTrashMutation() {
  const scope = useQueryScope()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, action, id }: TrashChange) =>
      service.changeTrash(scope.requireScope().workspaceId, kind, action, id),
    onSuccess: async () => {
      const keys = [
        'trash',
        'projects',
        'project',
        'tasks',
        'dashboard',
        'activity',
        'task-history',
        'notifications',
        'team',
        'github',
      ]
      await Promise.all(
        keys.map((key) => cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] })),
      )
    },
  })
}
