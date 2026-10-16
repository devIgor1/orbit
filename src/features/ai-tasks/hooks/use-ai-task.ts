import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import { createAiTask } from '../services/ai-task-service'

export function useAiTask(projectId: string) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  const attempt = useRef<{ fingerprint: string; id: string } | null>(null)
  const mutation = useMutation({
    retry: false,
    mutationFn: async (prompt: string) => {
      const { userId, workspaceId } = scope.requireScope()
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const fingerprint = JSON.stringify([userId, workspaceId, projectId, prompt.trim(), timeZone])
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() }
      const result = await createAiTask({ requestId: attempt.current.id, workspaceId, projectId, prompt, timeZone }, userId)
      return { result, userId, workspaceId }
    },
    onSuccess: async ({ result, userId, workspaceId }) => {
      if (result.kind !== 'created') return
      await Promise.all(['tasks', 'projects', 'project', 'dashboard', 'activity', 'task-history', 'team', 'notifications'].map(key =>
        cache.invalidateQueries({ queryKey: [key, userId, workspaceId] })))
    },
  })
  return { ...mutation, newRequest() { attempt.current = null; mutation.reset() } }
}
