import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import { AppError } from '@/lib/errors/app-error'
import * as service from '../services/github-service'

function requireContextId(id: string | undefined) {
  if (!id) throw new AppError('contract', 'Abra uma tarefa antes de alterar o vínculo.')
  return id
}

export function useGithubRepositories() {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['github', scope.userId, scope.workspaceId, 'repositories'],
    enabled: scope.enabled,
    queryFn: () => service.fetchGithubRepositories(scope.requireScope().workspaceId),
  })
}
export function useGithubConfig() {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['github', scope.userId, scope.workspaceId, 'config'],
    enabled: scope.enabled,
    queryFn: service.fetchGithubConfig,
  })
}
export function useTaskGithub(taskId: string) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  const query = useQuery({
    queryKey: ['github', scope.userId, scope.workspaceId, 'task', taskId],
    enabled: scope.enabled,
    queryFn: () => service.fetchTaskGithub(scope.requireScope().workspaceId, taskId),
    refetchInterval: 10_000,
  })
  const syncedAt = query.isSuccess ? query.data?.last_synced_at : null
  useEffect(() => {
    if (syncedAt)
      for (const key of ['tasks', 'task-history', 'dashboard', 'projects', 'activity'])
        void cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] })
  }, [syncedAt, cache, scope.userId, scope.workspaceId])
  return query
}
export function useGithubMutations(taskId?: string) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  const onSuccess = async () => {
    await Promise.all(
      ['github', 'tasks', 'task-history', 'activity'].map((key) =>
        cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] }),
      ),
    )
  }
  return {
    connect: useMutation({
      mutationFn: () => service.beginGithubConnection(scope.requireScope().workspaceId),
    }),
    disconnect: useMutation({
      mutationFn: (repositoryId: string) => service.disconnectGithub(scope.requireScope().workspaceId, repositoryId),
      onSuccess,
    }),
    link: useMutation({
      mutationFn: (input: service.LinkInput) =>
        service.linkGithubTask(scope.requireScope().workspaceId, requireContextId(taskId), input),
      onSuccess,
    }),
    changeLink: useMutation({
      mutationFn: (action: 'unlink' | 'retry') =>
        service.changeTaskGithub(scope.requireScope().workspaceId, requireContextId(taskId), action),
      onSuccess,
    }),
  }
}
