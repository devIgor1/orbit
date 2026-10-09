import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import * as service from '../services/tasks-service'

export function useTasks(projectId: string) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['tasks', scope.userId, scope.workspaceId, projectId],
    queryFn: () => service.fetchTasks(scope.requireScope().workspaceId, projectId),
    enabled: scope.enabled && Boolean(projectId),
  })
}

export function useTaskMutations(projectId: string) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  const onSuccess = async () => {
    await Promise.all(['tasks', 'projects', 'project', 'dashboard', 'activity', 'task-history', 'team'].map((key) =>
      cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] })))
  }
  const createTask = useMutation({
    mutationFn: (input: service.TaskInput) => {
      const { workspaceId, userId } = scope.requireScope()
      return service.createTask(workspaceId, projectId, userId, input)
    }, onSuccess,
  })
  const updateTask = useMutation({
    mutationFn: (input: Partial<service.TaskInput> & { id: string }) => service.updateTask(scope.requireScope().workspaceId, projectId, input), onSuccess,
  })
  return { createTask, updateTask }
}

export function useTaskComments(taskId: string) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['task-comments', scope.userId, scope.workspaceId, taskId],
    queryFn: () => service.fetchComments(scope.requireScope().workspaceId, taskId),
    enabled: scope.enabled && Boolean(taskId),
  })
}

export function useTaskHistory(taskId: string) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['task-history', scope.userId, scope.workspaceId, taskId],
    queryFn: () => service.fetchHistory(scope.requireScope().workspaceId, taskId),
    enabled: scope.enabled && Boolean(taskId),
  })
}

export function useAddComment(taskId: string) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => {
      const { workspaceId, userId } = scope.requireScope()
      return service.addComment(workspaceId, taskId, userId, body)
    },
    onSuccess: async () => {
      await Promise.all(['task-comments', 'task-history', 'activity'].map((key) =>
        cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] })))
    },
  })
}
