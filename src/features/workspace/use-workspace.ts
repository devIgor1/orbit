import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import { AppError } from '@/lib/errors/app-error'
import { fetchWorkspace } from './workspace-service'

export function useWorkspace(watchAccess = false) {
  const { user, configured } = useAuth()
  const cache = useQueryClient()
  return useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) throw new AppError('authentication', 'Entre na sua conta para abrir o workspace.')
      const previous = cache.getQueryData<Awaited<ReturnType<typeof fetchWorkspace>>>(['workspace', user.id])
      const clearPrevious = async () => {
        if (!previous) return
        const filters = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[1] === user.id
          && (query.queryKey[2] === previous.workspace.id || ['companies', 'my-invitations'].includes(String(query.queryKey[0]))) }
        await cache.cancelQueries(filters)
        cache.removeQueries(filters)
      }
      try {
        const next = await fetchWorkspace(user.id)
        if (previous && (previous.workspace.id !== next.workspace.id || previous.role !== next.role)) await clearPrevious()
        return next
      } catch (error) {
        if (error instanceof AppError && ['permission', 'onboarding'].includes(error.kind)) await clearPrevious()
        throw error
      }
    },
    enabled: configured && Boolean(user),
    refetchInterval: watchAccess ? 15_000 : false,
    refetchOnWindowFocus: watchAccess ? 'always' : true,
  })
}
