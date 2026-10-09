import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import { AppError } from '@/lib/errors/app-error'
import { fetchWorkspace } from './workspace-service'

export function useWorkspace() {
  const { user, configured } = useAuth()
  return useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: () => {
      if (!user) throw new AppError('authentication', 'Entre na sua conta para abrir o workspace.')
      return fetchWorkspace(user.id)
    },
    enabled: configured && Boolean(user),
  })
}
